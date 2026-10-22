import { Body, Controller, Get, Headers, Param, Post, UnauthorizedException } from '@nestjs/common';
import { FinanceService } from './finance.service';

@Controller('v1/finance')
export class FinanceController {
  constructor(private readonly finance: FinanceService) {}
  private token(a?: string) {
    const token = a?.replace(/^Bearer\\s+/i, '').trim();
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

  @Get('organizations/:organizationId/giving/funds')
  givingFunds(@Headers('authorization') a:string|undefined,@Param('organizationId') id:string){return this.finance.givingFunds(this.token(a),id);}
  @Get('organizations/:organizationId/giving/contributions')
  myGivingContributions(@Headers('authorization') a:string|undefined,@Param('organizationId') id:string){return this.finance.myGivingContributions(this.token(a),id);}
  @Post('organizations/:organizationId/giving/contributions')
  createGivingContribution(@Headers('authorization') a:string|undefined,@Param('organizationId') id:string,@Body() body:{fund_id:string;amount:number;payment_method?:string;method_id?:string;note?:string;idempotency_key?:string}){return this.finance.createGivingContribution(this.token(a),id,body);}
  @Get('organizations/:organizationId/giving/treasury')
  treasuryGivingContributions(@Headers('authorization') a:string|undefined,@Param('organizationId') id:string){return this.finance.treasuryGivingContributions(this.token(a),id);}
  @Post('organizations/:organizationId/giving/contributions/:contributionId/confirm')
  confirmGivingContribution(@Headers('authorization') a:string|undefined,@Param('organizationId') id:string,@Param('contributionId') contributionId:string){return this.finance.confirmGivingContribution(this.token(a),id,contributionId);}
  @Post('organizations/:organizationId/giving/bank-transfer')
  configureGivingBankTransfer(@Headers('authorization') a:string|undefined,@Param('organizationId') id:string,@Body() body:{bank_name:string;account_holder:string;iban:string}) {
    return this.finance.configureGivingBankTransfer(this.token(a),id,body);
  }
}
