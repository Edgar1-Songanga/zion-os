import { resaRequest } from "@/lib/resa/api";

export type ProductKey = "zion_os" | "resa";
export type ProductModuleKey =
  | "dashboard" | "bible_engine" | "bible_quiz" | "sabbath_school" | "devotion" | "meetings"
  | "feed" | "reels" | "live" | "communities" | "messages" | "events" | "prayer";

export type ProductEventName =
  | "page_view"
  | "bible_search_submitted"
  | "bible_quiz_started"
  | "bible_quiz_level_completed"
  | "devotion_saved"
  | "reel_reaction"
  | "live_created";

type EventProperties = Record<string, string | number | boolean>;

const SESSION_KEY = "zion:product-analytics-session:v1";

function createSessionId() {
  const cryptoApi = window.crypto;
  if (typeof cryptoApi?.randomUUID === "function") return cryptoApi.randomUUID();
  if (typeof cryptoApi?.getRandomValues === "function") {
    const bytes = cryptoApi.getRandomValues(new Uint8Array(16));
    bytes[6] = (bytes[6] & 0x0f) | 0x40;
    bytes[8] = (bytes[8] & 0x3f) | 0x80;
    const hex = Array.from(bytes, (value) => value.toString(16).padStart(2, "0")).join("");
    return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
  }
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (character) => {
    const random = Math.floor(Math.random() * 16);
    return (character === "x" ? random : (random & 0x3) | 0x8).toString(16);
  });
}

function getSessionId() {
  try {
    let id = window.sessionStorage.getItem(SESSION_KEY);
    if (!id) {
      id = createSessionId();
      window.sessionStorage.setItem(SESSION_KEY, id);
    }
    return id;
  } catch {
    return createSessionId();
  }
}

/**
 * Product telemetry is deliberately low-cardinality: no free text, content IDs,
 * email, phone, prayer text, Bible search query or other personal content.
 * Events are best-effort and never block the user journey.
 */
export function trackProductEvent(
  productKey: ProductKey,
  moduleKey: ProductModuleKey,
  eventName: ProductEventName,
  properties: EventProperties,
) {
  if (typeof window === "undefined") return;
  const payload = {
    event_name: eventName,
    product_key: productKey,
    module_key: moduleKey,
    event_version: 1,
    session_id: getSessionId(),
    properties,
  };
  void resaRequest("/v1/platform/analytics", {
    method: "POST",
    body: JSON.stringify(payload),
  }).catch(() => undefined);
}
