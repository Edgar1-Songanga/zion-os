import { Module } from "@nestjs/common";
import { BibleController } from "./bible/bible.controller";
import { BibleService, BIBLE_PROVIDER } from "./bible/bible.service";
import { MidvashBibleProvider } from "./bible/midvash-bible.provider";
import { DEVOTION_PROVIDER, DevotionService } from "./devotion/devotion.service";
import { SupabaseDevotionProvider } from "./devotion/supabase-devotion.provider";
import { GROWTH_REPOSITORY, GrowthService } from "./growth/growth.service";
import { SupabaseGrowthRepository } from "./growth/supabase-growth.repository";
import { SpiritualMinistryService } from "./ministry/ministry.service";
import { PrayerService } from "./prayer/prayer.service";
import { AdventistCanonController } from "./adventist/adventist-canon.controller";
import { AdventistCanonService, ADVENTIST_CANON_REPOSITORY } from "./adventist/adventist-canon.service";
import { SupabaseAdventistCanonRepository } from "./adventist/supabase-adventist-canon.repository";
import { SabbathSchoolController } from "./adventist/sabbath-school.controller";
import { SabbathSchoolService, SABBATH_SCHOOL_REPOSITORY } from "./adventist/sabbath-school.service";
import { SupabaseSabbathSchoolRepository } from "./adventist/supabase-sabbath-school.repository";
import { MinistryController } from "./ministry/ministry.controller";
import { MINISTRY_DIRECTORY } from "./ministry/ministry.service";
import { SupabaseMinistryDirectory } from "./ministry/supabase-ministry.directory";
import { SupabaseRestClient } from "../common/supabase/supabase-rest.client";
import { SpiritualProgressController } from "./spiritual-progress.controller";
import { GamificationController } from "../gamification/gamification.controller";
import { GamificationService } from "../gamification/gamification.service";
import { ReferralController } from "../referrals/referral.controller";
import { ReferralRepository } from "../referrals/referral.repository";

@Module({
  controllers: [BibleController, AdventistCanonController, SabbathSchoolController, MinistryController, SpiritualProgressController, GamificationController, ReferralController],
  providers: [
    SupabaseRestClient,
    BibleService,
    MidvashBibleProvider,
    { provide: BIBLE_PROVIDER, useExisting: MidvashBibleProvider },
    PrayerService,
    DevotionService,
    SupabaseDevotionProvider,
    { provide: DEVOTION_PROVIDER, useExisting: SupabaseDevotionProvider },
    GrowthService,
    SupabaseGrowthRepository,
    { provide: GROWTH_REPOSITORY, useExisting: SupabaseGrowthRepository },
    SpiritualMinistryService,
    AdventistCanonService,
    SupabaseAdventistCanonRepository,
    { provide: ADVENTIST_CANON_REPOSITORY, useExisting: SupabaseAdventistCanonRepository },
    SabbathSchoolService,
    SupabaseSabbathSchoolRepository,
    { provide: SABBATH_SCHOOL_REPOSITORY, useExisting: SupabaseSabbathSchoolRepository },
    SupabaseMinistryDirectory,
    { provide: MINISTRY_DIRECTORY, useExisting: SupabaseMinistryDirectory },
    GamificationService,
    ReferralRepository,
  ],
  exports: [BibleService, PrayerService, DevotionService, GrowthService, SpiritualMinistryService, AdventistCanonService, SabbathSchoolService],
})
export class SpiritualModule {}
