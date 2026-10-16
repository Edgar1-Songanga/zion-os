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
  let safeUrl = "/resa";
  try {
    const parsed = new URL(rawUrl, self.location.origin);
    if (parsed.origin === self.location.origin) safeUrl = parsed.pathname + parsed.search + parsed.hash;
  } catch {
    safeUrl = "/resa";
  }

  event.waitUntil(self.registration.showNotification(title, {
    body,
    tag: typeof payload.tag === "string" ? payload.tag : "resa-notification",
    icon: "/favicon.ico",
    badge: "/favicon.ico",
    data: { url: safeUrl },
    renotify: false,
    requireInteraction: false,
  }));
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
