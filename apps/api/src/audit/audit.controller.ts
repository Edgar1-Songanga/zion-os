import {
  Body,
  Controller,
  Headers,
  Post,
  UnauthorizedException,
} from '@nestjs/common';
import { AuditService, CreateFrameApprovalInput } from './audit.service';

@Controller('audit')
export class AuditController {
  constructor(private readonly audit: AuditService) {}

  @Post('frame/approvals')
  async createFrameApproval(
    @Headers('authorization') authorization: string | undefined,
    @Body() body: CreateFrameApprovalInput,
  ) {
    const match = /^Bearer\s+(.+)$/i.exec(authorization ?? '');
    if (!match?.[1]) {
      throw new UnauthorizedException('A sessão ZION é obrigatória para aprovar o Frame.');
    }
    return this.audit.createFrameApproval(match[1], body);
  }
}
