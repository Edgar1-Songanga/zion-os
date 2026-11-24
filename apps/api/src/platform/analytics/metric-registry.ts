export type AnalyticsMetricDefinition = {
  id: string;
  name: string;
  domain: "membership" | "organization" | "ministry";
  description: string;
  source_table: string;
  source_field: string;
  aggregation: "count";
  filter: Record<string, string>;
  scope: "authorized_organization_subtree";
  sensitivity: "institutional_aggregate";
  minimum_group_size: number;
  status: "LIVE_AGGREGATE" | "CATALOGUED_NOT_CALCULATED";
  limitations: string[];
};

export const INSTITUTIONAL_ANALYTICS_METRICS: readonly AnalyticsMetricDefinition[] = [
  {
    id: "membership.active.count",
    name: "Membros eclesiásticos activos",
    domain: "membership",
    description: "Registos eclesiásticos activos nas organizações incluídas no âmbito autorizado.",
    source_table: "church_member_records",
    source_field: "membership_status",
    aggregation: "count",
    filter: { membership_status: "ACTIVE" },
    scope: "authorized_organization_subtree",
    sensitivity: "institutional_aggregate",
    minimum_group_size: 5,
    status: "LIVE_AGGREGATE",
    limitations: [
      "Conta registos oficiais de membresia, não contas de utilizador da plataforma.",
      "O valor é ocultado quando o grupo agregado contém menos de cinco registos.",
      "Não apresenta repartição individual por igreja nesta versão.",
    ],
  },
  {
    id: "organization.department.active.count",
    name: "Departamentos activos",
    domain: "organization",
    description: "Unidades do tipo DEPARTMENT activas no âmbito institucional autorizado.",
    source_table: "organization_units",
    source_field: "is_active",
    aggregation: "count",
    filter: { is_active: "true", unit_type: "DEPARTMENT" },
    scope: "authorized_organization_subtree",
    sensitivity: "institutional_aggregate",
    minimum_group_size: 1,
    status: "LIVE_AGGREGATE",
    limitations: ["Conta unidades administrativas; não mede a qualidade nem o impacto dos departamentos."],
  },
  {
    id: "ministry.active.count",
    name: "Ministérios activos",
    domain: "ministry",
    description: "Ministérios com estado ACTIVE no âmbito institucional autorizado.",
    source_table: "ministries",
    source_field: "status",
    aggregation: "count",
    filter: { status: "ACTIVE" },
    scope: "authorized_organization_subtree",
    sensitivity: "institutional_aggregate",
    minimum_group_size: 1,
    status: "LIVE_AGGREGATE",
    limitations: ["A existência de um ministério não comprova a realização nem o impacto das suas actividades."],
  },
  {
    id: "ministry.program.active.count",
    name: "Programas activos",
    domain: "ministry",
    description: "Programas activos pertencentes a ministérios activos.",
    source_table: "ministry_programs",
    source_field: "status",
    aggregation: "count",
    filter: { status: "ACTIVE", ministry_status: "ACTIVE" },
    scope: "authorized_organization_subtree",
    sensitivity: "institutional_aggregate",
    minimum_group_size: 1,
    status: "LIVE_AGGREGATE",
    limitations: ["Conta programas registados; não avalia a execução nem os resultados."],
  },
  {
    id: "ministry.report.pending.count",
    name: "Relatórios ministeriais pendentes",
    domain: "ministry",
    description: "Relatórios ministeriais com estado PENDING.",
    source_table: "ministry_reports",
    source_field: "status",
    aggregation: "count",
    filter: { status: "PENDING" },
    scope: "authorized_organization_subtree",
    sensitivity: "institutional_aggregate",
    minimum_group_size: 1,
    status: "LIVE_AGGREGATE",
    limitations: ["Não mede atraso sem uma política institucional de prazos aprovada."],
  },
  {
    id: "ministry.report.approved.count",
    name: "Relatórios ministeriais aprovados",
    domain: "ministry",
    description: "Relatórios ministeriais com estado APPROVED.",
    source_table: "ministry_reports",
    source_field: "status",
    aggregation: "count",
    filter: { status: "APPROVED" },
    scope: "authorized_organization_subtree",
    sensitivity: "institutional_aggregate",
    minimum_group_size: 1,
    status: "LIVE_AGGREGATE",
    limitations: ["É uma contagem de registos aprovados, não uma avaliação de desempenho ou qualidade."],
  },
] as const;

export function validateMetricRegistry(metrics: readonly AnalyticsMetricDefinition[]) {
  const ids = new Set<string>();
  for (const metric of metrics) {
    if (ids.has(metric.id)) throw new Error(`Duplicate analytics metric id: ${metric.id}`);
    ids.add(metric.id);
    if (!metric.id || !metric.name || !metric.description || !metric.source_table || !metric.source_field) {
      throw new Error("Analytics metrics must declare identity, meaning and source lineage.");
    }
    if (metric.scope !== "authorized_organization_subtree" || !["LIVE_AGGREGATE", "CATALOGUED_NOT_CALCULATED"].includes(metric.status)) {
      throw new Error(`Unsupported metric publication state: ${metric.id}`);
    }
    if (!Number.isInteger(metric.minimum_group_size) || metric.minimum_group_size < 1) {
      throw new Error(`Invalid privacy threshold: ${metric.id}`);
    }
    if (metric.domain === "membership" && metric.minimum_group_size < 5) {
      throw new Error(`Membership metrics require a minimum group size of five: ${metric.id}`);
    }
  }
  return true;
}

// Backward-compatible export name; these definitions are institutional, not product-usage metrics.
export const PLATFORM_ANALYTICS_METRICS = INSTITUTIONAL_ANALYTICS_METRICS;
