-- Add lesson artwork/reference metadata and register the currently active weekly lesson.
-- The official lesson text remains on its source site; ZION stores metadata and a source link.
alter table public.spiritual_sabbath_school_lessons
  add column if not exists cover_image_url text,
  add column if not exists memory_verse_reference text;

insert into public.spiritual_sabbath_school_lessons (
  quarter,
  year,
  lesson_number,
  title,
  language,
  memory_verse_reference,
  bible_references,
  daily_sections,
  discussion_questions,
  source_url,
  cover_image_url,
  rights
)
values (
  'Q4',
  2026,
  3,
  'Profetas do Antigo Testamento',
  'pt',
  '2 Crónicas 20:20',
  array[
    'Tiago 5:17-18',
    '1 Reis 19:1-16',
    '1 Reis 22:1-14',
    'Êxodo 15:20',
    '2 Reis 22:11-14',
    'Jeremias 14:1-15'
  ],
  '[]'::jsonb,
  '{}'::text[],
  'https://www.sabbath.school/Lesson/Lesson?lang=1&lesson=3&quarter=4&video=csh&year=2026',
  'https://www.sabbath.school/Lesson/assets/img/lessons/2026/4/_3fb.png',
  'permission_required'
)
on conflict (year, quarter, lesson_number, language)
do update set
  title = excluded.title,
  memory_verse_reference = excluded.memory_verse_reference,
  bible_references = excluded.bible_references,
  source_url = excluded.source_url,
  cover_image_url = excluded.cover_image_url,
  rights = excluded.rights,
  updated_at = now();