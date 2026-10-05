import { Module } from '@nestjs/common';
import { IdentityModule } from '../identity/identity.module';
import { FinanceController } from './finance.controller';
import { FinanceService } from './finance.service';
import { StripePaymentService } from './stripe-payment.service';

@Module({
  imports: [IdentityModule],
  controllers: [FinanceController],
  providers: [FinanceService, StripePaymentService],
  exports: [FinanceService],
})
export class FinanceModule {}
