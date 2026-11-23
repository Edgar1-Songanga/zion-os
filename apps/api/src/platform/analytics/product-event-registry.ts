export type ProductKey = "zion_os" | "resa";
export type ProductModuleKey =
  | "dashboard" | "bible_engine" | "bible_quiz" | "sabbath_school" | "devotion" | "meetings"
  | "feed" | "reels" | "live" | "communities" | "messages" | "events" | "prayer";

type PropertyRule = {
  type: "boolean" | "integer" | "enum";
  values?: readonly (string | number)[];
  min?: number;
  max?: number;
};

type ProductEventDefinition = {
  products: readonly ProductKey[];
  modules: readonly ProductModuleKey[];
  properties: Readonly<Record<string, PropertyRule>>;
};

const PAGE_MODULES: Readonly<Record<string, { product: ProductKey; module: ProductModuleKey }>> = {
  dashboard: { product: "zion_os", module: "dashboard" },
  bible_engine: { product: "zion_os", module: "bible_engine" },
  devotion: { product: "zion_os", module: "devotion" },
  sabbath_school: { product: "zion_os", module: "sabbath_school" },
  resa_home: { product: "resa", module: "feed" },
  resa_reels: { product: "resa", module: "reels" },
  resa_live: { product: "resa", module: "live" },
  resa_communities: { product: "resa", module: "communities" },
  resa_messages: { product: "resa", module: "messages" },
  resa_meetings: { product: "resa", module: "meetings" },
  resa_events: { product: "resa", module: "events" },
  resa_prayer: { product: "resa", module: "prayer" },
  meeting_room: { product: "zion_os", module: "meetings" },
} as const;
const PAGE_KEYS = Object.keys(PAGE_MODULES);

export const PRODUCT_EVENT_REGISTRY = {
  page_view: {
    products: ["zion_os", "resa"],
    modules: ["dashboard", "bible_engine", "bible_quiz", "sabbath_school", "devotion", "meetings", "feed", "reels", "live", "communities", "messages", "events", "prayer"],
    properties: { page_key: { type: "enum", values: PAGE_KEYS } },
  },
  bible_search_submitted: {
    products: ["zion_os"], modules: ["bible_engine"],
    properties: {
      success: { type: "boolean" },
      translation: { type: "enum", values: ["almeida-livre", "kjv", "web"] },
      result_count: { type: "integer", min: 0, max: 100 },
    },
  },
  bible_quiz_started: {
    products: ["zion_os"], modules: ["bible_quiz"],
    properties: {
      mode: { type: "enum", values: ["junior", "classic", "hyper"] },
      level: { type: "integer", min: 1, max: 6 },
    },
  },
  bible_quiz_level_completed: {
    products: ["zion_os"], modules: ["bible_quiz"],
    properties: {
      mode: { type: "enum", values: ["junior", "classic", "hyper"] },
      level: { type: "integer", min: 1, max: 6 },
    },
  },
  devotion_saved: {
    products: ["zion_os"], modules: ["devotion"],
    properties: {},
  },
  reel_reaction: {
    products: ["resa"], modules: ["reels"],
    properties: { action: { type: "enum", values: ["like", "unlike"] } },
  },
  live_created: {
    products: ["resa"], modules: ["live"],
    properties: { visibility: { type: "enum", values: ["public", "organization", "private"] } },
  },
} as const satisfies Record<string, ProductEventDefinition>;

export type ProductEventName = keyof typeof PRODUCT_EVENT_REGISTRY;
export type ProductEventProperties = Record<string, string | number | boolean>;

const PRODUCT_MODULES: Record<ProductKey, readonly ProductModuleKey[]> = {
  zion_os: ["dashboard", "bible_engine", "bible_quiz", "sabbath_school", "devotion", "meetings"],
  resa: ["feed", "reels", "live", "communities", "messages", "meetings", "events", "prayer"],
};

export function validateProductAnalyticsEvent(input: {
  productKey: unknown;
  moduleKey: unknown;
  eventName: unknown;
  sessionId: unknown;
  eventVersion: unknown;
  properties: unknown;
}) {
  const { productKey, moduleKey, eventName, sessionId, eventVersion } = input;
  if (productKey !== "zion_os" && productKey !== "resa") throw new Error("Unsupported analytics product.");
  if (typeof moduleKey !== "string" || !PRODUCT_MODULES[productKey].includes(moduleKey as ProductModuleKey)) {
    throw new Error("Unsupported analytics module for this product.");
  }
  if (typeof eventName !== "string" || !Object.prototype.hasOwnProperty.call(PRODUCT_EVENT_REGISTRY, eventName)) {
    throw new Error("Unsupported product analytics event.");
  }
  if (typeof sessionId !== "string" || !/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(sessionId)) {
    throw new Error("A valid analytics session identifier is required.");
  }
  if (eventVersion !== 1) throw new Error("Unsupported analytics event version.");

  const definition = PRODUCT_EVENT_REGISTRY[eventName as ProductEventName] as ProductEventDefinition;
  if (!definition.products.includes(productKey) || !definition.modules.includes(moduleKey as ProductModuleKey)) {
    throw new Error("This event is not valid for the selected product module.");
  }
  if (eventName === "page_view") {
    const pageKey = (input.properties as Record<string, unknown> | null)?.page_key;
    const pageContract = typeof pageKey === "string" ? PAGE_MODULES[pageKey] : undefined;
    const isSharedMeetingRoom = pageKey === "meeting_room" && productKey === "resa" && moduleKey === "meetings";
    if (!pageContract || (!isSharedMeetingRoom && (pageContract.product !== productKey || pageContract.module !== moduleKey))) {
      throw new Error("Page view key does not match the selected product module.");
    }
  }
  const source = input.properties && typeof input.properties === "object" && !Array.isArray(input.properties)
    ? input.properties as Record<string, unknown>
    : {};
  const allowed = definition.properties as Readonly<Record<string, PropertyRule>>;
  const sanitized: ProductEventProperties = {};
  for (const [key, value] of Object.entries(source)) {
    const rule = allowed[key];
    if (!rule) throw new Error(`Unsupported analytics property: ${key}`);
    if (rule.type === "boolean") {
      if (typeof value !== "boolean") throw new Error(`Invalid analytics property: ${key}`);
      sanitized[key] = value;
    } else if (rule.type === "integer") {
      if (typeof value !== "number" || !Number.isInteger(value) || value < (rule.min ?? 0) || value > (rule.max ?? 1000)) {
        throw new Error(`Invalid analytics property: ${key}`);
      }
      sanitized[key] = value;
    } else {
      if (typeof value !== "string" || !rule.values?.some((allowed) => allowed === value)) throw new Error(`Invalid analytics property: ${key}`);
      sanitized[key] = value;
    }
  }
  for (const key of Object.keys(allowed)) {
    if (!(key in sanitized)) throw new Error(`Missing analytics property: ${key}`);
  }
  return {
    eventName,
    properties: {
      ...sanitized,
      product_key: productKey,
      module_key: moduleKey,
      event_version: 1,
      session_id: sessionId,
    },
  };
}

export function validateProductEventRegistry() {
  for (const [name, definition] of Object.entries(PRODUCT_EVENT_REGISTRY)) {
    if (!name || !definition.products.length || !definition.modules.length) {
      throw new Error("Every product analytics event must declare a product and module.");
    }
    for (const product of definition.products) {
      if (!PRODUCT_MODULES[product]) throw new Error(`Unknown product for event: ${name}`);
    }
  }
  return true;
}
