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

  beforeEach(() => {
    jest.clearAllMocks();
    service = new PlatformService(identity, automation);
    post = jest.spyOn(SupabaseRestClient.prototype, "post").mockResolvedValue([{ id: "event-id" }] as never);
  });

  afterEach(() => post.mockRestore());

  it("stores a versioned product event with the verified actor and sanitized properties", async () => {
    await service.recordAnalytics("access-token", {
      event_name: "bible_search_submitted",
      product_key: "zion_os",
      module_key: "bible_engine",
      event_version: 1,
      session_id: sessionId,
      properties: { success: true, translation: "almeida-livre", result_count: 1 },
    });
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
      actor_id: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb",
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
