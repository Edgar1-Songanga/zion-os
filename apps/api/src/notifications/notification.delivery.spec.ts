import { NotificationDeliveryService } from "./notification.delivery";

describe("NotificationDeliveryService", () => {
  it("does not call an external provider for unsupported channels", async () => {
    const service = new NotificationDeliveryService();

    await expect(service.deliver({
      id: "n1",
      userId: "u1",
      type: "test",
      title: "Test",
      body: "Body",
      channel: "push",
      priority: "normal",
      createdAt: new Date().toISOString(),
    }, "user@example.com")).resolves.toEqual({
      delivered: false,
      channel: "push",
      reason: "provider_not_configured",
    });
  });
});
