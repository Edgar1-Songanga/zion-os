import { Module } from '@nestjs/common';
import { IdentityModule } from '../identity/identity.module';
import { OrganizationsController } from './presentation/organizations.controller';
import { OrganizationsService } from './application/organizations.service';
import { OrganizationUnitsController } from './presentation/organization-units.controller';
import { OrganizationUnitsService } from './application/organization-units.service';
import { MembershipsController } from './presentation/memberships.controller';
import { MembershipsService } from './application/memberships.service';
import { ChurchMembersController } from './presentation/church-members.controller';
import { ChurchMembersService } from './application/church-members.service';
import { ChurchMemberFamiliesController } from './presentation/church-member-families.controller';
import { ChurchMemberFamiliesService } from './application/church-member-families.service';

@Module({
  imports: [IdentityModule],
  controllers: [OrganizationsController, OrganizationUnitsController, MembershipsController, ChurchMembersController, ChurchMemberFamiliesController],
  providers: [OrganizationsService, OrganizationUnitsService, MembershipsService, ChurchMembersService, ChurchMemberFamiliesService],
})
export class OrganizationsModule {}
