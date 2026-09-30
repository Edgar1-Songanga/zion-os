import { Module } from '@nestjs/common';
import { IdentityModule } from '../identity/identity.module';
import { OrganizationsController } from './presentation/organizations.controller';
import { OrganizationsService } from './application/organizations.service';
import { OrganizationUnitsController } from './presentation/organization-units.controller';
import { OrganizationUnitsService } from './application/organization-units.service';
import { MembershipsController } from './presentation/memberships.controller';
import { MembershipsService } from './application/memberships.service';

@Module({
  imports: [IdentityModule],
  controllers: [OrganizationsController, OrganizationUnitsController, MembershipsController],
  providers: [OrganizationsService, OrganizationUnitsService, MembershipsService],
})
export class OrganizationsModule {}
