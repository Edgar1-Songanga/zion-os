import { Module } from '@nestjs/common';
import { IdentityModule } from '../identity/identity.module';
import { ResaEngine } from './domain/resa.engine';
import { ResaController } from './presentation/resa.controller';
import { ResaSocialService } from './application/resa-social.service';

@Module({
  imports: [IdentityModule],
  controllers: [ResaController],
  providers: [ResaEngine, ResaSocialService],
  exports: [ResaEngine, ResaSocialService],
})
export class ResaModule {}
