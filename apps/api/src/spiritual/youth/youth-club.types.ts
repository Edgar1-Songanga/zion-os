export type YouthProgramId =
  | 'adventurers'
  | 'pathfinders'
  | 'ambassadors'
  | 'young-adults'
  | 'public-campus-ministries';

export type YouthClubStatus = 'ACTIVE' | 'INACTIVE';

export interface YouthClubRecord {
  id: string;
  organizationId: string;
  ministryId?: string | null;
  name: string;
  programId: YouthProgramId;
  motto: string;
  description: string;
  logoUrl?: string | null;
  coverImageUrl?: string | null;
  status: YouthClubStatus;
  createdAt: string;
  updatedAt: string;
}

export interface YouthClubInput {
  organizationId?: string;
  ministryId?: string | null;
  name?: string;
  programId?: string;
  motto?: string;
  description?: string;
  logoUrl?: string | null;
  coverImageUrl?: string | null;
  status?: YouthClubStatus;
}

export interface YouthClubDirectoryPort {
  create(input: Required<Pick<YouthClubInput, 'organizationId' | 'name' | 'programId'>> & YouthClubInput, token: string): Promise<YouthClubRecord | null>;
  getById(id: string, token: string): Promise<YouthClubRecord | null>;
  listByOrganization(organizationId: string, token: string): Promise<YouthClubRecord[]>;
  update(id: string, input: YouthClubInput, token: string): Promise<YouthClubRecord | null>;
}
