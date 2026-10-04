import { Module } from '@nestjs/common';
import { IdentityModule } from '../identity/identity.module';
import { YouthController } from './youth.controller';
import { YouthService } from './youth.service';

@Module({
  imports: [IdentityModule],
  controllers: [YouthController],
  providers: [YouthService],
  exports: [YouthService],
})
export class YouthModule {}
