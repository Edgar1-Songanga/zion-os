import { Body, Controller, Get, Headers, Param, Patch, Post, UnauthorizedException } from '@nestjs/common';
import { OrganizationUnitsService } from '../application/organization-units.service';

@Controller('v1/organizations/:organizationId/units')
export class OrganizationUnitsController {
  constructor(private readonly units: OrganizationUnitsService) {}

  private token(authorization?: string) {
    const token = authorization?.replace(/^Bearer\s+/i, '').trim();
    if (!token) throw new UnauthorizedException('Bearer token is required');
    return token;
  }

  @Get()
  list(@Headers('authorization') authorization: string | undefined, @Param('organizationId') organizationId: string) {
    return this.units.list(this.token(authorization), organizationId);
  }

  @Post()
  create(
    @Headers('authorization') authorization: string | undefined,
    @Param('organizationId') organizationId: string,
    @Body() body: { name: string; unit_type?: string; description?: string; parent_id?: string | null },
  ) {
    return this.units.create(this.token(authorization), organizationId, body);
  }

  @Patch(':unitId')
  update(
    @Headers('authorization') authorization: string | undefined,
    @Param('organizationId') organizationId: string,
    @Param('unitId') unitId: string,
    @Body() body: { name?: string; unit_type?: string; description?: string | null; parent_id?: string | null; is_active?: boolean },
  ) {
    return this.units.update(this.token(authorization), organizationId, unitId, body);
  }
}
