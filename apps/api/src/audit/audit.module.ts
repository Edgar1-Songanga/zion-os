import { Module } from '@nestjs/common';
import { IdentityModule } from '../identity/identity.module';
import { SupabaseRestClient } from '../common/supabase/supabase-rest.client';
import { AuditService } from './audit.service';

@Module({
  imports: [IdentityModule],
  providers: [AuditService, SupabaseRestClient],
  exports: [AuditService],
})
export class AuditModule {}
