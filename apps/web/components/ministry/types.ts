export interface MinistryOrganization {
  church?: string;
  district?: string;
  conference?: string;
  union?: string;
  division?: string;
  generalConference?: string;
}

export interface MinistryLeadership {
  id: string;
  name: string;
  role: string;
  photo?: string;
  verified?: boolean;
}

export interface MinistryProgram {
  id: string;
  name: string;
  description?: string;
  status: "ACTIVE" | "COMPLETED" | "PLANNED";
}

export interface MinistryReport {
  id: string;
  title: string;
  status: "PENDING" | "APPROVED" | "REJECTED";
  date: string;
}

export interface MinistryMetrics {
  members: number;
  leaders: number;
  programs: number;
  participation: number;
  growth: number;
  impact: number;
}

export interface Ministry {
  id: string;

  name: string;
  department: string;
  description: string;
  status: "ACTIVE" | "INACTIVE";

  organization: MinistryOrganization;

  metrics: MinistryMetrics;

  leadership: MinistryLeadership[];

  programs: MinistryProgram[];

  reports: MinistryReport[];
}
