import { Body, Controller, Delete, Get, Headers, NotFoundException, Param, Patch, Post, UnauthorizedException } from '@nestjs/common';
import { YouthClubService } from './youth-club.service';
import type { YouthClubInput, YouthClubStatus } from './youth-club.types';

type YouthClubBody = {
  organization_id?: string; ministry_id?: string | null; name?: string; program_id?: string;
  motto?: string; description?: string; logo_url?: string | null; cover_image_url?: string | null; status?: YouthClubStatus;
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
  list(@Headers('authorization') authorization: string | undefined, @Param('organizationId') organizationId: string) {
    return this.clubs.list(organizationId, this.token(authorization));
  }

  @Post()
  create(@Headers('authorization') authorization: string | undefined, @Body() body: YouthClubBody) {
    return this.clubs.create(this.token(authorization), toServiceInput(body));
  }

  @Get(':id')
  async get(@Headers('authorization') authorization: string | undefined, @Param('id') id: string) {
    const club = await this.clubs.get(id, this.token(authorization));
    if (!club) throw new NotFoundException('Youth club not found.');
    return club;
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

  @Get(':id/members')
  listMembers(@Headers('authorization') authorization: string | undefined, @Param('id') id: string) {
    return this.clubs.listMembers(id, this.token(authorization));
  }

  @Post(':id/members')
  async addMember(
    @Headers('authorization') authorization: string | undefined,
    @Param('id') id: string,
    @Body() body: { user_id?: string },
  ) {
    if (!body.user_id) throw new NotFoundException('user_id is required.');
    const member = await this.clubs.addMember(id, body.user_id, this.token(authorization));
    if (!member) throw new NotFoundException('Member was not added or access was denied.');
    return member;
  }

  @Patch(':id/members/:userId')
  async updateMember(
    @Headers('authorization') authorization: string | undefined,
    @Param('id') id: string,
    @Param('userId') userId: string,
    @Body() body: { status?: YouthClubStatus },
  ) {
    const member = await this.clubs.updateMemberStatus(id, userId, body.status, this.token(authorization));
    if (!member) throw new NotFoundException('Youth club member not found or access denied.');
    return member;
  }

  @Delete(':id/members/:userId')
  async removeMember(@Headers('authorization') authorization: string | undefined, @Param('id') id: string, @Param('userId') userId: string) {
    await this.clubs.removeMember(id, userId, this.token(authorization));
    return { success: true };
  }

  @Get(':id/leaders')
  listLeaders(@Headers('authorization') authorization: string | undefined, @Param('id') id: string) {
    return this.clubs.listLeaders(id, this.token(authorization));
  }

  @Post(':id/leaders')
  async assignLeader(
    @Headers('authorization') authorization: string | undefined,
    @Param('id') id: string,
    @Body() body: { user_id?: string; role?: string },
  ) {
    if (!body.user_id || !body.role) throw new NotFoundException('user_id and role are required.');
    const leader = await this.clubs.assignLeader(id, body.user_id, body.role, this.token(authorization));
    if (!leader) throw new NotFoundException('Leader was not assigned or access was denied.');
    return leader;
  }

  @Delete(':id/leaders/:userId')
  async removeLeader(@Headers('authorization') authorization: string | undefined, @Param('id') id: string, @Param('userId') userId: string) {
    await this.clubs.removeLeader(id, userId, this.token(authorization));
    return { success: true };
  }
}
