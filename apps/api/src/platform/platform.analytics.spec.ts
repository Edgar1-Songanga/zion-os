import { BadRequestException } from "@nestjs/common";
import { PlatformService } from "./platform.service";
import { SupabaseRestClient } from "../common/supabase/supabase-rest.client";
import type { IdentityService } from "../identity/application/identity.service";
import type { AutomationPolicyEngine } from "@zion/automation-engine";

describe("PlatformService institutional intelligence", () => {
  const organizationId = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
  const identity = {
    getCurrentUser: jest.fn().mockResolvedValue({ id: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb" }),
  } as unknown as IdentityService;
  const automation = {} as AutomationPolicyEngine;
  let service: PlatformService;
  let rpc: jest.SpyInstance;
  let post: jest.SpyInstance;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new PlatformService(identity, automation);
    rpc = jest.spyOn(SupabaseRestClient.prototype, "rpc").mockResolvedValue({
      status: "LIVE_AGGREGATE",
    } as never);
    post = jest.spyOn(SupabaseRestClient.prototype, "post").mockResolvedValue([{ id: "event-id" }] as never);
  });

  afterEach(() => { rpc.mockRestore(); post.mockRestore(); });

  it("delegates authorized subtree aggregation to the database RPC", async () => {
    const result = await service.institutionalIntelligence("access-token", organizationId);
    expect(result).toEqual({ status: "LIVE_AGGREGATE" });
    expect(rpc).toHaveBeenCalledWith("zion_institutional_intelligence", "access-token", {
      p_organization_id: organizationId,
    });
  });

  it("rejects malformed organization identifiers before calling the database", async () => {
    await expect(service.institutionalIntelligence("access-token", "not-a-uuid"))
      .rejects.toBeInstanceOf(BadRequestException);
    expect(rpc).not.toHaveBeenCalled();
  });
});


describe("PlatformService product analytics ingestion", () => {
  const actorId = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";
  const sessionId = "a9b3d77d-0a4c-4b43-8b6f-cc4cbf0d7f21";
  const identity = {
    getCurrentUser: jest.fn().mockResolvedValue({ id: actorId }),
  } as unknown as IdentityService;
  const automation = {} as AutomationPolicyEngine;
  let service: PlatformService;
  let post: jest.SpyInstance;
  let get: jest.SpyInstance;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new PlatformService(identity, automation);
    post = jest.spyOn(SupabaseRestClient.prototype, "post").mockResolvedValue([{ id: "event-id" }] as never);
    get = jest.spyOn(SupabaseRestClient.prototype, "get").mockResolvedValue([{ privacy: { product_analytics: true } }] as never);
  });

  afterEach(() => { post.mockRestore(); get.mockRestore(); });

  it("stores a versioned product event with the verified actor and sanitized properties", async () => {
    await service.recordAnalytics("access-token", {
      event_name: "bible_search_submitted",
      product_key: "zion_os",
      module_key: "bible_engine",
      event_version: 1,
      session_id: sessionId,
      properties: { success: true, translation: "almeida-livre", result_count: 1 },
    });
    expect(get).toHaveBeenCalledWith("profiles", "access-token", "?select=privacy&id=eq." + actorId + "&limit=1");
    expect(post).toHaveBeenCalledWith("zion_analytics_events", "access-token", expect.objectContaining({
      event_name: "bible_search_submitted",
      actor_user_id: actorId,
      properties: expect.objectContaining({
        product_key: "zion_os",
        module_key: "bible_engine",
        event_version: 1,
        session_id: sessionId,
        success: true,
      }),
    }));
  });

  it("rejects event collection when the account has not opted in", async () => {
    get.mockResolvedValue([{ privacy: { product_analytics: false } }] as never);
    await expect(service.recordAnalytics("access-token", {
      event_name: "page_view",
      product_key: "zion_os",
      module_key: "dashboard",
      event_version: 1,
      session_id: sessionId,
      properties: { page_key: "dashboard" },
    })).rejects.toThrow("requires the account preference");
    expect(post).not.toHaveBeenCalled();
  });

  it("rejects client-supplied personal content and cross-product module spoofing", async () => {
    await expect(service.recordAnalytics("access-token", {
      event_name: "bible_search_submitted",
      product_key: "zion_os",
      module_key: "bible_engine",
      event_version: 1,
      session_id: sessionId,
      properties: { success: true, translation: "almeida-livre", result_count: 1, search_query: "João 3:16" },
    })).rejects.toBeInstanceOf(BadRequestException);

    await expect(service.recordAnalytics("access-token", {
      event_name: "page_view",
      product_key: "zion_os",
      module_key: "feed",
      event_version: 1,
      session_id: sessionId,
      properties: { page_key: "resa_home" },
    })).rejects.toBeInstanceOf(BadRequestException);

    await expect(service.recordAnalytics("access-token", {
      event_name: "page_view",
      product_key: "zion_os",
      module_key: "dashboard",
      event_version: 1,
      session_id: sessionId,
      occurred_at: "2020-01-01T00:00:00.000Z",
      properties: { page_key: "dashboard" },
    })).rejects.toBeInstanceOf(BadRequestException);
    expect(post).not.toHaveBeenCalled();
  });
});


describe("PlatformService product metric catalogue", () => {
  it("requires a verified global administrator before exposing product metric definitions", async () => {
    const identity = {
      requireGlobalAdmin: jest.fn().mockResolvedValue({ id: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb" }),
    } as unknown as IdentityService;
    const service = new PlatformService(identity, {} as AutomationPolicyEngine);
    const result = await service.productAnalyticsMetricCatalog("admin-token");
    expect(identity.requireGlobalAdmin).toHaveBeenCalledWith("admin-token");
    expect(result).toMatchObject({
      scope: "product_analytics",
      status: "EVENT_INSTRUMENTATION_IN_PROGRESS",
    });
    expect(result.metrics.length).toBeGreaterThan(0);
  });

  it("does not return a product catalogue when global-admin verification fails", async () => {
    const identity = {
      requireGlobalAdmin: jest.fn().mockRejectedValue(new Error("forbidden")),
    } as unknown as IdentityService;
    const service = new PlatformService(identity, {} as AutomationPolicyEngine);
    await expect(service.productAnalyticsMetricCatalog("member-token")).rejects.toThrow("forbidden");
  });
});


describe("PlatformService personal analytics summary", () => {
  const actorId = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";
  const identity = {
    getCurrentUser: jest.fn().mockResolvedValue({ id: actorId }),
  } as unknown as IdentityService;
  let service: PlatformService;
  let get: jest.SpyInstance;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new PlatformService(identity, {} as AutomationPolicyEngine);
    get = jest.spyOn(SupabaseRestClient.prototype, "get").mockResolvedValue([
      { event_name: "page_view", occurred_at: "2026-11-23T10:00:00.000Z" },
      { event_name: "bible_search_submitted", occurred_at: "2026-11-23T10:01:00.000Z" },
    ] as never);
  });

  afterEach(() => get.mockRestore());

  it("limits personal activity queries to the authenticated actor", async () => {
    const result = await service.analyticsSummary("member-token", undefined, 25);
    expect(get).toHaveBeenCalledWith(
      "zion_analytics_events",
      "member-token",
      `?select=event_name,occurred_at&actor_user_id=eq.${actorId}&order=occurred_at.desc&limit=25`,
    );
    expect(result).toEqual({
      total: 2,
      by_event: { page_view: 1, bible_search_submitted: 1 },
      events: [
        { event_name: "page_view", occurred_at: "2026-11-23T10:00:00.000Z" },
        { event_name: "bible_search_submitted", occurred_at: "2026-11-23T10:01:00.000Z" },
      ],
    });
  });

  it("keeps the event-name filter inside the actor-scoped query", async () => {
    await service.analyticsSummary("member-token", "page_view", 10);
    expect(get).toHaveBeenCalledWith(
      "zion_analytics_events",
      "member-token",
      `?select=event_name,occurred_at&actor_user_id=eq.${actorId}&order=occurred_at.desc&limit=10&event_name=eq.page_view`,
    );
  });

  it("normalizes fractional limits to whole rows and caps oversized requests", async () => {
    await service.analyticsSummary("member-token", undefined, 12.8);
    expect(get).toHaveBeenCalledWith(
      "zion_analytics_events",
      "member-token",
      `?select=event_name,occurred_at&actor_user_id=eq.${actorId}&order=occurred_at.desc&limit=12`,
    );
    get.mockClear();
    await service.analyticsSummary("member-token", undefined, 9000);
    expect(get).toHaveBeenCalledWith(
      "zion_analytics_events",
      "member-token",
      `?select=event_name,occurred_at&actor_user_id=eq.${actorId}&order=occurred_at.desc&limit=500`,
    );
  });
});


describe("PlatformService executive product analytics aggregate contract", () => {
  const identity = {
    requireGlobalAdmin: jest.fn().mockResolvedValue({ id: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb" }),
  } as unknown as IdentityService;
  let service: PlatformService;
  let rpc: jest.SpyInstance;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new PlatformService(identity, {} as AutomationPolicyEngine);
    rpc = jest.spyOn(SupabaseRestClient.prototype, "rpc").mockResolvedValue({
      products: [], modules: [], daily_active_users: [],
    } as never);
  });

  afterEach(() => rpc.mockRestore());

  it("requires global-admin verification and delegates only a bounded date window to the aggregate RPC", async () => {
    const result = await service.productAnalyticsSummary("admin-token", "2026-11-01", "2026-11-30");
    expect(identity.requireGlobalAdmin).toHaveBeenCalledWith("admin-token");
    expect(rpc).toHaveBeenCalledWith("zion_product_analytics_summary", "admin-token", {
      p_from_date: "2026-11-01",
      p_to_date: "2026-11-30",
    });
    expect(result).toEqual({ products: [], modules: [], daily_active_users: [] });
  });

  it("rejects invalid calendar dates and reversed ranges before database access", async () => {
    await expect(service.productAnalyticsSummary("admin-token", "2026-02-30", "2026-03-01"))
      .rejects.toBeInstanceOf(BadRequestException);
    await expect(service.productAnalyticsSummary("admin-token", "2026-11-02", "2026-11-01"))
      .rejects.toBeInstanceOf(BadRequestException);
    expect(rpc).not.toHaveBeenCalled();
  });

  it("rejects windows longer than 90 inclusive UTC calendar days", async () => {
    await expect(service.productAnalyticsSummary("admin-token", "2026-01-01", "2026-04-01"))
      .rejects.toBeInstanceOf(BadRequestException);
    expect(rpc).not.toHaveBeenCalled();
  });

  it("fails closed when global-admin verification fails", async () => {
    (identity.requireGlobalAdmin as jest.Mock).mockRejectedValueOnce(new Error("forbidden"));
    await expect(service.productAnalyticsSummary("member-token", "2026-11-01", "2026-11-30"))
      .rejects.toThrow("forbidden");
    expect(rpc).not.toHaveBeenCalled();
  });
});
