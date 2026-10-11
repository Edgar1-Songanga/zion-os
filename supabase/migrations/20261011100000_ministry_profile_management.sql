-- Editable ministry profile metadata.
-- Additive and forward-only: existing ministry records and permissions are preserved.

alter table public.ministries
  add column if not exists cover_image_url text,
  add column if not exists focus_areas jsonb not null default '[]'::jsonb,
  add column if not exists age_range text,
  add column if not exists official_url text,
  add column if not exists source_label text;

comment on column public.ministries.cover_image_url is
  'Editable HTTPS cover image URL for the ministry profile; may point to approved church media.';
comment on column public.ministries.focus_areas is
  'JSON array of editable ministry focus-area labels.';
comment on column public.ministries.age_range is
  'Optional audience or age-range label displayed in the ministry profile.';
comment on column public.ministries.official_url is
  'Optional URL to the official Adventist resource for this ministry.';
comment on column public.ministries.source_label is
  'Human-readable label for the official reference URL.';

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'ministries_focus_areas_is_array'
      and conrelid = 'public.ministries'::regclass
  ) then
    alter table public.ministries
      add constraint ministries_focus_areas_is_array
      check (jsonb_typeof(focus_areas) = 'array');
  end if;
end $$;
