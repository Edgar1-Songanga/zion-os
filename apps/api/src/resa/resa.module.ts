import { Module } from '@nestjs/common';
import { IdentityModule } from '../identity/identity.module';
import { MediaModule } from '../media/media.module';
import { ResaEngine } from './domain/resa.engine';
import { ResaController } from './presentation/resa.controller';
import { ResaSocialService } from './application/resa-social.service';
import { ResaRecommendationService } from './application/recommendation.service';
import { ResaOperationalService } from './application/resa-operational.service';
import { ResaOperationalController } from './presentation/resa-operational.controller';

@Module({
  imports: [IdentityModule, MediaModule],
  controllers: [ResaController, ResaOperationalController],
  providers: [ResaEngine, ResaSocialService, ResaRecommendationService, ResaOperationalService],
  exports: [ResaEngine, ResaSocialService, ResaRecommendationService, ResaOperationalService],
})
export class ResaModule {}
