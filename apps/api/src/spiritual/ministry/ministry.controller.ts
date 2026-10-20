import { Body, Controller, Get, Headers, Param, Patch, Post, UnauthorizedException } from '@nestjs/common';
import { SpiritualMinistryService } from './ministry.service';
import { IdentityService } from '../../identity/application/identity.service';

type MinistryBody = {
  organization_id: string;
  name: string;
  department?: string;
  philosophy?: string;
  description?: string;
  cover_image_url?: string | null;
  focus_areas?: string[];
  age_range?: string | null;
  official_url?: string | null;
  source_label?: string | null;
};

type MinistryProgramBody = {
  name?: string;
  description?: string | null;
  status?: 'PLANNED' | 'ACTIVE' | 'COMPLETED';
  start_date?: string | null;
  end_date?: string | null;
};

@Controller('v1/ministries')
export class MinistryController {
  constructor(
    private readonly ministries: SpiritualMinistryService,
    private readonly identity: IdentityService,
  ) {}

  private token(authorization?: string) {
    const token = authorization?.replace(/^Bearer\s+/i, '').trim();
    if (!token) throw new UnauthorizedException('Bearer token is required');
    return token;
  }

  @Post()
  create(
    @Headers('authorization') authorization: string | undefined,
    @Body() body: MinistryBody,
  ) {
    const token = this.token(authorization);
    return this.identity.getCurrentUser(token).then((user) =>
      this.ministries.create(token, { ...body, created_by: user.id }),
    );
  }

  @Patch(':id')
  update(
    @Headers('authorization') authorization: string | undefined,
    @Param('id') id: string,
    @Body() body: Partial<Omit<MinistryBody, 'organization_id'>>,
  ) {
    return this.ministries.update(id, this.token(authorization), body);
  }

  @Post(':id/programs')
  createProgram(
    @Headers('authorization') authorization: string | undefined,
    @Param('id') id: string,
    @Body() body: MinistryProgramBody,
  ) {
    return this.ministries.createProgram(id, this.token(authorization), body);
  }

  @Patch(':id/programs/:programId')
  updateProgram(
    @Headers('authorization') authorization: string | undefined,
    @Param('id') id: string,
    @Param('programId') programId: string,
    @Body() body: MinistryProgramBody,
  ) {
    return this.ministries.updateProgram(id, programId, this.token(authorization), body);
  }

  @Get(':id')
  get(@Headers('authorization') authorization: string | undefined, @Param('id') id: string) {
    return this.ministries.get(id, this.token(authorization));
  }

  @Get('organization/:organizationId')
  list(
    @Headers('authorization') authorization: string | undefined,
    @Param('organizationId') organizationId: string,
  ) {
    return this.ministries.list(organizationId, this.token(authorization));
  }
}
