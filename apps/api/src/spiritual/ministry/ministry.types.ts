export type MinistryStatus = "active" | "inactive";
export type MinistryVerification = "unverified" | "pending" | "verified";

export interface MinistryRecord {
  id: string;
  organizationId: string;
  name: string;
  description: string;
  status: MinistryStatus;
  verification: MinistryVerification;
  createdAt: string;
}

export interface MinistryDirectoryPort {
  getById(id: string): Promise<MinistryRecord | null>;
  listByOrganization(organizationId: string): Promise<MinistryRecord[]>;
}