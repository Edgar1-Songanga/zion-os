import { Body, Controller, Get, Headers, Patch, UnauthorizedException } from '@nestjs/common';
import { ProfileService } from '../application/profile.service';

@Controller('v1/identity/profile')
export class ProfileController {
  constructor(private readonly profiles: ProfileService) {}

  private token(authorization?: string) {
    const token = authorization?.replace(/^Bearer\s+/i, '').trim();
    if (!token) throw new UnauthorizedException('Bearer token is required');
    return token;
  }

  @Get()
  get(@Headers('authorization') authorization?: string) {
    return this.profiles.getOrCreate(this.token(authorization));
  }

  @Patch()
  update(
    @Headers('authorization') authorization: string | undefined,
    @Body() body: Record<string, unknown>,
  ) {
    return this.profiles.update(this.token(authorization), body);
  }
}
