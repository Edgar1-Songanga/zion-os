import { Body, Controller, Get, Headers, Param, Post, UnauthorizedException } from '@nestjs/common';
import { OrganizationsService } from '../application/organizations.service';

@Controller('v1/organizations')
export class OrganizationsController {
  constructor(private readonly organizations: OrganizationsService) {}

  private token(authorization?: string) {
    const token = authorization?.replace(/^Bearer\s+/i, '').trim();
    if (!token) throw new UnauthorizedException('Bearer token is required');
    return token;
  }

  @Get()
  list(@Headers('authorization') authorization?: string) {
    return this.organizations.listMine(this.token(authorization));
  }

  @Get('directory')
  directory(@Headers('authorization') authorization?: string) {
    return this.organizations.directory(this.token(authorization));
  }

  @Post()
  create(
    @Headers('authorization') authorization: string | undefined,
    @Body() body: { name: string; slug: string; organization_type?: string },
  ) {
    return this.organizations.create(this.token(authorization), body);
  }

  @Get(':organizationId/memberships')
  memberships(
    @Headers('authorization') authorization: string | undefined,
    @Param('organizationId') organizationId: string,
  ) {
    return this.organizations.memberships(this.token(authorization), organizationId);
  }
}
