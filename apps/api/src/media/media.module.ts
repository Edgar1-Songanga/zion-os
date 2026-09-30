import { Module } from '@nestjs/common';
import { ZionMeetingProvider } from './application/zion-meeting.provider';

export const MEDIA_PROVIDER = Symbol('MEDIA_PROVIDER');

@Module({
  providers: [
    ZionMeetingProvider,
    {
      provide: MEDIA_PROVIDER,
      useExisting: ZionMeetingProvider,
    },
  ],
  exports: [MEDIA_PROVIDER],
})
export class MediaModule {}
