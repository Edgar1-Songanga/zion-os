import { ForbiddenException } from "@nestjs/common";
import { AiController } from "./ai.controller";

describe("AiController.chat", () => {
  const identity = { getCurrentUser: jest.fn() };
  const db = { get: jest.fn() };
  const spiritualAi = { enhance: jest.fn() };
  let controller: AiController;

  beforeEach(() => {
    jest.clearAllMocks();
    controller = new AiController(identity as any, db as any, spiritualAi as any);
    identity.getCurrentUser.mockResolvedValue({ id: "user-1", email: "member@example.test" });
    db.get.mockResolvedValue([{ id: "membership-1", organization_id: "church-1", role_id: "role-1", roles: { key: "member", name: "Member" } }]);
    spiritualAi.enhance.mockResolvedValue({ content: "Resposta", references: [], provider: "test" });
  });

  it("validates active membership before forwarding a prompt", async () => {
    const result = await controller.chat("Bearer valid-token", { organizationId: "church-1", prompt: "Explique João 3:16" });
    expect(identity.getCurrentUser).toHaveBeenCalledWith("valid-token");
    expect(db.get).toHaveBeenCalledWith("organization_memberships", "valid-token", expect.stringContaining("user_id=eq.user-1"));
    expect(spiritualAi.enhance).toHaveBeenCalledWith(expect.objectContaining({
      userId: "user-1", tenantId: "church-1", roles: ["member"], prompt: "Explique João 3:16",
    }));
    expect(result.content).toBe("Resposta");
  });

  it("does not call the model when the user is not an active member", async () => {
    db.get.mockResolvedValue([]);
    await expect(controller.chat("Bearer valid-token", { organizationId: "church-2", prompt: "Olá" }))
      .rejects.toBeInstanceOf(ForbiddenException);
    expect(spiritualAi.enhance).not.toHaveBeenCalled();
  });

  it("requires authentication and a non-empty prompt", async () => {
    await expect(controller.chat(undefined, { organizationId: "church-1", prompt: "Olá" })).rejects.toThrow("Bearer token");
    await expect(controller.chat("Bearer valid-token", { organizationId: "church-1", prompt: " " })).rejects.toThrow("prompt");
  });
});
