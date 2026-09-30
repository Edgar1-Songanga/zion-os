import { Module } from "@nestjs/common";
import { PlatformEngine } from "./platform.engine";
@Module({ providers: [PlatformEngine], exports: [PlatformEngine] })
export class PlatformModule {}
