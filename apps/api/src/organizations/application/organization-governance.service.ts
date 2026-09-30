export interface OrganizationUnitRef { id: string; organizationId: string; parentId?: string; name: string; type: string; }
export interface OrganizationMembershipRef { userId: string; organizationId: string; unitIds: string[]; roleIds: string[]; status: "active" | "invited" | "suspended"; }
export class OrganizationGovernanceService {
  validateHierarchy(units: OrganizationUnitRef[]) {
    const ids = new Set(units.map((u) => u.id));
    for (const unit of units) if (unit.parentId && !ids.has(unit.parentId)) throw new Error("Organization unit parent does not exist.");
    return true;
  }
  canOperate(membership: OrganizationMembershipRef) { return membership.status === "active"; }
}
