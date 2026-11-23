export type ProductMetricAvailability =
  | "AWAITING_TELEMETRY"
  | "AWAITING_AGGREGATION"
  | "NOT_YET_MEASURABLE";

export type ProductMetricDefinition = {
  id: string;
  name: string;
  product: "zion_os" | "resa" | "cross_product";
  formula: string;
  event_dependencies: readonly string[];
  availability: ProductMetricAvailability;
  caveats: readonly string[];
};

export const PRODUCT_METRIC_REGISTRY: readonly ProductMetricDefinition[] = [
  {
    id: "product.active_users.daily",
    name: "Utilizadores activos diários (DAU)",
    product: "cross_product",
    formula: "COUNT(DISTINCT actor_user_id) with at least one valid product event in the UTC calendar day.",
    event_dependencies: ["*"],
    availability: "AWAITING_AGGREGATION",
    caveats: ["Requires a privileged, audited aggregate; actor-level RLS must remain unchanged.", "Anonymous visitors are not included in the first authenticated release."],
  },
  {
    id: "product.active_users.weekly",
    name: "Utilizadores activos semanais (WAU)",
    product: "cross_product",
    formula: "COUNT(DISTINCT actor_user_id) with at least one valid product event in the trailing seven-day window.",
    event_dependencies: ["*"],
    availability: "AWAITING_AGGREGATION",
    caveats: ["Uses a rolling seven-day window; timezone and period boundaries must be displayed."],
  },
  {
    id: "product.active_users.monthly",
    name: "Utilizadores activos mensais (MAU)",
    product: "cross_product",
    formula: "COUNT(DISTINCT actor_user_id) with at least one valid product event in the trailing thirty-day window.",
    event_dependencies: ["*"],
    availability: "AWAITING_AGGREGATION",
    caveats: ["Uses a rolling thirty-day window; not a calendar-month total."],
  },
  {
    id: "product.module.adoption_rate",
    name: "Adopção por módulo",
    product: "cross_product",
    formula: "Distinct actors with any valid registered event in the module divided by distinct actors with any valid registered event in the parent product for the same period.",
    event_dependencies: ["*"],
    availability: "AWAITING_AGGREGATION",
    caveats: ["The denominator is product-active users, not all registered accounts.", "Modules are compared only within their parent product."],
  },
  {
    id: "product.retention.d1",
    name: "Retenção D1",
    product: "cross_product",
    formula: "Users active on cohort day who return on the next calendar day divided by eligible cohort users.",
    event_dependencies: ["*"],
    availability: "AWAITING_AGGREGATION",
    caveats: ["Requires a sufficiently mature cohort and consistent event collection."],
  },
  {
    id: "product.retention.d7",
    name: "Retenção D7",
    product: "cross_product",
    formula: "Users active on cohort day who return on day seven divided by eligible cohort users.",
    event_dependencies: ["*"],
    availability: "AWAITING_AGGREGATION",
    caveats: ["Exact-day retention; rolling-window retention must be named separately."],
  },
  {
    id: "product.retention.d30",
    name: "Retenção D30",
    product: "cross_product",
    formula: "Users active on cohort day who return on day thirty divided by eligible cohort users.",
    event_dependencies: ["*"],
    availability: "AWAITING_AGGREGATION",
    caveats: ["No historical retention can be backfilled before reliable product event coverage."],
  },
  {
    id: "bible_engine.search.success_rate",
    name: "Taxa de sucesso da pesquisa bíblica",
    product: "zion_os",
    formula: "Successful bible_search_submitted events divided by all bible_search_submitted events.",
    event_dependencies: ["bible_search_submitted"],
    availability: "AWAITING_TELEMETRY",
    caveats: ["Search terms and Bible passage content are intentionally excluded."],
  },
  {
    id: "bible_quiz.level.completion_rate",
    name: "Taxa de conclusão dos níveis do Bible Quiz",
    product: "zion_os",
    formula: "Not publishable until each quiz attempt has a stable, privacy-safe attempt identifier shared by its start and completion events.",
    event_dependencies: ["bible_quiz_started", "bible_quiz_level_completed"],
    availability: "NOT_YET_MEASURABLE",
    caveats: ["The current event contract has no attempt identifier; counting start and completion events would not produce a defensible attempt-level conversion rate."],
  },
  {
    id: "devotion.save_rate",
    name: "Taxa de salvamento de devoções",
    product: "zion_os",
    formula: "devotion_saved events divided by devotion page_view events for the same period; this is a proxy save rate, not a completion rate.",
    event_dependencies: ["page_view", "devotion_saved"],
    availability: "AWAITING_TELEMETRY",
    caveats: ["Page views are not equivalent to started devotion sessions; label as a proxy conversion rate."],
  },
  {
    id: "resa.reels.reaction_rate",
    name: "Taxa de reacção dos Reels",
    product: "resa",
    formula: "Unique reel_reaction events divided by eligible Reels impressions.",
    event_dependencies: ["reel_reaction"],
    availability: "NOT_YET_MEASURABLE",
    caveats: ["A governed impression event with deduplication and visibility duration is required before publishing this rate."],
  },
  {
    id: "resa.live.creation",
    name: "Criação de transmissões Live",
    product: "resa",
    formula: "Count of live_created events by visibility and period.",
    event_dependencies: ["live_created"],
    availability: "AWAITING_TELEMETRY",
    caveats: ["Creation does not imply a live session started, viewers joined or a stream completed."],
  },
  {
    id: "platform.session.duration",
    name: "Duração de sessão",
    product: "cross_product",
    formula: "Elapsed time between session_start and session_end for a valid session.",
    event_dependencies: ["session_start", "session_end"],
    availability: "NOT_YET_MEASURABLE",
    caveats: ["Session lifecycle events and inactivity timeout rules are not yet implemented."],
  },
  {
    id: "platform.client.error_rate",
    name: "Taxa de erros de experiência",
    product: "cross_product",
    formula: "Unique client-side error events divided by eligible client sessions.",
    event_dependencies: ["client_error", "session_start"],
    availability: "NOT_YET_MEASURABLE",
    caveats: ["Operational errors belong to Platform Operations and require a separate privacy-safe error telemetry contract."],
  },
] as const;

export function validateProductMetricRegistry(metrics: readonly ProductMetricDefinition[]) {
  const ids = new Set<string>();
  for (const metric of metrics) {
    if (ids.has(metric.id)) throw new Error(`Duplicate product metric id: ${metric.id}`);
    ids.add(metric.id);
    if (!metric.id || !metric.name || !metric.formula || metric.event_dependencies.length === 0) {
      throw new Error("Product metrics require an identifier, definition, formula and event lineage.");
    }
    if (!["zion_os", "resa", "cross_product"].includes(metric.product)) {
      throw new Error(`Unsupported product metric scope: ${metric.id}`);
    }
    if (!["AWAITING_TELEMETRY", "AWAITING_AGGREGATION", "NOT_YET_MEASURABLE"].includes(metric.availability)) {
      throw new Error(`Unsupported product metric availability: ${metric.id}`);
    }
    if (metric.caveats.length === 0) throw new Error(`Product metric requires limitations: ${metric.id}`);
  }
  return true;
}
