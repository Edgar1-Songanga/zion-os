# Analytics domain boundaries

ZION keeps three analytical domains separate:

- **Product Analytics** — ZION OS and RESA adoption, module usage, funnels and retention. Event and metric contracts live in `product-event-registry.ts` and `product-metric-registry.ts`. Implementation status and privacy rules: [Product Analytics specification](../../../../../docs/product/zion-product-analytics.md).
- **Institutional Intelligence** — organization, membership, ministry and operational indicators. Definitions live in `metric-registry.ts`; the API response explicitly labels this catalogue as `institutional_intelligence`.
- **Platform Operations** — uptime, latency, failures, queue health and infrastructure cost. This is a separate observability domain and must not be inferred from product event counts.

The historical `PLATFORM_ANALYTICS_METRICS` export remains as a backward-compatible alias only. Its contents are institutional metrics, not product telemetry.
