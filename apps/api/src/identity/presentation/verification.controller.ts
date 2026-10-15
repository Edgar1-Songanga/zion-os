import { Body, Controller, Get, Headers, Post, UnauthorizedException } from '@nestjs/common';
import { VerificationService } from '../application/verification.service';

@Controller('v1/identity/verification')
export class VerificationController {
  constructor(private readonly verification: VerificationService) {}

  private token(authorization?: string) {
    const token = authorization?.replace(/^Bearer\s+/i, '').trim();
    if (!token) throw new UnauthorizedException('Bearer token is required');
    return token;
  }

  @Get()
  getStatus(@Headers('authorization') authorization?: string) {
    return this.verification.getStatus(this.token(authorization));
  }

  @Post('requests')
  request(
    @Headers('authorization') authorization: string | undefined,
    @Body() body: { requested_type?: string },
  ) {
    return this.verification.requestVerification(this.token(authorization), body?.requested_type ?? 'personal');
  }
}
