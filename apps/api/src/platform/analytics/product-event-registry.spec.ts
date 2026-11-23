import { PRODUCT_EVENT_REGISTRY, validateProductAnalyticsEvent, validateProductEventRegistry } from "./product-event-registry";

describe("product analytics event registry", () => {
  it("declares product and module boundaries for every event", () => {
    expect(validateProductEventRegistry()).toBe(true);
    expect(Object.keys(PRODUCT_EVENT_REGISTRY)).toContain("page_view");
  });

  it("accepts a versioned, allowlisted Bible Engine search event", () => {
    const result = validateProductAnalyticsEvent({
      productKey: "zion_os",
      moduleKey: "bible_engine",
      eventName: "bible_search_submitted",
      sessionId: "a9b3d77d-0a4c-4b43-8b6f-cc4cbf0d7f21",
      eventVersion: 1,
      properties: { success: true, translation: "almeida-livre", result_count: 1 },
    });
    expect(result.properties).toMatchObject({ product_key: "zion_os", module_key: "bible_engine", event_version: 1 });
    expect(result.properties).not.toHaveProperty("query");
  });

  it("rejects cross-product module spoofing and unsupported properties", () => {
    const base = {
      sessionId: "a9b3d77d-0a4c-4b43-8b6f-cc4cbf0d7f21",
      eventVersion: 1,
      properties: { page_key: "resa_home" },
    };
    expect(() => validateProductAnalyticsEvent({ ...base, productKey: "zion_os", moduleKey: "feed", eventName: "page_view" })).toThrow(/module/);
    expect(() => validateProductAnalyticsEvent({
      ...base, productKey: "zion_os", moduleKey: "dashboard", eventName: "page_view",
    })).toThrow(/Page view key does not match/);
    expect(() => validateProductAnalyticsEvent({
      ...base, productKey: "resa", moduleKey: "reels", eventName: "page_view",
    })).toThrow(/Page view key does not match/);
    expect(() => validateProductAnalyticsEvent({
      productKey: "zion_os", moduleKey: "bible_engine", eventName: "bible_search_submitted",
      sessionId: base.sessionId, eventVersion: 1,
      properties: { success: true, translation: "almeida-livre", result_count: 1, search_query: "João 3:16" },
    })).toThrow(/Unsupported analytics property/);
  });

  it("rejects unknown event names, malformed sessions and invalid property types", () => {
    expect(() => validateProductAnalyticsEvent({
      productKey: "resa", moduleKey: "reels", eventName: "invented_event",
      sessionId: "a9b3d77d-0a4c-4b43-8b6f-cc4cbf0d7f21", eventVersion: 1, properties: {},
    })).toThrow(/Unsupported product analytics event/);
    expect(() => validateProductAnalyticsEvent({
      productKey: "resa", moduleKey: "reels", eventName: "reel_reaction",
      sessionId: "not-a-uuid", eventVersion: 1, properties: { action: "like" },
    })).toThrow(/session identifier/);
    expect(() => validateProductAnalyticsEvent({
      productKey: "resa", moduleKey: "reels", eventName: "reel_reaction",
      sessionId: "a9b3d77d-0a4c-4b43-8b6f-cc4cbf0d7f21", eventVersion: 1, properties: { action: "share" },
    })).toThrow(/Invalid analytics property/);
  });
});
