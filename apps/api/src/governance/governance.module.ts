import { Module } from '@nestjs/common';
import { IdentityModule } from '../identity/identity.module';
import { MediaModule } from '../media/media.module';
import { GovernanceController } from './presentation/governance.controller';
import { GovernanceService } from './application/governance.service';

@Module({
 imports:[IdentityModule, MediaModule],
 controllers:[GovernanceController],
 providers:[GovernanceService],
})
export class GovernanceModule {}
