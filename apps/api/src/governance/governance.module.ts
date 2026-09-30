import { Module } from '@nestjs/common';
import { IdentityModule } from '../identity/identity.module';
import { GovernanceController } from './presentation/governance.controller';
import { GovernanceService } from './application/governance.service';

@Module({
 imports:[IdentityModule],
 controllers:[GovernanceController],
 providers:[GovernanceService],
})
export class GovernanceModule {}
