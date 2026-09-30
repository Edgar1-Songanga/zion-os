import { Injectable, Inject, Optional } from "@nestjs/common";
import type { MinistryDirectoryPort, MinistryRecord } from "./ministry.types";

export const MINISTRY_DIRECTORY = Symbol("MINISTRY_DIRECTORY");

@Injectable()
export class SpiritualMinistryService {
  constructor(
    @Optional() @Inject(MINISTRY_DIRECTORY)
    private readonly directory?: MinistryDirectoryPort,
  ) {}

  async get(id: string): Promise<MinistryRecord | null> {
    if (!id) throw new Error("Ministry id is required.");
    return this.directory ? this.directory.getById(id) : null;
  }

  async list(organizationId: string): Promise<MinistryRecord[]> {
    if (!organizationId) throw new Error("Organization id is required.");
    return this.directory ? this.directory.listByOrganization(organizationId) : [];
  }
}