export type AnalyticsMetricDefinition = {
  id: string;
  name: string;
  domain: "membership" | "organization" | "ministry";
  description: string;
  source_table: string;
  source_field: string;
  aggregation: "count";
  filter: Record<string, string>;
  scope: "organization";
  sensitivity: "institutional_aggregate";
  minimum_group_size: number;
  status: "CATALOGUED_NOT_CALCULATED";
  limitations: string[];
};

export const PLATFORM_ANALYTICS_METRICS: readonly AnalyticsMetricDefinition[] = [
  {
    id: "membership.active.count",
    name: "Membros activos",
    domain: "membership",
    description: "Número de vínculos de membresia activos na organização seleccionada.",
    source_table: "organization_memberships",
    source_field: "id",
    aggregation: "count",
    filter: { status: "ACTIVE" },
    scope: "organization",
    sensitivity: "institutional_aggregate",
    minimum_group_size: 5,
    status: "CATALOGUED_NOT_CALCULATED",
    limitations: [
      "Conta vínculos de membresia, não pessoas únicas entre organizações.",
      "Não representa automaticamente o total oficial de membros eclesiásticos.",
    ],
  },
  {
    id: "organization.department.active.count",
    name: "Departamentos activos",
    domain: "organization",
    description: "Número de unidades departamentais activas na organização seleccionada.",
    source_table: "organization_units",
    source_field: "id",
    aggregation: "count",
    filter: { is_active: "true" },
    scope: "organization",
    sensitivity: "institutional_aggregate",
    minimum_group_size: 1,
    status: "CATALOGUED_NOT_CALCULATED",
    limitations: [
      "Conta unidades administrativas, não mede qualidade nem impacto ministerial.",
    ],
  },
  {
    id: "ministry.report.pending.count",
    name: "Relatórios ministeriais pendentes",
    domain: "ministry",
    description: "Número de relatórios ministeriais com estado PENDING na organização seleccionada.",
    source_table: "ministry_reports",
    source_field: "id",
    aggregation: "count",
    filter: { status: "PENDING" },
    scope: "organization",
    sensitivity: "institutional_aggregate",
    minimum_group_size: 1,
    status: "CATALOGUED_NOT_CALCULATED",
    limitations: [
      "Depende da consistência do estado e da associação dos relatórios à organização.",
      "Não mede atraso sem uma política de prazo institucional aprovada.",
    ],
  },
  {
    id: "ministry.report.approved.count",
    name: "Relatórios ministeriais aprovados",
    domain: "ministry",
    description: "Número de relatórios ministeriais com estado APPROVED na organização seleccionada.",
    source_table: "ministry_reports",
    source_field: "id",
    aggregation: "count",
    filter: { status: "APPROVED" },
    scope: "organization",
    sensitivity: "institutional_aggregate",
    minimum_group_size: 1,
    status: "CATALOGUED_NOT_CALCULATED",
    limitations: [
      "É uma contagem de registos aprovados, não uma avaliação de desempenho ou qualidade.",
    ],
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
    if (metric.scope !== "organization" || metric.status !== "CATALOGUED_NOT_CALCULATED") {
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
