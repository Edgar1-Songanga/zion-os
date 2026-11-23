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

function getSessionId() {
  try {
    let id = window.sessionStorage.getItem(SESSION_KEY);
    if (!id) {
      id = window.crypto.randomUUID();
      window.sessionStorage.setItem(SESSION_KEY, id);
    }
    return id;
  } catch {
    return window.crypto.randomUUID();
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
