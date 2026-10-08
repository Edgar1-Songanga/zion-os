import { BadRequestException, Injectable, Inject, Optional } from '@nestjs/common';
import type { MinistryDirectoryPort, MinistryRecord } from './ministry.types';
export const MINISTRY_DIRECTORY = Symbol('MINISTRY_DIRECTORY');
@Injectable()
export class SpiritualMinistryService {
  constructor(@Optional() @Inject(MINISTRY_DIRECTORY) private readonly directory?: MinistryDirectoryPort) {}
  async create(token: string, input: { organization_id: string; name: string; department?: string; philosophy?: string; description?: string }): Promise<MinistryRecord | null> {\n    const organizationId = input.organization_id?.trim();\n    const name = input.name?.trim();\n    if (!organizationId || !name) throw new BadRequestException('organization_id and name are required');\n    const rows = await this.directory?.create?.(organizationId, {\n      name,\n      department: input.department?.trim() || 'MINISTRY',\n      philosophy: input.philosophy?.trim() || '',\n      description: input.description?.trim() || '',\n    }, token);\n    return rows ? rows : null;\n  }\n  async get(id: string, token?: string): Promise<MinistryRecord | null> {
    if (!id) throw new Error('Ministry id is required.');
    return this.directory ? this.directory.getById(id, token) : null;
  }
  async list(organizationId: string, token?: string): Promise<MinistryRecord[]> {
    if (!organizationId) throw new Error('Organization id is required.');
    return this.directory ? this.directory.listByOrganization(organizationId, token) : [];
  }
}
