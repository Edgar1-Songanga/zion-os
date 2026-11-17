import { Controller, Get, Headers, Param, Query, UnauthorizedException } from '@nestjs/common';
import { ChurchMembersService } from '../application/church-members.service';

@Controller('v1/church-members')
export class ChurchMemberRegisterController {
  constructor(private readonly members: ChurchMembersService) {}

  private token(authorization?: string) {
    const token = authorization?.replace(/^Bearer\s+/i, '').trim();
    if (!token) throw new UnauthorizedException('Bearer token is required');
    return token;
  }

  @Get('status/:status')
  listByStatus(
    @Headers('authorization') authorization: string | undefined,
    @Param('status') status: string,
    @Query('offset') offset = '0',
    @Query('limit') limit = '100',
  ) {
    const parsedOffset = Number(offset);
    const parsedLimit = Number(limit);
    return this.members.listByStatus(this.token(authorization), status.toUpperCase(), parsedOffset, parsedLimit);
  }
}
