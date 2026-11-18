import { Module } from '@nestjs/common';
import { IdentityModule } from '../identity/identity.module';
import { SupabaseRestClient } from '../common/supabase/supabase-rest.client';
import { AuditService } from './audit.service';
import { AuditController } from './audit.controller';

@Module({
  imports: [IdentityModule],
  controllers: [AuditController],
  providers: [AuditService, SupabaseRestClient],
  exports: [AuditService],
})
export class AuditModule {}
