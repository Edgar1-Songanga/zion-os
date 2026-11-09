-- Add explicit organization membership roles for ministry-level access.
-- These role records do not grant data access by themselves: module data remains
-- constrained by organization membership, ministry_leaders assignments and RLS.
insert into public.roles (key, name, description, is_system)
values
  ('ministry_leader', 'Ministry Leader', 'Leads an assigned church ministry within the organization.', true),
  ('department_leader', 'Department Leader', 'Leads an assigned department within the organization.', true),
  ('stewardship_manager', 'Stewardship Ministry Leader', 'Leads Christian stewardship ministry operations for an assigned ministry.', true),
  ('youth_director', 'Youth Ministry Director', 'Leads youth ministry operations within the organization.', true)
on conflict (key) do update
set name = excluded.name,
    description = excluded.description,
    is_system = true;
