import { Module } from "@nestjs/common";
import { ProfileSystemService } from "./profile-system.service";
@Module({ providers: [ProfileSystemService], exports: [ProfileSystemService] })
export class ProfileSystemModule {}
