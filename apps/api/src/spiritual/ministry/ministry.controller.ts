import { Body, Controller, Get, Headers, Param, Post, UnauthorizedException } from '@nestjs/common';
import { SpiritualMinistryService } from './ministry.service';

@Controller('v1/ministries')
export class MinistryController {
  constructor(private readonly ministries: SpiritualMinistryService) {}

  private token(authorization?: string) {
    const token = authorization?.replace(/^Bearer\s+/i, '').trim();
    if (!token) throw new UnauthorizedException('Bearer token is required');
    return token;
  }

  @Post()
  create(
    @Headers('authorization') authorization: string | undefined,
    @Body() body: {
      organization_id: string;
      name: string;
      department?: string;
      philosophy?: string;
      description?: string;
    },
  ) {
    return this.ministries.create(this.token(authorization), body);
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
