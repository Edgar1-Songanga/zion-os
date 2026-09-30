import { Injectable } from "@nestjs/common";
import type { MinistryDirectoryPort, MinistryRecord } from "./ministry.types";

@Injectable()
export class SpiritualMinistryService {
  constructor(private readonly directory?: MinistryDirectoryPort) {}

  async get(id: string): Promise<MinistryRecord | null> {
    if (!id) throw new Error("Ministry id is required.");
    return this.directory?.getById(id) ?? null;
  }

  async list(organizationId: string): Promise<MinistryRecord[]> {
    if (!organizationId) throw new Error("Organization id is required.");
    return this.directory?.listByOrganization(organizationId) ?? [];
  }
}