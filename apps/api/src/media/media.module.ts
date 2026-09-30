import { Module } from '@nestjs/common';
import { env } from '../config/env';
import { ZionMeetingProvider } from './application/zion-meeting.provider';
import { ZionSfuProvider } from './application/zion-sfu.provider';

export const MEDIA_PROVIDER = Symbol('MEDIA_PROVIDER');

@Module({
  providers: [
    ZionMeetingProvider,
    ZionSfuProvider,
    {
      provide: MEDIA_PROVIDER,
      inject: [ZionMeetingProvider, ZionSfuProvider],
      useFactory: (nativeProvider: ZionMeetingProvider, sfuProvider: ZionSfuProvider) =>
        env.sfuUrl ? sfuProvider : nativeProvider,
    },
  ],
  exports: [MEDIA_PROVIDER],
})
export class MediaModule {}
