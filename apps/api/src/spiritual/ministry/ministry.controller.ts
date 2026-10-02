import { Controller, Get, Headers, Param, UnauthorizedException } from '@nestjs/common';
import { SpiritualMinistryService } from './ministry.service';

@Controller('v1/ministries')
export class MinistryController {
  constructor(private readonly ministries: SpiritualMinistryService) {}
  private token(value?: string) {
    const token = value?.replace(/^Bearer\s+/i, '').trim();
    if (!token) throw new UnauthorizedException('Bearer token is required');
    return token;
  }
  @Get(':id')
  get(@Headers('authorization') authorization: string | undefined, @Param('id') id: string) {
    return this.ministries.get(id, this.token(authorization));
  }
  @Get('organization/:organizationId')
  list(@Headers('authorization') authorization: string | undefined, @Param('organizationId') organizationId: string) {
    return this.ministries.list(organizationId, this.token(authorization));
  }
}
