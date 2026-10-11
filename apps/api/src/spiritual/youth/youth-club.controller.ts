import { Body, Controller, Get, Headers, NotFoundException, Param, Patch, Post, UnauthorizedException } from '@nestjs/common';
import { YouthClubService } from './youth-club.service';
import type { YouthClubInput, YouthClubStatus } from './youth-club.types';

type YouthClubBody = {
  organization_id?: string;
  ministry_id?: string | null;
  name?: string;
  program_id?: string;
  motto?: string;
  description?: string;
  logo_url?: string | null;
  cover_image_url?: string | null;
  status?: YouthClubStatus;
};

function toServiceInput(body: YouthClubBody): YouthClubInput {
  return {
    ...(body.organization_id !== undefined ? { organizationId: body.organization_id } : {}),
    ...(body.ministry_id !== undefined ? { ministryId: body.ministry_id } : {}),
    ...(body.name !== undefined ? { name: body.name } : {}),
    ...(body.program_id !== undefined ? { programId: body.program_id } : {}),
    ...(body.motto !== undefined ? { motto: body.motto } : {}),
    ...(body.description !== undefined ? { description: body.description } : {}),
    ...(body.logo_url !== undefined ? { logoUrl: body.logo_url } : {}),
    ...(body.cover_image_url !== undefined ? { coverImageUrl: body.cover_image_url } : {}),
    ...(body.status !== undefined ? { status: body.status } : {}),
  };
}

@Controller('v1/youth/clubs')
export class YouthClubController {
  constructor(private readonly clubs: YouthClubService) {}

  private token(authorization?: string) {
    const token = authorization?.replace(/^Bearer\s+/i, '').trim();
    if (!token) throw new UnauthorizedException('Bearer token is required');
    return token;
  }

  @Get('organization/:organizationId')
  list(
    @Headers('authorization') authorization: string | undefined,
    @Param('organizationId') organizationId: string,
  ) {
    return this.clubs.list(organizationId, this.token(authorization));
  }

  @Post()
  create(
    @Headers('authorization') authorization: string | undefined,
    @Body() body: YouthClubBody,
  ) {
    return this.clubs.create(this.token(authorization), toServiceInput(body));
  }

  @Get(':id')
  get(@Headers('authorization') authorization: string | undefined, @Param('id') id: string) {
    return this.clubs.get(id, this.token(authorization));
  }

  @Patch(':id')
  async update(
    @Headers('authorization') authorization: string | undefined,
    @Param('id') id: string,
    @Body() body: Partial<Omit<YouthClubBody, 'organization_id'>>,
  ) {
    const updated = await this.clubs.update(id, this.token(authorization), toServiceInput(body));
    if (!updated) throw new NotFoundException('Youth club not found or you do not have permission to edit it.');
    return updated;
  }
}
