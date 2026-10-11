import { MidvashBibleProvider } from "./midvash-bible.provider";

describe("MidvashBibleProvider verse structure", () => {
  afterEach(() => jest.restoreAllMocks());

  it("returns individual verse segments for a full chapter", async () => {
    jest.spyOn(global, "fetch").mockResolvedValue({
      ok: true,
      json: async () => ({
        data: {
          version: "almeida-livre",
          bookName: "João",
          chapter: 3,
          verse: 1,
          verseEnd: 2,
          text: "No princípio. E a terra.",
          verses: ["No princípio.", "E a terra."],
        },
        meta: { copyright: "Texto de domínio público" },
      }),
    } as Response);

    const provider = new MidvashBibleProvider();
    const result = await provider.get({ book: "João", chapter: 3 }, "almeida-livre");

    expect(result?.verses).toEqual(["No princípio.", "E a terra."]);
    expect(result?.reference.verseStart).toBeUndefined();
    expect(result?.reference.verseEnd).toBeUndefined();
    expect(result?.copyright).toBe("Texto de domínio público");
  });

  it("keeps the requested verse range when one is selected", async () => {
    jest.spyOn(global, "fetch").mockResolvedValue({
      ok: true,
      json: async () => ({
        data: {
          version: "almeida-livre",
          bookName: "João",
          chapter: 3,
          verse: 16,
          verseEnd: 17,
          text: "Versículo dezasseis. Versículo dezassete.",
          verses: ["Versículo dezasseis.", "Versículo dezassete."],
        },
        meta: { copyright: "Texto de domínio público" },
      }),
    } as Response);

    const provider = new MidvashBibleProvider();
    const result = await provider.get(
      { book: "João", chapter: 3, verseStart: 16, verseEnd: 17 },
      "almeida-livre",
    );

    expect(result?.verses).toEqual(["Versículo dezasseis.", "Versículo dezassete."]);
    expect(result?.reference.verseStart).toBe(16);
    expect(result?.reference.verseEnd).toBe(17);
  });
});
