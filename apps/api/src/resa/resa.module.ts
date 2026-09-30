import { Module } from "@nestjs/common";
import { ResaEngine } from "./domain/resa.engine";
@Module({ providers: [ResaEngine], exports: [ResaEngine] })
export class ResaModule {}
