# ZION OS — Access Control and Institutional Hierarchy

## Status and scope

This document records the implementation contract for the next access-control block. It is deliberately additive: preserve existing working modules and the existing `organizations`, `organization_units`, `organization_memberships`, `roles`, `permissions`, and `role_permissions` model. Do not run a production migration as part of this design-only change.

**Source of truth:** authenticated Supabase identity + server-side authorization + database RLS. UI visibility is not authorization.

## Current production facts verified during the audit

- Existing role keys include `member`, `moderator`, `pastor`, `secretary`, `finance_manager`, `hr_manager`, `payroll_manager`, `organization_admin`, `organization_leader`, and `organization_owner`.
- Existing permissions cover audit, church members, finance, HR, meetings, membership, organization management, payroll, RESA moderation, and voting.
- There were no active rows in `organization_memberships` for the accounts checked during the audit.
- The two existing organizations checked were both `LOCAL_CHURCH` with no parent organization.
- No dedicated global/platform role model or founder identity table was present in production at audit time.
- The current main-branch sidebar displays a hard-coded name ("Edgar") and `globalAdministrator` label. This is a presentation defect, not proof of an actual grant. It must not be treated as an authorization source.
- The founder identity/verification proposal is in a separate, still-unmerged PR #53. Keep identity verification separate from role assignment and do not apply that migration implicitly.

These findings are a point-in-time audit; re-run read-only checks before any migration or access grant.

## Access layers

### 1. Public/member identity

Every authenticated account receives ordinary member access only. A member may use public RESA/social features according to each feature's own policy. Account creation, email confirmation, profile fields, and a founder badge must never grant administrative permissions.

### 2. Founder identity (non-authorizing)

Founder is a verified identity/status attribute, not a role. It may render a verified blue badge after the dedicated identity migration is reviewed and deployed. It grants no implicit access to administration, organizations, finance, HR, payroll, moderation, or user management.

### 3. Platform/global administration

A platform administrator is a separately granted, audited, high-privilege role with explicitly enumerated permissions. Do not infer this role from display name, email domain, founder status, account age, or frontend constants. Until a reviewed server-side grant and RLS policy exist, no account should be shown or treated as a global administrator.

Any grant/revocation must be an explicit, auditable administrative operation; prevent self-elevation and protect the grant path with database and API authorization.

### 4. Institutional hierarchy

Represent the actual institution tree with the existing organization records and parent links; do not invent a parallel hierarchy table unless a schema audit proves the existing model cannot express the requirements.

Target configurable organization types:
- Local church
- Association / Mission
- Union
- Division
- General Conference

Names and legal structure should be configurable because terminology and boundaries can vary. Enforce parent/child type compatibility in a reviewed database constraint/trigger or domain service, and prevent cycles. A record's declared type alone does not authorize a user.

### 5. Scoped organizational roles

Existing role assignments must be scoped to a specific organization (or organization unit) and have a clear status and lifecycle. An active role in Church A must not grant access to Church B. Parent-scope access may flow downward only for explicitly authorized roles/permissions and only when the hierarchy is verified. Never infer broad parent-level access merely because `parent_id` exists.

### 6. Ministry/department permissions

Use least privilege and existing permission keys wherever they fit:
- Finance: `finance.read`, `finance.manage`
- HR: `hr.read`, `hr.manage`, `hr.contract.manage`, `hr.leave.manage`
- Payroll: `payroll.read`, `payroll.manage`, `payroll.approve`
- Membership: `membership.read`, `membership.manage`, `membership.role.assign`
- Organization: `organization.read`, `organization.manage`
- Audit: `audit.read`
- RESA moderation: `resa.moderate`

Do not silently rename existing permission keys. Finance does not imply HR/payroll; HR does not imply finance; moderation does not imply administrative access. Review current role-to-permission assignments before changing them.

## Authorization decision contract

Every protected API operation must:
1. Validate the Supabase access token and resolve the authenticated user ID from the verified token, never from a caller-supplied user ID.
2. Resolve the requested resource's organization/unit scope from server-side data.
3. Confirm an active membership/role assignment in that scope.
4. Check the required permission key on the server.
5. Apply hierarchy inheritance only when explicitly allowed for that permission and relationship.
6. Let RLS enforce equivalent row-level restrictions for direct database access.
7. Deny by default on missing membership, unknown role, malformed scope, missing hierarchy, or authorization-service failure.
8. Emit audit events for role grants/revocations and privileged operations without logging tokens or sensitive personal data.

A hidden sidebar link, route guard, email address, or client-side metadata is never sufficient authorization.

## Sidebar and frontend contract

- Derive the displayed user's name and identity state from the authenticated session/profile.
- Render founder verification as a separate identity badge only after its backing source is deployed and readable under RLS.
- Render platform administration only from a server-validated authorization response; do not use a hard-coded label.
- Hide or disable links the user cannot access, but still enforce authorization on every API endpoint and RLS-protected query.
- A normal member should enter RESA/public areas without being redirected into admin modules.
- Avoid fake roles or fallback administrator identities. If identity/authorization data is unavailable, display a neutral loading/ordinary-member state and do not grant access.

## Migration and rollout sequence

1. Re-audit the current `main` schema, all policies, API guards, membership services, and role/permission mappings. Confirm current production state read-only.
2. Review and resolve PR #53 separately; verify its RLS grants, server contracts, and pending verification workflow. Do not merge it as a substitute for access control.
3. Write tests for membership isolation, inactive memberships, cross-organization access, hierarchy traversal/cycles, finance-vs-HR isolation, and attempts at self-elevation.
4. Add only the smallest migration needed to fill verified gaps. Prefer existing tables and keys. Include rollback notes and test the migration against a non-production database first.
5. Implement shared backend authorization guards/services and use them consistently; mirror the access boundaries in Supabase RLS.
6. Replace hard-coded sidebar identity/role presentation using the existing authenticated profile/session mechanism after locating and testing that mechanism.
7. Test with two ordinary accounts and explicitly provisioned scoped roles. Confirm one account cannot read or mutate the other's organization data.
8. Require all relevant GitHub Actions checks green; deploy previews and run end-to-end smoke tests against correctly configured preview credentials.
9. Apply production migration and production role grants only after review, explicit approval, and a verified backup/rollback path.

## Required acceptance criteria

- [ ] Existing working routes and data remain intact.
- [ ] No hard-coded person or global-admin claim in the sidebar.
- [ ] Ordinary signup grants no privileged role.
- [ ] Founder status is independent of authorization.
- [ ] Global administration is explicit, audited, server-validated, and not self-service.
- [ ] All organization memberships are scoped and status-checked.
- [ ] No cross-organization data access.
- [ ] No implicit finance/HR/payroll privilege inheritance.
- [ ] Hierarchy supports the intended institutional levels and rejects cycles/invalid parentage.
- [ ] RLS and backend authorization agree.
- [ ] No mock data or placeholder access results in production.
- [ ] CI green and end-to-end evidence recorded before declaring production readiness.

## Current completion status

This document defines the safe target and sequence. It does **not** claim that the access model has already been implemented, that production has been migrated, or that the application is production-ready. Those claims require code changes, tests, CI, preview validation, and a separately approved production rollout.
