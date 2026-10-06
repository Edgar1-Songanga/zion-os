insert into public.spiritual_sabbath_school_lessons
  (quarter, year, lesson_number, title, language, memory_verse, bible_references, daily_sections, discussion_questions, teacher_resource_url, source_url, rights)
values
  (
    'Q3',
    2026,
    13,
    'Graça, amor e comunhão',
    'pt',
    '2 Coríntios 13:13',
    array[
      '2 Coríntios 8:9',
      '2 Coríntios 13:11-13',
      'Romanos 16:20',
      '1 João 4:8-11',
      'Filipenses 2:1-2',
      'Gálatas 4:4-6'
    ],
    '[
      {"day":"Sábado","focus":"Encerramento de 2 Coríntios","summary":"Estudo orientado para a relação entre graça, amor, comunhão cristã e maturidade da igreja."},
      {"day":"Domingo","focus":"Alegria e restauração","summary":"Reflexão original do ZION sobre como reconciliação, encorajamento e vida comunitária fortalecem a missão."},
      {"day":"Segunda-feira","focus":"A graça de Cristo","summary":"Exploração bíblica do princípio de graça e da entrega de Cristo, usando as referências indicadas."},
      {"day":"Terça-feira","focus":"Amor que transforma","summary":"Aplicação prática do amor cristão nas relações, no serviço e no testemunho."},
      {"day":"Quarta-feira","focus":"Comunhão e unidade","summary":"Estudo sobre comunhão, unidade e responsabilidade mútua dentro da comunidade de fé."},
      {"day":"Quinta-feira","focus":"Vida e missão","summary":"Ligação entre crescimento espiritual, caráter cristão e missão no mundo."},
      {"day":"Sexta-feira","focus":"Síntese e preparação","summary":"Revisão das ideias principais e preparação para o próximo ciclo de estudo."}
    ]'::jsonb,
    array[
      'Como a graça de Cristo deve aparecer nas relações da igreja?',
      'Que atitudes práticas fortalecem a comunhão sem apagar as diferenças?',
      'Como transformar o estudo bíblico desta semana em serviço e missão?'
    ],
    null,
    'https://esd.adventist.org/2026/09/19/urok-13-19-25-sentyabrya-blagodat-lyubov-i-obshhenie/',
    'public_reference'
  )
on conflict (year, quarter, lesson_number, language) do update
set title = excluded.title,
    memory_verse = excluded.memory_verse,
    bible_references = excluded.bible_references,
    daily_sections = excluded.daily_sections,
    discussion_questions = excluded.discussion_questions,
    teacher_resource_url = excluded.teacher_resource_url,
    source_url = excluded.source_url,
    rights = excluded.rights,
    updated_at = now();
