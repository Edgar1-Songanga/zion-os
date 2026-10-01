# RESA — Arquitetura de Software e Produto

## 1. Definição

RESA é a Social Intelligence Layer do ZION OS: uma plataforma social modular, espiritual, comunitária, institucional e profissional.

A imagem/mock-up de referência é uma representação visual do produto. A arquitetura canónica do RESA é este documento estruturado.

Princípios:
- RESA não é apenas um feed.
- RESA não duplica ZION Identity, Organizations, Notifications, Media, Security ou AI.
- Content != Feed.
- Social Graph != Identity.
- Moderation != Feed.
- Live != Messaging.
- Marketplace != núcleo social.
- Começar como modular monolith com fronteiras de domínio claras; extrair serviços apenas quando escala, isolamento ou operação justificarem.
- Todas as superfícies devem compartilhar o mesmo design system premium do ZION OS.
- Segurança, privacidade, consentimento, auditabilidade e acessibilidade são requisitos de base.

---

## 2. EXPERIENCE LAYER

### 2.1 Home / Feed
- posts de texto, imagem, vídeo, short video/reel, áudio, artigo, estudo bíblico, sermão, testemunho e oração;
- reações;
- comentários e respostas encadeadas;
- partilhas/reposts;
- citações/quote posts;
- guardar/salvar;
- ocultar;
- deixar de seguir/silenciar;
- enquetes/polls;
- perguntas/Q&A;
- menções;
- hashtags/tópicos;
- links e previews;
- anexos;
- localização opcional;
- conteúdo patrocinado/institucional somente quando existir política própria;
- controlo de audiência e visibilidade;
- rascunhos;
- publicação agendada;
- edição e histórico de edição quando aplicável.

O feed não é cronológico por definição. Deve consumir o Recommendation/Feed Engine.

### 2.2 Explore / Discovery
Descoberta de:
- pessoas;
- perfis profissionais;
- pastores;
- ministérios;
- creators;
- igrejas;
- organizações;
- comunidades;
- grupos;
- eventos;
- lives;
- vídeos curtos;
- artigos;
- estudos;
- temas/hashtags;
- oportunidades e recursos autorizados.

Inclui pesquisa global, filtros, tendências e descoberta contextual.

### 2.3 Profiles
Um ZION Identity pode expor múltiplas superfícies:
- Personal;
- Professional;
- Pastor;
- Ministry;
- Organization;
- Creator.

Perfil deve suportar:
- avatar/capa;
- bio;
- links;
- localização opcional;
- competências/experiência;
- igreja/organização/ministério;
- conteúdo;
- comunidades;
- eventos;
- lives;
- seguidores/seguindo;
- verificações;
- privacidade;
- conteúdo em destaque;
- coleções;
- atividade profissional/social conforme permissões.

### 2.4 Communities
Tipos:
- pública;
- privada;
- institucional;
- temática;
- projeto;
- família;
- juventude;
- ministério;
- departamento;
- igreja.

Cada comunidade:
- identidade;
- membros;
- papéis;
- feed;
- canais;
- chat;
- eventos;
- lives;
- biblioteca;
- recursos;
- regras;
- moderação;
- convites;
- analytics;
- notificações.

### 2.5 Stories
Camada efémera:
- imagem;
- vídeo;
- texto;
- stickers/ações;
- menções;
- links quando autorizados;
- respostas;
- reações;
- audiência;
- expiração;
- arquivo privado do autor.

### 2.6 RESA Live
Experiência pública/social:
- criar;
- agendar;
- iniciar;
- transmissão;
- áudio/vídeo;
- chat;
- perguntas;
- reações;
- moderadores;
- convidados;
- gravação;
- replay;
- clips;
- capítulos;
- descoberta;
- analytics.

Hosts:
- User;
- Pastor;
- Creator;
- Ministry;
- Department;
- Organization;
- Event.

Lifecycle:
Scheduled -> Live -> Ended -> Replay -> Derived Content.

### 2.7 Events
Evento é entidade própria:
- organizer;
- title;
- description;
- date/time;
- timezone;
- location;
- online/presencial/hybrid;
- registration;
- capacity;
- participants;
- agenda;
- community;
- live;
- content;
- reminders;
- notifications;
- attendance;
- replay/recording quando aplicável.

### 2.8 Messaging
- 1:1;
- grupos;
- canais;
- comunidades;
- anexos;
- respostas;
- reações;
- áudio;
- vídeo;
- presença;
- typing indicators;
- read state;
- mute;
- block/report;
- retenção e privacidade;
- encryption/security conforme a capacidade técnica do serviço central.

Messaging deve ser reutilizável por outros domínios do ZION OS.

### 2.9 Creator Studio
- criação;
- upload;
- edição;
- biblioteca;
- rascunhos;
- publicação;
- agendamento;
- distribuição;
- live;
- clips;
- analytics;
- audiência;
- gestão de comentários;
- gestão de conteúdo;
- permissões de equipa.

Uma peça de conteúdo pode ser distribuída, conforme autorização, para Feed + Community + Profile + Event + Live Replay + Discovery.

---

## 3. CORE ENGINES

### 3.1 Identity Integration
RESA consome:
ZION Identity -> profiles / roles / permissions / relationships.

Não criar autenticação paralela.

Suporta:
- identidade;
- multi-profile;
- verification;
- role-aware experiences;
- organization membership;
- privacy controls.

### 3.2 Social Graph Engine
Modela relações e interações:
- follows;
- connections;
- memberships;
- community participation;
- organization affiliation;
- creator subscriptions/follows;
- event participation;
- live attendance;
- content interaction;
- topic affinity;
- professional relationships.

Não confundir relação social com autorização institucional.

### 3.3 Content Engine
Entidades:
- Content;
- Post;
- MediaAsset;
- Article;
- ShortVideo;
- Audio;
- Story;
- Poll;
- Question;
- Prayer;
- Testimony;
- Sermon;
- BibleStudy;
- Comment;
- Reply;
- Reaction;
- Share/Repost;
- Quote;
- Bookmark/Save;
- Mention;
- Hashtag/Topic;
- Collection.

Content deve possuir metadados:
- author;
- profile context;
- organization;
- ministry;
- community;
- language;
- visibility;
- audience;
- content type;
- scripture references;
- topics;
- tags;
- media;
- created/updated/published;
- moderation state;
- rights/provenance quando necessário.

### 3.4 Feed Engine
Responsável por:
- candidate generation;
- eligibility;
- ranking;
- diversity;
- freshness;
- personalization;
- relationship signals;
- community signals;
- topic relevance;
- content quality/trust;
- safety filtering;
- negative feedback;
- frequency controls.

Não otimizar exclusivamente para tempo de ecrã.

### 3.5 Recommendation Engine
Entradas:
Identity + Social Graph + Content + Communities + Events + Live + Interactions + Preferences + context.

Saídas:
- feed;
- people discovery;
- community discovery;
- content discovery;
- event discovery;
- live discovery;
- creator discovery;
- connection suggestions.

Deve permitir explicabilidade básica de recomendações e controles do utilizador.

### 3.6 Search & Discovery Engine
- pessoas;
- perfis;
- posts;
- comunidades;
- eventos;
- lives;
- topics;
- hashtags;
- organizações;
- creators;
- biblioteca.

Suporta:
- full text;
- filters;
- facets;
- relevance;
- typo tolerance;
- multilingual search;
- permissions-aware results.

### 3.7 Social Intelligence Engine
Camada de inteligência sobre os sinais autorizados:
- personalization;
- discovery;
- recommendations;
- connection suggestions;
- community insights;
- creator insights;
- event insights.

Requisitos:
- data minimization;
- consent;
- privacy controls;
- purpose limitation;
- retention;
- auditability;
- no invisible surveillance.

### 3.8 Notification Integration
RESA -> ZION Notification Service ->
- in-app;
- push;
- email;
- outros canais autorizados.

Tipos:
- mention;
- reply;
- reaction;
- follow;
- invitation;
- event;
- live;
- community;
- message;
- moderation;
- system.

### 3.9 Moderation & Safety
- reports;
- blocking;
- muting;
- content restrictions;
- spam;
- abuse;
- AI-assisted moderation;
- human moderation;
- appeals;
- moderation queues;
- audit trail;
- rate limits;
- trust signals;
- age/audience controls quando aplicáveis.

Moderação deve atuar no domínio, API e dados; não apenas na UI.

### 3.10 Analytics
Separar:
- product analytics;
- creator analytics;
- community analytics;
- organization analytics;
- operational telemetry;
- moderation analytics.

Privacidade e retenção devem ser explícitas.

---

## 4. SOCIAL INTERACTION MODEL

O RESA deve tratar como primitivas de primeira classe:

User/Profile
  -> Follow
  -> Mention
  -> Tag
  -> Reaction
  -> Comment
  -> Reply
  -> Share/Repost
  -> Quote
  -> Save
  -> Hide
  -> Mute
  -> Block
  -> Report
  -> Join
  -> Attend
  -> Watch
  -> Participate
  -> Subscribe

### Mentions
- @username / @profile;
- resolução de identidade;
- permissões de menção;
- notification;
- anti-spam;
- moderation;
- audit.

### Tags / Hashtags
- hashtags normalizadas;
- aliases;
- topics;
- trending;
- related content;
- search/discovery;
- moderation;
- multilingual normalization quando possível.

Mentions e hashtags não devem ser apenas texto renderizado: devem ser entidades/índices do sistema.

---

## 5. SOCIAL GRAPH

Exemplo:

João
├── segue Maria
├── pertence à Igreja X
├── membro do Grupo Y
├── acompanha Pastor Z
├── interessa-se por Tecnologia
├── participou no Evento A
├── assistiu à Live B
├── publicou no Grupo C
├── mencionou Ana
└── guardou o conteúdo D

O grafo deve distinguir:
- explicit relationship;
- inferred affinity;
- institutional relationship;
- community membership;
- interaction signal.

Inferências nunca devem substituir permissões.

---

## 6. ORGANIZATION INTEGRATION

RESA integra:
- Church;
- Ministry;
- Institution;
- Department;
- Project;
- Community.

Cada organização pode possuir:
- page/profile;
- verified identity;
- members;
- administrators;
- content;
- events;
- lives;
- communities;
- resources;
- announcements;
- analytics.

A hierarquia institucional vem do ZION Organizations/Identity, não de uma segunda hierarquia inventada no RESA.

---

## 7. MEDIA ARCHITECTURE

Media Service centralizado:
- image processing;
- video processing;
- thumbnails;
- transcoding;
- short-video derivatives;
- audio;
- captions;
- live recording;
- replay;
- clips;
- CDN;
- object storage;
- signed URLs;
- rights metadata.

RESA não deve implementar armazenamento de media isolado.

---

## 8. DATA ARCHITECTURE

Separação conceptual:

Identity Data
Social Graph Data
Profile Data
Content Data
Interaction Data
Community Data
Messaging Data
Event Data
Live Data
Media Metadata
Notification Data
Moderation Data
Recommendation Data
Analytics Data
Audit Data

Evitar tabela monolítica de users/posts.

Todas as relações sensíveis devem ter:
- ownership;
- authorization;
- RLS quando aplicável;
- audit;
- indexes;
- lifecycle;
- retention policy.

---

## 9. SECURITY / PRIVACY

Obrigatório:
- ZION Auth/Identity;
- RBAC;
- organization-aware authorization;
- RLS;
- API authorization;
- rate limiting;
- abuse prevention;
- audit logs;
- signed media access;
- privacy settings;
- data export;
- account deletion lifecycle;
- retention policies;
- consent controls;
- moderation audit;
- secure secrets;
- observability.

---

## 10. API / MODULAR MONOLITH

Backend inicial:

resa/
├── identity
├── profiles
├── social-graph
├── content
├── interactions
├── feed
├── discovery
├── communities
├── messaging
├── stories
├── live
├── events
├── notifications
├── moderation
├── creator
├── search
├── recommendations
├── analytics
└── marketplace-adapter

Cada domínio deve possuir:
- domain types;
- application service;
- repository port;
- authorization boundary;
- API/controller;
- events;
- tests.

Infraestrutura pode começar no modular monolith + Supabase/Postgres/Storage, com filas/workers adicionados onde necessários.

---

## 11. EVENT-DRIVEN INTERNAL CONTRACT

Eventos de domínio previstos:
- content.created;
- content.published;
- content.updated;
- content.deleted;
- interaction.created;
- mention.created;
- hashtag.attached;
- follow.created;
- community.joined;
- community.left;
- event.created;
- event.registration.created;
- live.scheduled;
- live.started;
- live.ended;
- live.replay.created;
- message.created;
- moderation.reported;
- moderation.actioned;
- profile.verified.

Eventos devem ser idempotentes e rastreáveis.

---

## 12. VISUAL / UX CONTRACT

O mock-up apresentado passa a ser referência visual do RESA.

Características obrigatórias:
- premium;
- tecnológico;
- espiritual sem aparência infantil;
- institucional sem parecer burocrático;
- glassmorphism controlado;
- profundidade;
- iluminação ambiente;
- fundos dinâmicos;
- cards refinados;
- iconografia consistente;
- hierarquia tipográfica forte;
- microinterações;
- estados de loading/empty/error;
- responsive mobile/tablet/desktop;
- acessibilidade;
- dark/light themes quando suportados pelo ZION design system.

A interface deve transmitir:
"uma plataforma social de próxima geração dentro de um sistema operativo digital", e não "uma página com feed".

Superfícies principais:
- Home;
- Explore;
- Communities;
- Live;
- Events;
- Messages;
- Notifications;
- Library;
- Marketplace/Services;
- Profile;
- Creator Studio;
- Settings.

---

## 13. CONTENT CREATION EXPERIENCE

Composer unificado:
- Text;
- Photo;
- Video;
- Short Video;
- Audio;
- Story;
- Poll;
- Question;
- Prayer;
- Testimony;
- Sermon;
- Bible Study;
- Article.

Composer deve permitir:
- audience;
- community;
- organization;
- language;
- topics;
- hashtags;
- mentions;
- scripture references;
- location opcional;
- scheduling;
- drafts;
- accessibility metadata;
- alt text;
- captions;
- moderation pre-check;
- preview.

---

## 14. SEARCH / DISCOVERY SURFACES

Pesquisar por:
- people;
- profiles;
- organizations;
- communities;
- posts;
- videos;
- live;
- events;
- topics;
- hashtags;
- ministries;
- sermons;
- studies;
- resources.

Resultados devem respeitar:
- visibility;
- blocking;
- organization permissions;
- moderation state;
- user privacy.

---

## 15. CROSS-ZION INTEGRATION

RESA pode consumir:
- Identity;
- Organizations;
- Media;
- Notifications;
- AI;
- Analytics;
- Bible;
- Spiritual;
- Ministry;
- Education;
- Projects;
- Meetings;
- Payments;
- Marketplace.

Exemplos:
Bible passage -> RESA post -> Community discussion -> Live study -> Replay -> Clips -> Feed -> Study history.

Event -> Community -> Live -> Recording -> Content -> Notifications.

Profile -> Professional identity -> Organization -> Community -> Events -> Content.

---

## 16. ADVENTIST SPIRITUAL CONTEXT

O RESA mantém a identidade Adventista do ZION OS.

Conteúdo canónico Adventista deve distinguir:
- 28 Fundamental Beliefs;
- official statements;
- Church Manual;
- Three Angels' Messages;
- Sabbath School;
- authorized publishing resources.

Canonical content != user commentary.

Conteúdo canónico deve preservar:
- source;
- authority;
- edition/version;
- language;
- rights/licensing;
- provenance.

---

## 17. ADMIN / OPERATIONS

RESA Admin:
- users;
- profiles;
- communities;
- organizations;
- content;
- reports;
- moderation queues;
- verification;
- live operations;
- events;
- notifications;
- search;
- analytics;
- feature flags;
- audit;
- policy configuration.

Não expor funções administrativas apenas por esconder botões na UI.

---

## 18. OBSERVABILITY / OPERATIONS

Monitorizar:
- API latency;
- feed latency;
- recommendation latency;
- message delivery;
- live connection health;
- media processing;
- queue depth;
- error rates;
- moderation backlog;
- search latency;
- notification delivery;
- storage;
- database health.

Logs devem ser estruturados e correlation/request IDs devem atravessar serviços.

---

## 19. EVOLUTION MODEL

Não existe "feature para depois" no desenho do RESA.

Todas as capacidades acima fazem parte do modelo-alvo desde já.

Implementação pode ser incremental sem alterar o contrato arquitectural:

Foundation:
Identity + Profiles + Social Graph + Content + Interactions + Feed + Communities + Notifications + Moderation + Search.

Experience expansion:
Messaging + Stories + Events + Live + Creator Studio.

Intelligence:
Recommendation + Discovery + Social Intelligence + AI.

Ecosystem:
Cross-ZION + Marketplace + Services + advanced analytics.

A ordem é de implementação/ativação, não de definição arquitectural.

---

## 20. TARGET MODULE MAP

ZION OS
└── RESA
    ├── Experience
    │   ├── Home / Feed
    │   ├── Explore
    │   ├── Profiles
    │   ├── Communities
    │   ├── Stories
    │   ├── Live
    │   ├── Events
    │   ├── Messages
    │   ├── Notifications
    │   ├── Library
    │   ├── Creator Studio
    │   └── Services / Marketplace
    │
    ├── Core
    │   ├── Identity Integration
    │   ├── Profiles
    │   ├── Social Graph
    │   ├── Content
    │   ├── Interactions
    │   ├── Communities
    │   ├── Messaging
    │   ├── Stories
    │   ├── Events
    │   ├── Live
    │   ├── Notifications
    │   ├── Moderation
    │   ├── Search
    │   └── Analytics
    │
    ├── Intelligence
    │   ├── Feed Engine
    │   ├── Recommendation Engine
    │   ├── Discovery Engine
    │   ├── Social Intelligence
    │   └── AI Assistant
    │
    ├── Platform Integration
    │   ├── ZION Identity
    │   ├── Organizations
    │   ├── Media
    │   ├── Notifications
    │   ├── Security
    │   ├── Analytics
    │   ├── AI
    │   ├── Spiritual
    │   ├── Ministry
    │   ├── Education
    │   ├── Meetings
    │   ├── Payments
    │   └── Marketplace
    │
    └── Governance
        ├── Privacy
        ├── Safety
        ├── Moderation
        ├── Audit
        ├── Rights / Licensing
        └── Observability
