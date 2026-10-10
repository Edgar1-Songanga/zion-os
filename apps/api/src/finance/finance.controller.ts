import { Body, Controller, Get, Headers, Param, Post, UnauthorizedException } from '@nestjs/common';
import { FinanceService } from './finance.service';

@Controller('v1/finance')
export class FinanceController {
  constructor(private readonly finance: FinanceService) {}
  private token(a?: string) {
    const token = a?.replace(/^Bearer\s+/i, '').trim();
    if (!token) throw new UnauthorizedException('Bearer token is required');
    return token;
  }
  @Get('organizations/:organizationId/accounts')
  accounts(@Headers('authorization') a: string|undefined,@Param('organizationId') id:string){return this.finance.accounts(this.token(a),id);}
  @Post('organizations/:organizationId/accounts')
  createAccount(@Headers('authorization') a: string|undefined,@Param('organizationId') id:string,@Body() body:{code:string;name:string;account_type:string;currency_code?:string;parent_account_id?:string|null}){return this.finance.createAccount(this.token(a),id,body);}
  @Get('organizations/:organizationId/journal')
  journal(@Headers('authorization') a: string|undefined,@Param('organizationId') id:string){return this.finance.journal(this.token(a),id);}
  @Post('organizations/:organizationId/journal')
  createJournal(@Headers('authorization') a: string|undefined,@Param('organizationId') id:string,@Body() body:{description:string;entry_date?:string;lines:Array<{account_id:string;debit?:number;credit?:number;description?:string}>}){return this.finance.createJournal(this.token(a),id,body);}
}
