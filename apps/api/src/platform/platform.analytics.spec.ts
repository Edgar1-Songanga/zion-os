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

  beforeEach(() => {
    jest.clearAllMocks();
    service = new PlatformService(identity, automation);
    rpc = jest.spyOn(SupabaseRestClient.prototype, "rpc").mockResolvedValue({
      status: "LIVE_AGGREGATE",
    } as never);
  });

  afterEach(() => rpc.mockRestore());

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
