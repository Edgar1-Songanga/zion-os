import { Module } from '@nestjs/common';
import { ExternalMediaProvider } from './application/external-media.provider';

export const MEDIA_PROVIDER = Symbol('MEDIA_PROVIDER');

@Module({
  providers: [
    ExternalMediaProvider,
    {
      provide: MEDIA_PROVIDER,
      useExisting: ExternalMediaProvider,
    },
  ],
  exports: [MEDIA_PROVIDER],
})
export class MediaModule {}
