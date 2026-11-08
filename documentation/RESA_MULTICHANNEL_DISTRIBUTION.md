# RESA — Publicação Multicanal (Cross-platform Publishing)

> Estado: **planeado / arquitetura aprovada para implementação faseada**. Este documento não afirma que as integrações externas já estejam implementadas ou aprovadas pelos fornecedores.

## Objetivo

Permitir que uma pessoa, creator, ministério ou organização crie uma publicação uma única vez no RESA (ou numa superfície autorizada do ZION) e escolha distribuí-la para os seus próprios canais externos, começando por YouTube e TikTok.

O RESA continua a ser a origem social canónica. O ZION administrativo pode preparar e publicar conteúdo institucional em nome de uma organização, mas deve reutilizar o mesmo Content Engine e as mesmas regras de autorização do RESA; não deve criar um segundo motor de publicações.

## Experiência pretendida

1. O utilizador cria um post, vídeo ou imagem no RESA / superfície institucional autorizada.
2. Seleciona destinos ligados (RESA, YouTube, TikTok).
3. Vê uma pré-visualização específica por destino: formato, texto, título, descrição, privacidade, duração e possíveis limitações.
4. Aprova explicitamente a distribuição para cada destino.
5. O conteúdo é colocado numa fila de publicação com estado individual por destino.
6. O painel mostra publicado, em processamento, requer ação, agendado ou falhou, com opção segura de repetir apenas o destino falhado.

A distribuição automática deve ser uma preferência explícita por conta ou por publicação. Nunca publicar externamente conteúdo privado, limitado a seguidores, de comunidade fechada, efémero ou restrito sem uma regra de audiência equivalente e consentimento específico.

## Arquitetura proposta

### Domínios

- **Content Engine**: fonte original, autor, perfil/organização, media, direitos, idioma, audiência e estado de moderação.
- **Connected Accounts**: ligações OAuth por utilizador/organização, scopes concedidos, expiração e revogação.
- **Distribution Planner**: regras por destino, adaptação de formato e pré-visualização.
- **Distribution Outbox**: registo transacional de tarefas a publicar, criado junto com o evento de conteúdo publicado.
- **Platform Adapters**: adaptadores isolados para YouTube, TikTok e futuros destinos.
- **Worker / Queue**: execução assíncrona, retries com backoff, rate limits e dead-letter handling.
- **Publication Receipts**: IDs remotos, URLs, timestamps, estado, erros normalizados e auditoria.
- **Creator Studio**: painel para ligar contas, definir preferências, pré-visualizar, agendar e acompanhar resultados.

### Fluxo idempotente

Evento interno `content.published` -> validar autorização/audiência/direitos -> criar tarefas únicas por `content_id + destination_account_id + destination` -> worker obtém token válido -> adapta metadados/media -> chama API oficial -> consulta estado remoto quando aplicável -> guarda receipt.

Retries nunca podem criar duplicados: usar chave de idempotência interna, estado persistido e reconciliação com o identificador remoto antes de repetir operações incertas.

### Dados conceptuais (não executar como migração sem revisão)

- `resa_connected_accounts`: owner, provider, provider_account_id, display_name, encrypted_tokens, scopes, expires_at, status, connected_at, revoked_at.
- `resa_distribution_preferences`: owner/profile, provider, auto_publish_enabled, default_privacy, content_type_rules.
- `resa_distribution_jobs`: content_id, destination_account_id, provider, status, scheduled_at, attempts, idempotency_key, remote_publish_id, remote_url, last_error_code, timestamps.
- `resa_distribution_events`: auditoria de consentimento, início, upload, sucesso, falha, retry e revogação.

Tokens OAuth devem ser cifrados no servidor, nunca devolvidos ao browser, nunca escritos em logs e eliminados/revogados quando o utilizador desligar a conta. Aplicar RLS, autorização server-side, retenção e auditoria. Não usar service-role no cliente.

## Adaptadores iniciais

### YouTube

- YouTube Data API v3, OAuth 2.0 com scope mínimo `youtube.upload`.
- Upload através de `videos.insert`, com metadados e estado de privacidade escolhidos pelo utilizador.
- Suportar upload resumível, acompanhamento de processamento, limites de quota e erros recuperáveis.
- Tratar Shorts como vídeo vertical elegível; não prometer uma classificação automática garantida como Short.
- Rever quota e verificação do projeto Google antes de abrir a funcionalidade a todos.

Referência: https://developers.google.com/youtube/v3/docs/videos/insert

### TikTok

- TikTok Content Posting API, OAuth e scope `video.publish` (e permissões próprias para outros modos).
- Consultar creator info antes de apresentar opções de publicação; respeitar privacidade e limites indicados pela API.
- Implementar Direct Post apenas depois de aprovação do scope e auditoria do cliente. Clientes não auditados podem ficar limitados a publicações privadas.
- Disponibilizar modo de upload para revisão no TikTok quando o Direct Post não estiver autorizado.
- O utilizador deve ver o conteúdo e confirmar o envio; respeitar as UX guidelines e políticas de branded content.
- Não inserir marca de água/logótipo promocional do RESA no vídeo enviado ao TikTok.
- Não marcar conteúdo como gerado por IA, salvo quando realmente aplicável e exigido; não falsificar proveniência.

Referências:
- https://developers.tiktok.com/docs/en/content-posting-api-get-started
- https://developers.tiktok.com/docs/en/content-posting-api-reference-direct-post
- https://developers.tiktok.com/docs/en/content-sharing-guidelines

## Regras de produto e segurança

- OAuth oficial; nunca recolher passwords externas.
- Consentimento claro por conta e por publicação; revogação imediata.
- Destinos pertencem ao utilizador ou à organização autorizada; validar papel e mandato.
- Direitos de autor, música/licenças, imagem de terceiros e branded content devem ser considerados por destino.
- Não contornar limites, auditorias, políticas ou mecanismos anti-spam das plataformas.
- Conteúdo eliminado no RESA não deve ser apagado automaticamente fora sem política explícita; definir sincronização de remoção como opção separada.
- Métricas externas apenas através de endpoints oficialmente permitidos e com disclosure.
- Sem scraping, automação de browser ou armazenamento de passwords.
- Não replicar mensagens privadas, Stories, Lives privadas ou conteúdo de comunidades fechadas.

## Fases de implementação

1. **Foundation**: connected accounts, OAuth seguro, gestão de tokens, outbox, jobs, estados e auditoria.
2. **YouTube vertical video**: upload privado/não listado de teste, processamento, publicação com escolha de privacidade e reconciliação.
3. **TikTok**: onboarding OAuth, creator info, upload draft; depois Direct Post quando auditoria e scopes estiverem aprovados.
4. **Creator Studio**: seleção de destinos, pré-visualização, calendário, fila e histórico.
5. **Expansão**: fotos, formatos adicionais, métricas e outros destinos, apenas após validação das APIs e procura dos utilizadores.

## Critérios de aceitação

- Uma publicação RESA continua disponível no RESA mesmo que um destino externo falhe.
- Um erro no TikTok não bloqueia o YouTube nem a publicação original.
- O utilizador vê claramente qual destino publicou e qual requer ação.
- Revogar OAuth impede novos envios.
- Nenhum conteúdo restrito é exportado por omissão.
- Retries são idempotentes e auditáveis.
- Tokens, URLs privadas e dados sensíveis não aparecem em logs.
- Testes cobrem scopes ausentes, token expirado, rate limit, timeout, duplicação, revogação, conteúdo privado e falhas parciais.

## Relação com RESA Live

Gravações e clips de RESA Live podem tornar-se conteúdo derivado elegível para distribuição, mas apenas depois de:
- gravação persistida e processada pelo Media Service;
- consentimento dos participantes e direitos de utilização confirmados;
- seleção/edição do clip pelo anfitrião;
- aprovação explícita dos destinos e metadados.

Não transmitir automaticamente uma live privada ou uma gravação integral para redes externas.

## Decisão de arquitetura

Implementar como domínio de distribuição dentro do RESA Creator Studio, com adaptadores independentes e fila assíncrona. Não acoplar a lógica de YouTube/TikTok ao endpoint de criação de posts nem duplicar conteúdo/identidades entre ZION e RESA.
