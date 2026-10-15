# ZION OS — Access Control and Institutional Hierarchy

## Status and scope

This document records the implementation contract for access control. Preserve the existing `organizations`, `organization_units`, `organization_memberships`, `roles`, `permissions`, and `role_permissions` model wherever it meets the requirements. Never apply a production migration without review, non-production validation, and an approved rollback path.

**Source of truth:** authenticated Supabase identity + server-side authorization + database RLS. UI visibility is not authorization.

## Verified audit findings

- Existing role keys include `member`, `moderator`, `pastor`, `secretary`, `finance_manager`, `hr_manager`, `payroll_manager`, `organization_admin`, `organization_leader`, and `organization_owner`.
- Existing permissions cover audit, church members, finance, HR, meetings, membership, organization management, payroll, RESA moderation, and voting.
- There were no active rows in `organization_memberships` for the accounts checked during the audit.
- The two existing organizations checked were both `LOCAL_CHURCH` with no parent organization.
- No dedicated global/platform role model or founder identity table was present in production at audit time.
- The main-branch sidebar displays the hard-coded name "Edgar" and `globalAdministrator`. This is a presentation defect, not proof of an actual grant.
- Founder identity/verification is handled separately in PR #53; do not treat a founder badge as authorization.
- **Security finding:** `20260930_foundation_core.sql` creates the permissive policy `memberships_insert_owner_bootstrap`. The later `20261008202205_organization_owner_role_authorization_v3.sql` adds stricter membership insert policies but does not remove the legacy policy. Because permissive PostgreSQL RLS policies are OR-combined, the old policy may bypass the newer role/status constraints for a user creating an organization. The hardening migration proposed alongside this document drops that legacy policy.
- **Hierarchy finding:** the existing `private.has_org_permission_in_hierarchy` recursive CTE used `UNION ALL` without tracking visited organizations. A malformed parent cycle could cause non-terminating recursive traversal. The proposed hardening migration makes traversal cycle-safe and blocks newly introduced parent cycles.

These are repository findings plus point-in-time production observations. The migration has not been applied to production. Re-check live policies and existing hierarchy data before rollout.

## Access layers

### 1. Public/member identity
Every authenticated account receives ordinary member access only. RESA/social access is controlled by each feature's own policy. Signup, email confirmation, profile fields, and founder status never grant administrative permissions.

### 2. Founder identity (non-authorizing)
Founder is a verified identity/status attribute, not a role. It may render a blue badge after the dedicated identity migration is reviewed and deployed. It grants no implicit access to administration, organizations, finance, HR, payroll, moderation, or user management.

### 3. Platform/global administration
A platform administrator is a separately granted, audited, high-privilege role with explicit permissions. Do not infer it from display name, email domain, founder status, account age, or frontend constants. Until a reviewed server-side grant and RLS policy exist, no account should be shown or treated as a global administrator. Prevent self-elevation and protect grant/revocation operations.

### 4. Institutional hierarchy
Reuse organization parent links for the configurable target levels: local church; association/mission; union; division; General Conference. Validate parent/child compatibility after confirming the organization's real structure, and prevent cycles. A record's declared type alone does not authorize a user.

### 5. Scoped organizational roles
An active role in Church A must not grant access to Church B. Parent-scope access may flow downward only for explicitly authorized permissions and only when the hierarchy is verified. Never infer broad parent access solely from `parent_id`.

### 6. Ministry/department permissions
Reuse existing permission keys wherever possible:
- Finance: `finance.read`, `finance.manage`
- HR: `hr.read`, `hr.manage`, `hr.contract.manage`, `hr.leave.manage`
- Payroll: `payroll.read`, `payroll.manage`, `payroll.approve`
- Membership: `membership.read`, `membership.manage`, `membership.role.assign`
- Organization: `organization.read`, `organization.manage`
- Audit: `audit.read`
- RESA moderation: `resa.moderate`

Do not silently rename keys. Finance does not imply HR/payroll; HR does not imply finance; moderation does not imply administration. Review current role-permission mappings before changing them.

## Authorization contract
Every protected API operation must validate the Supabase access token, derive the user ID from the verified token, resolve the resource scope server-side, verify an active scoped membership, check the required permission on the server, and rely on matching RLS boundaries. Deny by default on missing membership, unknown role, invalid scope, missing hierarchy, or authorization-service failure. Audit privileged changes without logging tokens or sensitive personal data.

A hidden sidebar link, route guard, email address, or client-side metadata is never sufficient authorization.

## Frontend contract
- Derive displayed identity from the authenticated session/profile.
- Render founder verification only from a deployed, RLS-readable source.
- Render platform administration only from server-validated authorization; never use a hard-coded label.
- Hide inaccessible links for usability, but still enforce API and RLS authorization.
- Normal members should enter RESA/public areas without being redirected into admin modules.
- If identity/authorization data is unavailable, display a neutral state and grant no access.

## Rollout sequence
1. Re-audit live schema, policies, API guards, membership services, and role-permission mappings.
2. Review and resolve PR #53 separately; verify its RLS grants, server contracts, and verification approval/rejection lifecycle.
3. Validate the hardening migration against a non-production database, including tests for legacy-policy removal, hierarchy cycles, existing cycles, and role/status constraints.
4. Add tests for cross-organization isolation, inactive memberships, finance-vs-HR separation, self-elevation, and parent-scope inheritance.
5. Implement shared backend authorization guards and mirror their boundaries in RLS.
6. Replace hard-coded sidebar identity/role presentation after locating and testing the existing session/profile mechanism.
7. Test with two ordinary accounts and explicitly provisioned scoped roles.
8. Require all relevant GitHub Actions checks green and run end-to-end smoke tests against correctly configured preview credentials.
9. Apply production migrations and role grants only after review, explicit approval, backup, and a verified rollback path.

## Acceptance criteria
- [ ] Existing working routes/data remain intact.
- [ ] No hard-coded person or global-admin claim in the sidebar.
- [ ] Ordinary signup grants no privileged role.
- [ ] Founder status is independent of authorization.
- [ ] Global administration is explicit, audited, server-validated, and not self-service.
- [ ] Memberships are scoped and status-checked.
- [ ] No cross-organization data access.
- [ ] No implicit finance/HR/payroll inheritance.
- [ ] Hierarchy supports intended institutional levels and rejects cycles/invalid parentage.
- [ ] Backend authorization and RLS agree.
- [ ] No production mocks/placeholders.
- [ ] CI green and end-to-end evidence recorded before declaring production readiness.

## Completion status

This branch now contains a proposed database hardening migration plus this design/audit record. Neither has been applied to production. This is not a claim of production readiness; merge/deployment must wait for CI, review, non-production migration tests, live-policy verification, and end-to-end validation.
