import { Module } from "@nestjs/common";
import { PrayerService } from "./prayer/prayer.service";
import { DevotionService } from "./devotion/devotion.service";
import { GrowthService } from "./growth/growth.service";
import { SpiritualMinistryService } from "./ministry/ministry.service";

@Module({
  providers: [PrayerService, DevotionService, GrowthService, SpiritualMinistryService],
  exports: [PrayerService, DevotionService, GrowthService, SpiritualMinistryService],
})
export class SpiritualModule {}
