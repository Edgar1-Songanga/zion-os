import { AiCoreProvider } from "./ai-core.provider";

describe("AiCoreProvider", () => {
  const originalEnv = process.env;
  beforeEach(() => {
    process.env = { ...originalEnv, AI_CORE_BASE_URL: "https://ai-core.example", AI_CORE_API_KEY: "k".repeat(40), AI_CONTEXT_SIGNING_SECRET: "s".repeat(40), AI_CORE_SPACE: "zion", AI_CONTEXT_ISSUER: "zion-api", AI_CONTEXT_AUDIENCE: "ai-core", NODE_ENV: "test" };
  });
  afterEach(() => { process.env = originalEnv; jest.restoreAllMocks(); });

  it("sends a signed tenant-scoped chat request and returns generated text", async () => {
    const fetchMock = jest.spyOn(global, "fetch").mockResolvedValue({
      ok: true, text: async () => JSON.stringify({ text: "Resposta fundamentada.", provider: "test-model", model: "model-a" }),
    } as Response);
    const result = await new AiCoreProvider().generate({ userId: "u-1", tenantId: "church-1", roles: ["member"], prompt: "Explique João 3:16", references: ["João 3:16"] });
    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, init] = fetchMock.mock.calls[0] as unknown as [URL, RequestInit];
    expect(String(url)).toBe("https://ai-core.example/api/v1/ai/generate");
    const headers = new Headers(init.headers);
    expect(headers.get("x-ai-core-key")).toBe("k".repeat(40));
    expect(headers.get("x-ai-context-token")).toContain(".");
    expect(JSON.parse(String(init.body))).toMatchObject({ space: "zion", operation: "CHAT", tenantId: "church-1" });
    expect(result.content).toBe("Resposta fundamentada.");
    expect(result.references).toEqual([]);
  });

  it("fails closed when tenant context is missing", async () => {
    const fetchMock = jest.spyOn(global, "fetch");
    await expect(new AiCoreProvider().generate({ prompt: "Olá" })).rejects.toThrow("verified tenantId");
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("rejects malformed provider responses", async () => {
    jest.spyOn(global, "fetch").mockResolvedValue({ ok: true, text: async () => JSON.stringify({ choices: [] }) } as Response);
    await expect(new AiCoreProvider().generate({ tenantId: "church-1", prompt: "Olá" })).rejects.toThrow("invalid or empty");
  });
});
