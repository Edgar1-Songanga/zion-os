import { resaRequest } from "@/lib/resa/api";

type MediaUrlItem = {
  content_id: string;
  url: string;
  expires_in: number | null;
  private: boolean;
};

type MediaUrlResponse = { items: MediaUrlItem[] };

const cache = new Map<string, { url: string; expiresAt: number }>();
const pending = new Map<string, Array<(url: string | null) => void>>();
let flushScheduled = false;

function remember(item: MediaUrlItem) {
  cache.set(item.content_id, {
    url: item.url,
    expiresAt: Date.now() + (item.expires_in ? Math.max(30, item.expires_in - 30) : 60 * 60) * 1000,
  });
}

export async function resolveResaMediaUrls(contentIds: string[]): Promise<Record<string, string>> {
  const ids = [...new Set(contentIds)].filter(Boolean);
  const result: Record<string, string> = {};
  const missing: string[] = [];

  for (const id of ids) {
    const cached = cache.get(id);
    if (cached && cached.expiresAt > Date.now()) result[id] = cached.url;
    else {
      cache.delete(id);
      missing.push(id);
    }
  }

  for (let offset = 0; offset < missing.length; offset += 50) {
    const batch = missing.slice(offset, offset + 50);
    try {
      const response = await resaRequest<MediaUrlResponse>("/v1/resa/content/media-urls", {
        method: "POST",
        body: JSON.stringify({ content_ids: batch }),
      });
      for (const item of response.items ?? []) {
        remember(item);
        result[item.content_id] = item.url;
      }
    } catch {
      // Keep the caller's existing media fallback; authorization failures must not expose media.
    }
  }

  return result;
}

function flushPending() {
  flushScheduled = false;
  const ids = [...pending.keys()].slice(0, 50);
  if (!ids.length) return;

  void resolveResaMediaUrls(ids).then((resolved) => {
    for (const id of ids) {
      const callbacks = pending.get(id) ?? [];
      pending.delete(id);
      for (const callback of callbacks) callback(resolved[id] ?? null);
    }
  }).catch(() => {
    for (const id of ids) {
      const callbacks = pending.get(id) ?? [];
      pending.delete(id);
      for (const callback of callbacks) callback(null);
    }
  }).finally(() => {
    if (pending.size && !flushScheduled) {
      flushScheduled = true;
      queueMicrotask(flushPending);
    }
  });
}

export function resolveResaMediaUrl(contentId: string): Promise<string | null> {
  const cached = cache.get(contentId);
  if (cached && cached.expiresAt > Date.now()) return Promise.resolve(cached.url);
  cache.delete(contentId);

  return new Promise((resolve) => {
    const callbacks = pending.get(contentId) ?? [];
    callbacks.push(resolve);
    pending.set(contentId, callbacks);
    if (!flushScheduled) {
      flushScheduled = true;
      queueMicrotask(flushPending);
    }
  });
}
