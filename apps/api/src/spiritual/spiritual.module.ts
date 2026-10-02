import { Module } from "@nestjs/common";
import { BibleController } from "./bible/bible.controller";
import { BibleService } from "./bible/bible.service";
import { DevotionService } from "./devotion/devotion.service";
import { GrowthService } from "./growth/growth.service";
import { SpiritualMinistryService } from "./ministry/ministry.service";
import { PrayerService } from "./prayer/prayer.service";
import { AdventistCanonController } from "./adventist/adventist-canon.controller";
import { AdventistCanonService } from "./adventist/adventist-canon.service";
import { SabbathSchoolController } from "./adventist/sabbath-school.controller";
import { SabbathSchoolService } from "./adventist/sabbath-school.service";
import { MinistryController } from "./ministry/ministry.controller";
import { MINISTRY_DIRECTORY } from "./ministry/ministry.service";
import { SupabaseMinistryDirectory } from "./ministry/supabase-ministry.directory";

@Module({
  controllers: [
    BibleController,
    AdventistCanonController,
    SabbathSchoolController,
    MinistryController,
  ],
  providers: [
    BibleService,
    PrayerService,
    DevotionService,
    GrowthService,
    SpiritualMinistryService,
    AdventistCanonService,
    SabbathSchoolService,
    SupabaseMinistryDirectory,
    { provide: MINISTRY_DIRECTORY, useExisting: SupabaseMinistryDirectory },
  ],
  exports: [
    BibleService,
    PrayerService,
    DevotionService,
    GrowthService,
    SpiritualMinistryService,
    AdventistCanonService,
    SabbathSchoolService,
  ],
})
export class SpiritualModule {}
