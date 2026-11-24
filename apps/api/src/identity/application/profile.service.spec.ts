import { UnauthorizedException } from "@nestjs/common";
import { ProfileService } from "./profile.service";
import { SupabaseRestClient } from "../../common/supabase/supabase-rest.client";
import type { IdentityService } from "./identity.service";

describe("ProfileService product analytics privacy preference", () => {
  const userId = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";
  const identity = {
    getCurrentUser: jest.fn().mockResolvedValue({ id: userId, email: "member@example.test" }),
  } as unknown as IdentityService;
  let service: ProfileService;
  let get: jest.SpyInstance;
  let post: jest.SpyInstance;
  let patch: jest.SpyInstance;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new ProfileService(identity);
    get = jest.spyOn(SupabaseRestClient.prototype, "get");
    post = jest.spyOn(SupabaseRestClient.prototype, "post");
    patch = jest.spyOn(SupabaseRestClient.prototype, "patch");
  });

  afterEach(() => {
    get.mockRestore();
    post.mockRestore();
    patch.mockRestore();
  });

  it("defaults legacy profiles to analytics disabled", async () => {
    get.mockResolvedValue([{
      id: userId, display_name: "Member", privacy: { profile_visibility: "public" },
    }] as never);
    const profile = await service.getOrCreate("access-token");
    expect(profile.privacy.product_analytics).toBe(false);
    expect(profile.privacy.profile_visibility).toBe("public");
    expect(profile.privacy.message_policy).toBe("everyone");
  });

  it("preserves the current privacy preferences when changing only analytics consent", async () => {
    get.mockResolvedValue([{ privacy: { profile_visibility: "private", product_analytics: true } }] as never);
    patch.mockResolvedValue([{ id: userId, privacy: { profile_visibility: "private", product_analytics: false } }] as never);
    await service.update("access-token", {
      privacy: { product_analytics: false } as never,
    });
    expect(patch).toHaveBeenCalledWith(
      "profiles",
      "access-token",
      expect.objectContaining({
        privacy: expect.objectContaining({
          profile_visibility: "private",
          product_analytics: false,
          message_policy: "everyone",
        }),
      }),
      `?id=eq.${userId}`,
    );
  });

  it("rejects a non-boolean analytics consent value", async () => {
    await expect(service.update("access-token", {
      privacy: { product_analytics: "yes" } as never,
    })).rejects.toBeInstanceOf(UnauthorizedException);
    expect(patch).not.toHaveBeenCalled();
  });
});
