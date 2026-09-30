import { Module } from "@nestjs/common";
import { BibleController } from "./bible/bible.controller";
import { BibleService } from "./bible/bible.service";
import { DevotionService } from "./devotion/devotion.service";
import { GrowthService } from "./growth/growth.service";
import { SpiritualMinistryService } from "./ministry/ministry.service";
import { PrayerService } from "./prayer/prayer.service";

@Module({
  controllers: [BibleController],
  providers: [
    BibleService,
    PrayerService,
    DevotionService,
    GrowthService,
    SpiritualMinistryService,
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
