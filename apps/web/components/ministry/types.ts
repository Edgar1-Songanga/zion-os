export type MinistryStatus = "ACTIVE" | "INACTIVE";

export type ProgramStatus =
  | "ACTIVE"
  | "COMPLETED"
  | "PLANNED";

export type ReportStatus =
  | "PENDING"
  | "APPROVED"
  | "REJECTED";


export interface MinistryOrganization {
  church?: string;
  district?: string;
  conference?: string;
  union?: string;
  division?: string;
  generalConference?: string;
}


export interface MinistryLeader {
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
  status: ProgramStatus;
  startDate?: string;
  endDate?: string;
}


export interface MinistryReport {
  id: string;
  title: string;
  status: ReportStatus;
  submittedAt?: string;
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
  status: MinistryStatus;

  organization: MinistryOrganization;

  metrics: MinistryMetrics;

  leadership: MinistryLeader[];

  programs: MinistryProgram[];

  reports: MinistryReport[];
}
