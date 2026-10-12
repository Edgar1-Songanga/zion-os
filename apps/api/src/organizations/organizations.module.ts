import { Module } from '@nestjs/common';
import { IdentityModule } from '../identity/identity.module';
import { OrganizationsController } from './presentation/organizations.controller';
import { OrganizationsService } from './application/organizations.service';
import { OrganizationUnitsController } from './presentation/organization-units.controller';
import { OrganizationUnitsService } from './application/organization-units.service';
import { MembershipsController } from './presentation/memberships.controller';
import { MembershipsService } from './application/memberships.service';
import { MembershipTransferController } from './presentation/membership-transfer.controller';
import { MembershipTransferService } from './application/membership-transfer.service';

@Module({
  imports: [IdentityModule],
  controllers: [OrganizationsController, OrganizationUnitsController, MembershipsController, MembershipTransferController],
  providers: [OrganizationsService, OrganizationUnitsService, MembershipsService, MembershipTransferService],
})
export class OrganizationsModule {}
