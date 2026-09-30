import { Controller, Get, Headers, UnauthorizedException } from '@nestjs/common';
import { IdentityService } from '../application/identity.service';

@Controller('v1/identity')
export class IdentityController {
  constructor(private readonly identityService: IdentityService) {}

  @Get('me')
  async me(@Headers('authorization') authorization?: string) {
    const token = authorization?.replace(/^Bearer\\s+/i, '').trim();
    if (!token) throw new UnauthorizedException('Bearer token is required');
    return this.identityService.getCurrentUser(token);
  }
}
