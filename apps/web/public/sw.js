/* RESA Web Push service worker. Keep this file dependency-free. */
self.addEventListener("push", (event) => {
  let payload = {};
  try {
    payload = event.data ? event.data.json() : {};
  } catch {
    payload = { body: event.data ? event.data.text() : "" };
  }

  const title = typeof payload.title === "string" && payload.title.trim()
    ? payload.title
    : "Notificação RESA";
  const body = typeof payload.body === "string" ? payload.body : "Tens uma nova notificação.";
  const rawUrl = typeof payload.url === "string" ? payload.url : "/resa";
  const category = typeof payload.category === "string" ? payload.category : "general";
  const urgent = category === "call" || category === "bank";
  const vibration = category === "call"
    ? [400, 120, 400, 120, 700, 180, 700]
    : category === "bank"
      ? [350, 100, 350, 100, 600]
      : category === "message"
        ? [220, 100, 220]
        : [180, 80, 180];
  let safeUrl = "/resa";
  try {
    const parsed = new URL(rawUrl, self.location.origin);
    if (parsed.origin === self.location.origin) safeUrl = parsed.pathname + parsed.search + parsed.hash;
  } catch {
    safeUrl = "/resa";
  }

  const tag = typeof payload.tag === "string" ? payload.tag : "resa-notification";
  event.waitUntil((async () => {
    await self.registration.showNotification(title, {
      body,
      tag,
      icon: "/favicon.ico",
      badge: "/favicon.ico",
      data: { url: safeUrl },
      renotify: category !== "call",
      // Calls are time-sensitive alerts, not permanent inbox items.
      requireInteraction: category === "bank",
      silent: false,
      vibrate,
    });
    if (category === "call") {
      await new Promise((resolve) => setTimeout(resolve, 45_000));
      const activeNotifications = await self.registration.getNotifications({ tag });
      for (const notification of activeNotifications) notification.close();
    }
  })());
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const rawUrl = typeof event.notification.data?.url === "string"
    ? event.notification.data.url
    : "/resa";
  let target = new URL("/resa", self.location.origin);
  try {
    const parsed = new URL(rawUrl, self.location.origin);
    if (parsed.origin === self.location.origin) target = parsed;
  } catch {
    target = new URL("/resa", self.location.origin);
  }

  event.waitUntil((async () => {
    const windows = await self.clients.matchAll({ type: "window", includeUncontrolled: true });
    for (const client of windows) {
      if ("focus" in client) {
        await client.focus();
        if ("navigate" in client) await client.navigate(target.href);
        return;
      }
    }
    await self.clients.openWindow(target.href);
  })());
});
