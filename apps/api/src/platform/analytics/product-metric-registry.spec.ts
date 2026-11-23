import { PRODUCT_METRIC_REGISTRY, validateProductMetricRegistry } from "./product-metric-registry";

describe("product analytics metric registry", () => {
  it("keeps every metric traceable and explicitly gated until data is available", () => {
    expect(validateProductMetricRegistry(PRODUCT_METRIC_REGISTRY)).toBe(true);
    expect(new Set(PRODUCT_METRIC_REGISTRY.map((metric) => metric.id)).size).toBe(PRODUCT_METRIC_REGISTRY.length);
    expect(PRODUCT_METRIC_REGISTRY.every((metric) => metric.formula && metric.event_dependencies.length && metric.caveats.length)).toBe(true);
    expect(PRODUCT_METRIC_REGISTRY.every((metric) => metric.availability !== "LIVE")).toBe(true);
  });

  it("rejects duplicate metric identifiers", () => {
    const metric = PRODUCT_METRIC_REGISTRY[0];
    expect(() => validateProductMetricRegistry([metric, metric])).toThrow(/Duplicate/);
  });
});
