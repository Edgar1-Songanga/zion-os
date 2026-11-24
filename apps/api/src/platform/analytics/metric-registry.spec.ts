import { INSTITUTIONAL_ANALYTICS_METRICS, validateMetricRegistry } from "./metric-registry";

describe("institutional analytics metric registry", () => {
  it("contains unique, traceable, live aggregate definitions", () => {
    expect(validateMetricRegistry(INSTITUTIONAL_ANALYTICS_METRICS)).toBe(true);
    expect(new Set(INSTITUTIONAL_ANALYTICS_METRICS.map((metric) => metric.id)).size).toBe(INSTITUTIONAL_ANALYTICS_METRICS.length);
    for (const metric of INSTITUTIONAL_ANALYTICS_METRICS) {
      expect(metric.source_table).toBeTruthy();
      expect(metric.source_field).toBeTruthy();
      expect(metric.description).toBeTruthy();
      expect(metric.limitations.length).toBeGreaterThan(0);
      expect(metric.scope).toBe("authorized_organization_subtree");
      expect(metric.status).toBe("LIVE_AGGREGATE");
    }
  });

  it("keeps membership aggregates behind a minimum group-size policy", () => {
    const membershipMetrics = INSTITUTIONAL_ANALYTICS_METRICS.filter((metric) => metric.domain === "membership");
    expect(membershipMetrics.length).toBeGreaterThan(0);
    expect(membershipMetrics.every((metric) => metric.minimum_group_size >= 5)).toBe(true);
  });

  it("rejects duplicate identifiers and unsupported publication states", () => {
    const metric = INSTITUTIONAL_ANALYTICS_METRICS[0];
    expect(() => validateMetricRegistry([metric, metric])).toThrow(/Duplicate/);
    expect(() => validateMetricRegistry([{ ...metric, status: "FAKE" as never }])).toThrow(/publication state/);
  });
});
