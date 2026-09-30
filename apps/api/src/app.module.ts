import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AuditModule } from './audit/audit.module';
import { GovernanceModule } from './governance/governance.module';
import { IdentityModule } from './identity/identity.module';
import { OrganizationsModule } from './organizations/organizations.module';
import { PlatformModule } from './platform/platform.module';
import { UsersModule } from './users/users.module';

@Module({
  imports: [
    PlatformModule,
    IdentityModule,
    OrganizationsModule,
    GovernanceModule,
    AuditModule,
    UsersModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
