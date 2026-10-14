import { Controller, Get, Headers, UnauthorizedException } from '@nestjs/common';
import { IdentityService } from '../application/identity.service';

@Controller('v1/identity')
export class IdentityController {
  constructor(private readonly identityService: IdentityService) {}

  @Get('me')
  async me(@Headers('authorization') authorization?: string) {
    const match = authorization?.match(/^Bearer\s+(\S+)\s*$/i);
    const token = match?.[1];
    if (!token) throw new UnauthorizedException('A valid Bearer token is required');
    return this.identityService.getCurrentUser(token);
  }
}
