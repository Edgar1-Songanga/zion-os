import { Module } from '@nestjs/common';
import { IdentityController } from './presentation/identity.controller';
import { ProfileController } from './presentation/profile.controller';
import { IdentityService } from './application/identity.service';
import { ProfileService } from './application/profile.service';
import { VerificationController } from './presentation/verification.controller';
import { VerificationService } from './application/verification.service';

@Module({
  controllers: [IdentityController, ProfileController, VerificationController],
  providers: [IdentityService, ProfileService, VerificationService],
  exports: [IdentityService],
})
export class IdentityModule {}
