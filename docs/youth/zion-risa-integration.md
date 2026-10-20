# ZION OS ↔ RISA — integração do Ministério Jovem

Status: decisão de arquitetura inicial; integração técnica externa ainda depende de confirmar o produto RISA e obter os seus meios oficiais de integração.

## Decisão de produto

O ZION OS será o ponto de entrada ministerial e de gestão da igreja. O RISA será utilizado para os serviços de formação/engajamento que já lhe pertencem — por exemplo, Bible Quiz e, se confirmado como capacidade do RISA, edição e publicação dos conteúdos oficiais das classes. O membro deverá conseguir iniciar o percurso a partir do ZION OS e chegar à atividade correspondente no RISA, sem ter de descobrir sozinho onde está cada serviço.

Não se deve copiar manualmente para o ZION OS um currículo que é gerido no RISA. O ZION pode apresentar o catálogo e o estado sincronizados, mantendo uma referência à fonte de origem. Se o RISA não oferecer API/webhooks, o primeiro nível será ligação segura por URL e retorno de estado apenas quando houver um mecanismo oficial disponível; não se deve simular sincronização.

## Responsabilidade por sistema

### ZION OS — registo ministerial e governação
- Organizações, igrejas, clubes, membros e responsáveis autorizados.
- Associação do membro ao clube e ao programa.
- Permissões por organização e função; a identidade vem da sessão autenticada.
- Visão ministerial agregada, relatórios e acompanhamento do percurso.
- Registo de validações presenciais, evidências práticas e decisões dos dirigentes.
- Referências externas e identificadores do RISA, sem armazenar credenciais do RISA no browser.

### RISA — formação e engajamento que lhe forem oficialmente atribuídos
- Bible Quiz, se confirmado como serviço do RISA.
- Gestão/edição de classes, requisitos e materiais apenas se esse for o papel real do RISA.
- Avaliações e resultados que o RISA efetivamente disponibilizar.
- Fonte oficial dos conteúdos que gere, incluindo versões e respetiva proveniência.

### ZION OS + RISA — experiência integrada
- Ponto de entrada “A minha formação” no ZION OS.
- Ações contextuais: “Continuar no RISA”, “Abrir Bible Quiz” e “Ver classe”, apresentadas apenas quando o destino estiver configurado e validado.
- Associação entre a identidade ZION e a conta RISA, idealmente por SSO/OIDC; nunca presumir que um utilizador tem a mesma conta nos dois sistemas.
- Sincronização idempotente de estado e resultados através de API/webhooks oficiais, com logs e tratamento de falhas.
- Quando não houver integração de identidade, usar redirecionamento explícito e explicar que poderá ser necessário iniciar sessão no RISA.

## Regras de integridade e segurança
1. Não inventar endpoints, URLs, API keys, resultados, progresso ou conteúdo curricular.
2. Não conceder investiduras automaticamente a partir de um quiz. O progresso digital é evidência; a validação de requisitos práticos e a autorização de investidura continuam sob responsabilidade dos dirigentes competentes e das regras da Divisão local.
3. Preservar o RLS e a autorização por organização no ZION. Não confiar em IDs enviados pelo browser sem verificar a associação e a função do utilizador.
4. Minimizar os dados sincronizados. Guardar IDs externos e estados estritamente necessários; não copiar dados pessoais desnecessários.
5. Usar logs de sincronização, controlo de duplicados, retries limitados e reconciliação para falhas. Nunca expor segredos no frontend.
6. Respeitar os currículos e adaptações oficiais da Divisão local. O catálogo oficial da Conferência Geral é referência, não autorização para substituir adaptações locais.

## Contrato de integração a confirmar

Antes de ligar o ambiente real, confirmar com o responsável do RISA:
- Nome completo do produto e URL oficial (há produtos que podem partilhar a sigla).
- Proprietário/entidade administradora e ambiente de produção.
- Se disponibiliza API documentada, webhooks, OAuth/OIDC/SSO e ambiente de testes.
- Qual sistema é a fonte de verdade para classes, requisitos, especialidades, Bible Quiz, resultados e certificados.
- IDs estáveis para membros, clubes, classes e tentativas; política de consentimento e retenção.
- Permissões de integração e contacto técnico.

## Fases de entrega

1. **Descoberta e contrato** — confirmar o RISA real e os limites de dados e autoridade.
2. **Base ZION** — criar a experiência “A minha formação”, com vistas de membro e de dirigente, usando dados reais existentes; não fabricar currículo nem progresso.
3. **Ligação de navegação** — configurar destinos oficiais validados para Bible Quiz e serviços de formação.
4. **Identidade** — implementar SSO ou fluxo de associação de contas, se suportado oficialmente.
5. **Sincronização** — implementar API/webhooks, mapeamentos e logs apenas com documentação e credenciais oficiais.
6. **Validação** — testar contas de membro, instrutor e dirigente, permissões, falhas de rede, duplicados e separação entre organizações antes de declarar a integração pronta.

## Critérios de aceitação

- Um membro entra no ZION OS e encontra o percurso e as ações de formação adequadas ao seu clube.
- Bible Quiz abre o serviço oficial do RISA quando configurado; não há quiz fictício no ZION a competir com o RISA.
- Classes e requisitos são editados na fonte de verdade acordada e não divergentes em dois sistemas.
- O progresso só aparece como sincronizado quando veio de uma fonte real e verificável.
- Um instrutor só vê os participantes autorizados; um dirigente só aprova ações dentro do seu âmbito.
- Falhas de integração são visíveis e recuperáveis, sem perda silenciosa nem duplicação de resultados.
- Conteúdo, requisitos e investiduras seguem as adaptações e orientações da Divisão local.

## Referências oficiais de currículo

- Adventist Youth Ministries — Resource Manuals: https://www.gcyouthministries.org/resources/resource-manuals/
- Pathfinder Achievement Classes: https://www.gcyouthministries.org/ministries/pathfinders/achievement-classes/

Estas referências orientam o currículo; não são endpoints técnicos do RISA.
