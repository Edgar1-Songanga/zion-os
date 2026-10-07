import { Module } from '@nestjs/common';
import { HrPayrollController } from './hr-payroll.controller';
import { HrPayrollService } from './hr-payroll.service';
import { IdentityModule } from '../identity/identity.module';

@Module({
  imports: [IdentityModule],
  controllers: [HrPayrollController],
  providers: [HrPayrollService],
})
export class HrPayrollModule {}
