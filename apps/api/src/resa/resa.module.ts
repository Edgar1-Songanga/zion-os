import { Module } from '@nestjs/common';
import { IdentityModule } from '../identity/identity.module';
import { MediaModule } from '../media/media.module';
import { ResaEngine } from './domain/resa.engine';
import { ResaController } from './presentation/resa.controller';
import { ResaSocialService } from './application/resa-social.service';
import { ResaRecommendationService } from './application/recommendation.service';
import { ResaOperationalService } from './application/resa-operational.service';
import { ResaOperationalController } from './presentation/resa-operational.controller';
import { ResaLiveEgressService } from './application/resa-live-egress.service';
import { ResaPersonalizedFeedService } from './application/personalized-feed.service';
import { ResaPersonalizedFeedController } from './presentation/personalized-feed.controller';
import { ResaTopicClassifierService } from './application/topic-classifier.service';

@Module({
  imports: [IdentityModule, MediaModule],
  controllers: [
    ResaController,
    ResaOperationalController,
    ResaPersonalizedFeedController,
  ],
  providers: [
    ResaEngine,
    ResaSocialService,
    ResaRecommendationService,
    ResaOperationalService,
    ResaLiveEgressService,
    ResaPersonalizedFeedService,
    ResaTopicClassifierService,
  ],
  exports: [
    ResaEngine,
    ResaSocialService,
    ResaRecommendationService,
    ResaOperationalService,
    ResaLiveEgressService,
    ResaPersonalizedFeedService,
    ResaTopicClassifierService,
  ],
})
export class ResaModule {}
