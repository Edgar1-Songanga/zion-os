import { Module } from '@nestjs/common';
import { IdentityModule } from '../identity/identity.module';
import { OrganizationsController } from './presentation/organizations.controller';
import { OrganizationsService } from './application/organizations.service';
import { OrganizationUnitsController } from './presentation/organization-units.controller';
import { OrganizationUnitsService } from './application/organization-units.service';
import { MembershipsController } from './presentation/memberships.controller';
import { MembershipsService } from './application/memberships.service';
import { MemberServicesController } from './presentation/member-services.controller';
import { MemberServicesService } from './application/member-services.service';

@Module({
  imports: [IdentityModule],
  controllers: [OrganizationsController, OrganizationUnitsController, MembershipsController, MemberServicesController],
  providers: [OrganizationsService, OrganizationUnitsService, MembershipsService, MemberServicesService],
})
export class OrganizationsModule {}
