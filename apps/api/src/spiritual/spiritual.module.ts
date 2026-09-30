import { Module } from "@nestjs/common";
import { BibleController } from "./bible/bible.controller";
import { BibleService } from "./bible/bible.service";
import { DevotionService, DEVOTION_PROVIDER } from "./devotion/devotion.service";
import { GrowthService, GROWTH_REPOSITORY } from "./growth/growth.service";
import { SpiritualMinistryService, MINISTRY_DIRECTORY } from "./ministry/ministry.service";
import { PrayerService, PRAYER_REPOSITORY } from "./prayer/prayer.service";

@Module({
  controllers: [BibleController],
  providers: [
    BibleService,
    PrayerService,
    DevotionService,
    GrowthService,
    SpiritualMinistryService,
    {
      provide: PRAYER_REPOSITORY,
      useFactory: () => undefined,
    },
    {
      provide: DEVOTION_PROVIDER,
      useFactory: () => undefined,
    },
    {
      provide: GROWTH_REPOSITORY,
      useFactory: () => undefined,
    },
    {
      provide: MINISTRY_DIRECTORY,
      useFactory: () => undefined,
    },
  ],
  exports: [
    BibleService,
    PrayerService,
    DevotionService,
    GrowthService,
    SpiritualMinistryService,
  ],
})
export class SpiritualModule {}
