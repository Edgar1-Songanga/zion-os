import { Module } from '@nestjs/common';
import { IdentityModule } from '../identity/identity.module';
import { MediaModule } from '../media/media.module';
import { ResaEngine } from './domain/resa.engine';
import { ResaController } from './presentation/resa.controller';
import { ResaSocialService } from './application/resa-social.service';
import { ResaRecommendationService } from './application/recommendation.service';
import { ResaOperationalService } from './application/resa-operational.service';
import { ResaGroupMeetingService } from './application/resa-group-meeting.service';
import { ResaOperationalController } from './presentation/resa-operational.controller';
import { ResaLiveEgressService } from './application/resa-live-egress.service';
import { ResaModerationAppealsService } from './application/resa-moderation-appeals.service';
import { ResaModerationAppealsController } from './presentation/resa-moderation-appeals.controller';
import { ResaEnforcementService } from './application/resa-enforcement.service';
import { ResaEnforcementController } from './presentation/resa-enforcement.controller';
import { ResaFeedMemoryController } from './presentation/feed-memory.controller';
import { ResaFeedMemoryService } from './application/feed-memory.service';

@Module({
  imports: [IdentityModule, MediaModule],
  controllers: [ResaController, ResaOperationalController, ResaModerationAppealsController, ResaEnforcementController, ResaFeedMemoryController],
  providers: [ResaEngine, ResaSocialService, ResaRecommendationService, ResaOperationalService, ResaGroupMeetingService, ResaLiveEgressService, ResaModerationAppealsService, ResaEnforcementService, ResaFeedMemoryService],
  exports: [ResaEngine, ResaSocialService, ResaRecommendationService, ResaOperationalService, ResaGroupMeetingService, ResaLiveEgressService, ResaModerationAppealsService, ResaEnforcementService, ResaFeedMemoryService],
})
export class ResaModule {}
