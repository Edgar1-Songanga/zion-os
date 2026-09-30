import { Module } from '@nestjs/common';
import { IdentityController } from './presentation/identity.controller';
import { ProfileController } from './presentation/profile.controller';
import { IdentityService } from './application/identity.service';
import { ProfileService } from './application/profile.service';

@Module({
  controllers: [IdentityController, ProfileController],
  providers: [IdentityService, ProfileService],
  exports: [IdentityService],
})
export class IdentityModule {}
