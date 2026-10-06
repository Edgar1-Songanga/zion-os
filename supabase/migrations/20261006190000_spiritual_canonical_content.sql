create table if not exists public.spiritual_sabbath_school_lessons (
  id uuid primary key default gen_random_uuid(),
  quarter text not null,
  year integer not null check (year >= 1900 and year <= 2200),
  lesson_number integer not null check (lesson_number > 0),
  title text not null,
  language text not null,
  memory_verse text,
  bible_references text[] not null default '{}',
  daily_sections jsonb not null default '[]'::jsonb,
  discussion_questions text[] not null default '{}',
  teacher_resource_url text,
  source_url text not null,
  rights text not null check (rights in ('licensed','permission_required','public_reference','unknown')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (year, quarter, lesson_number, language)
);

alter table public.spiritual_sabbath_school_lessons enable row level security;

drop policy if exists "spiritual_sabbath_school_lessons_read_authenticated" on public.spiritual_sabbath_school_lessons;
create policy "spiritual_sabbath_school_lessons_read_authenticated"
on public.spiritual_sabbath_school_lessons for select to authenticated using (true);

create table if not exists public.spiritual_adventist_canonical_content (
  id uuid primary key default gen_random_uuid(),
  type text not null check (type in ('fundamental_belief','official_statement','church_manual','three_angels_message','sabbath_school_lesson','publishing_resource')),
  title text not null,
  summary text,
  status text not null check (status in ('draft','published','archived')),
  language text not null,
  authority text not null check (authority in ('general_conference','division','union','conference','publishing_house','authorized_partner')),
  source_id text not null,
  source_url text not null,
  rights text not null check (rights in ('public_reference','licensed','permission_required','unknown')),
  bible_references text[] not null default '{}',
  tags text[] not null default '{}',
  related_content_ids uuid[] not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (source_id, language, type)
);

alter table public.spiritual_adventist_canonical_content enable row level security;

drop policy if exists "spiritual_adventist_canonical_content_read_authenticated" on public.spiritual_adventist_canonical_content;
create policy "spiritual_adventist_canonical_content_read_authenticated"
on public.spiritual_adventist_canonical_content for select to authenticated using (true);

create index if not exists spiritual_sabbath_school_lessons_lookup_idx
  on public.spiritual_sabbath_school_lessons (year desc, quarter, lesson_number, language);

create index if not exists spiritual_adventist_canonical_content_lookup_idx
  on public.spiritual_adventist_canonical_content (type, language, title);

grant select on public.spiritual_sabbath_school_lessons to authenticated;
grant select on public.spiritual_adventist_canonical_content to authenticated;
