import { PRODUCT_METRIC_REGISTRY, validateProductMetricRegistry } from "./product-metric-registry";

describe("product analytics metric registry", () => {
  it("keeps every metric traceable and explicitly gated until data is available", () => {
    expect(validateProductMetricRegistry(PRODUCT_METRIC_REGISTRY)).toBe(true);
    expect(new Set(PRODUCT_METRIC_REGISTRY.map((metric) => metric.id)).size).toBe(PRODUCT_METRIC_REGISTRY.length);
    expect(PRODUCT_METRIC_REGISTRY.every((metric) => metric.formula && metric.event_dependencies.length && metric.caveats.length)).toBe(true);
    expect(PRODUCT_METRIC_REGISTRY.every((metric) => ["AWAITING_TELEMETRY", "AWAITING_AGGREGATION", "NOT_YET_MEASURABLE"].includes(metric.availability))).toBe(true);
  });

  it("does not publish unsupported completion or save metrics as proven outcomes", () => {
    const quiz = PRODUCT_METRIC_REGISTRY.find((metric) => metric.id === "bible_quiz.level.completion_rate");
    const devotion = PRODUCT_METRIC_REGISTRY.find((metric) => metric.id === "devotion.save_rate");
    expect(quiz?.availability).toBe("NOT_YET_MEASURABLE");
    expect(quiz?.formula).toContain("stable, privacy-safe attempt identifier");
    expect(devotion?.name).toContain("salvamento");
    expect(devotion?.formula).toContain("proxy save rate");
    expect(devotion?.formula).not.toContain("completion rate");
  });

  it("rejects duplicate metric identifiers", () => {
    const metric = PRODUCT_METRIC_REGISTRY[0];
    expect(() => validateProductMetricRegistry([metric, metric])).toThrow(/Duplicate/);
  });
});
