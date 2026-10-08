export type MinistryStatus = 'active' | 'inactive';
export type MinistryVerification = 'unverified' | 'pending' | 'verified';

export interface MinistryRecord {
  id: string;
  organizationId: string;
  name: string;
  department: string;
  description: string;
  philosophy: string;
  status: MinistryStatus;
  verification?: MinistryVerification;
  createdAt: string;
  organization?: {
    church?: string;
    district?: string;
    conference?: string;
    union?: string;
    division?: string;
  };
  leadership: Array<{ id: string; user_id: string; role: string; verified: boolean }>;
  programs: Array<{
    id: string;
    name: string;
    description?: string;
    status: string;
    start_date?: string;
    end_date?: string;
  }>;
  reports: Array<{ id: string; title: string; status: string; submitted_at: string }>;
  metrics: {
    members: number;
    leaders: number;
    programs: number;
    participation: number;
    growth: number;
    impact: number;
  };
}

export interface MinistryDirectoryPort {
  create?(
    organizationId: string,
    input: {
      name: string;
      department: string;
      philosophy: string;
      description: string;
    },
    token?: string,
  ): Promise<MinistryRecord | null>;
  getById(id: string, token?: string): Promise<MinistryRecord | null>;
  listByOrganization(organizationId: string, token?: string): Promise<MinistryRecord[]>;
}
