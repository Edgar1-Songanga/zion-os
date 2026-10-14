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
  participation: number | null;
  growth: number | null;
  impact: number | null;
}


export interface Ministry {
  id: string;
  organizationId?: string;

  name: string;
  department: string;
  description: string;
  philosophy: string;
  coverImageUrl?: string | null;
  focusAreas?: string[];
  ageRange?: string | null;
  officialUrl?: string | null;
  sourceLabel?: string | null;
  status: MinistryStatus;

  organization: MinistryOrganization;

  metrics: MinistryMetrics;

  leadership: MinistryLeader[];

  programs: MinistryProgram[];

  reports: MinistryReport[];
}
