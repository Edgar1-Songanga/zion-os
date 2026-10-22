# Auditoria e arquitetura — Administração Eclesiástica Zion OS

**Data:** 2026-10-13  
**Base auditada:** `main` em `933b0ade3ec87b9ea80c5559618be77ea1f171db`  
**Estado:** documento de auditoria; não altera dados de produção nem substitui módulos existentes.

## 1. Objetivo

Integrar a administração da Igreja Adventista no Zion OS como uma camada institucional que reutiliza identidade, organizações, permissões, membros, ministérios, actividades, auditoria e relatórios existentes. O resultado deve servir a igreja local e a estrutura organizacional acima dela, com hierarquia configurável, sem presumir que todas as regiões usam exactamente os mesmos nomes ou níveis.

A estrutura deve suportar, quando aplicável:

- Igreja local
- Distrito
- Missão ou Conferência
- União
- Divisão
- Conferência Geral

Missão e Conferência devem ser representáveis como tipos organizacionais configuráveis, sem obrigar a mesma sequência em todos os países.

## 2. Princípios não negociáveis

1. **Preservar e integrar:** não substituir Ministério Jovem, Escola Sabatina, RESA, membros, organizações, finanças ou outros módulos existentes.
2. **Uma conta por pessoa:** a conta normal do Zion é a identidade de autenticação. As funções eclesiásticas são vínculos e permissões institucionais no âmbito de uma organização, não contas duplicadas.
3. **Acesso por âmbito:** uma pessoa só pode ver ou alterar dados da organização e dos departamentos para os quais tem autorização. A função numa igreja local não concede automaticamente acesso administrativo à Conferência, União ou Divisão.
4. **Registo operacional primeiro:** actividades, presenças, reuniões, visitas, ofertas e outros dados são registados no fluxo diário ou semanal. Os relatórios são compilados a partir desses registos.
5. **Não inventar dados:** campos em falta devem ser assinalados como incompletos, pendentes ou não aplicáveis. Não preencher métricas desconhecidas com valores presumidos.
6. **Rastreabilidade:** preservar autor, data, alterações, validação, aprovação, submissão, devolução e versão do relatório.
7. **Relatórios históricos imutáveis:** depois de aprovado/submetido, o relatório deve preservar um snapshot dos valores enviados. Correcções posteriores geram uma nova versão ou uma correcção rastreável.
8. **Políticas configuráveis:** formulários, períodos, indicadores, destinatários e prazos variam conforme o departamento e a entidade organizacional; não codificar uma única política global rígida.

## 3. Estado observado no repositório e na base de dados

### Componentes já existentes a reutilizar

- `organizations`: organizações com `organization_type` e `parent_id`, base para a hierarquia.
- `organization_units`: unidades/departamentos dentro de uma organização.
- `organization_memberships` e `unit_memberships`: vínculo de utilizadores a organizações e unidades, com funções.
- `ministries`, `ministry_leaders`, `ministry_members`, `ministry_programs` e `ministry_reports`: base de dados ministerial.
- `youth_clubs`, actividades, participantes, progressão e função de relatório operacional do Ministério Jovem.
- `audit_logs`: registo de acções administrativas.
- Páginas existentes de administração, ministérios, organizações e relatórios.

### Lacunas verificadas

- A página `/reports` recolhe dados de ministérios e do relatório operacional do Ministério Jovem. A actualização periódica de 60 segundos só acontece enquanto a página está aberta; isso não é uma compilação agendada no servidor.
- A página de relatórios apresenta dados existentes e permite imprimir/guardar PDF, mas declara explicitamente que a submissão hierárquica ainda não está implementada/confirmada.
- O modelo actual de `ministry_reports` é mínimo: título, estado, data de submissão e autor. Não contém um modelo geral de períodos, campos/indicadores, snapshot, revisões, validações, destinatários ou cadeia de aprovação.
- Na inspecção das políticas RLS de produção, `ministry_reports` tinha uma política de leitura para membros da organização; não apareceram políticas de escrita correspondentes no resultado consultado. As tabelas de programas também mostraram leitura, sem políticas de escrita no conjunto consultado. Confirmar privilégios e fluxos antes de activar submissões.
- As rotas de organizações e ministérios existentes não demonstram, por si só, uma experiência completa de secretaria e relatório institucional. A autorização final deve ser imposta pela base de dados/RLS e não apenas pela interface.

### Migrações — bloqueio de segurança

O inventário consultado encontrou **56 ficheiros SQL locais** e **55 registos de migração remota**. Os nomes e formatos de timestamp divergem; uma comparação literal de prefixos não é suficiente para decidir quais alterações foram aplicadas. Isto **não prova** que 45 migrações estejam em falta nem autoriza a reaplicá-las.

Antes de criar ou aplicar migrações para administração eclesiástica:
1. comparar cada migração local com os registos remotos e o esquema efectivo;
2. identificar renomeações, migrações históricas e alterações já aplicadas manualmente;
3. preparar uma tabela de correspondência auditável;
4. executar validação de leitura e RLS;
5. só então criar uma migração nova, forward-only e idempotente quando apropriado.

**Não executar `supabase db push` nem reaplicar migrações antigas até a reconciliação estar concluída.**

## 4. Arquitectura funcional proposta

### A. Identidade e vínculos institucionais

- Uma identidade Zion por pessoa.
- Registo eclesiástico de membro separado do perfil social, com identificador de membro, estado, datas e campos exigidos pela política local.
- O vínculo de membro pode apontar para a conta Zion quando a pessoa usa a plataforma; membros sem conta continuam a existir no registo eclesiástico.
- Funções institucionais atribuídas por organização, unidade/departamento e período de validade.
- Registos sensíveis (contactos, dados pastorais, menores e histórico de membro) com permissões e retenção próprias.

### B. Secretaria da igreja local

- Cadastro e histórico de membros e famílias.
- Entradas, transferências, baptismos, profissão de fé, falecimento e outras alterações conforme a política autorizada.
- Livro/arquivo de decisões, reuniões, actas, correspondência e documentos.
- Controlo de qualidade de dados, duplicados, alterações pendentes e trilho de auditoria.
- Acesso de leitura/inspecção para a entidade superior somente quando autorizado e compatível com a lei e a política denominacional.

### C. Espaços departamentais

Cada departamento/unidade recebe um espaço próprio, ligado à organização e ao catálogo configurável de ministérios. O espaço inclui:

- Plano e calendário de actividades;
- registo de actividades e resultados;
- participantes/presenças e indicadores aplicáveis;
- orçamento/ofertas apenas quando o departamento e o utilizador têm essa autorização;
- documentos, responsáveis e tarefas;
- dados que alimentam automaticamente o relatório do período.

O catálogo inicial deve cobrir os departamentos e organizações do Manual da Igreja, mas permitir que uma organização configure os departamentos realmente existentes sem duplicar ministérios já registados.

### D. Motor de relatórios

Fluxo previsto:

`registo operacional → indicadores do período → validação automática → revisão do responsável → revisão da secretaria → aprovação autorizada → submissão à entidade superior → agregação`

- Modelos versionados por departamento, organização, jurisdição e período.
- Frequência configurável: semanal/Sábado, mensal, trimestral, anual ou conforme a política.
- Recolha contínua dos dados e geração agendada do rascunho, mesmo quando ninguém abre a página.
- Alertas de prazos, dados em falta e relatórios devolvidos.
- Estado explícito: rascunho, incompleto, pronto para revisão, devolvido, aprovado, submetido e aceite.
- Relatório consolidado na entidade superior, sem apagar os dados de origem nem confundir um total consolidado com a soma de pessoas repetidas em vários departamentos.
- Exportação e impressão a partir da versão aprovada, com idioma e formato configuráveis.

### E. Hierarquia, autorização e acesso

- A hierarquia utiliza a relação organizacional existente e suporta níveis configuráveis.
- Permissões com âmbito explícito: entidade, unidade, acção, dados sensíveis e período.
- Responsáveis departamentais podem registar os seus dados; não recebem automaticamente acesso ao cadastro completo da secretaria.
- Secretaria pode rever e devolver relatórios; aprovação final depende da matriz de autoridade definida pela entidade.
- A entidade superior vê os relatórios submetidos dentro do seu âmbito, com estado e histórico.
- Administradores técnicos da plataforma não devem receber acesso indiscriminado a dados eclesiásticos privados por defeito.

## 5. Fases de implementação

### Fase 0 — Segurança e inventário (actual)

- Reconciliar migrações locais/remotas e confirmar o esquema real.
- Mapear tabelas, políticas RLS, endpoints e páginas que já existem.
- Confirmar autorização de escrita em ministérios, programas e relatórios.
- Não modificar dados de produção durante a reconciliação.

### Fase 1 — Fundação institucional

- Confirmar o modelo de organização e hierarquia.
- Ligar registo eclesiástico a utilizadores Zion sem exigir conta a cada membro.
- Definir funções por âmbito e período, incluindo secretaria e responsáveis departamentais.
- Acrescentar testes para isolamento entre organizações e escalada de privilégios.

### Fase 2 — Secretaria e departamentos

- Consolidar o cadastro sem duplicar tabelas ou perfis existentes.
- Activar os espaços departamentais com catálogo configurável.
- Integrar actividades já existentes, começando pelo Ministério Jovem e Escola Sabatina.

### Fase 3 — Relatórios automáticos

- Definir modelos, períodos, indicadores, validações e snapshots.
- Compilar relatórios a partir dos registos operacionais.
- Executar geração no servidor/agendador, não apenas no navegador.
- Acrescentar fila de revisão, devolução, aprovação e submissão.

### Fase 4 — Relatórios hierárquicos

- Submissão da igreja local ao nível organizacional superior configurado.
- Revisão e agregação por Distrito/Missão/Conferência/União/Divisão/Conferência Geral, conforme a estrutura aplicável.
- Acompanhamento de prazos, devoluções, recibos e histórico.

### Fase 5 — Verificação de produção

- Testes automatizados, build Web/API e revisão de segurança.
- Testes com pelo menos duas contas e duas organizações: utilizador sem função administrativa, secretário local, responsável departamental e revisor de nível superior.
- Confirmar que ninguém consegue ler ou alterar registos de outra organização apenas mudando um ID na URL.
- Validar geração agendada, histórico de relatórios e ausência de regressões nos módulos existentes.

## 6. Critérios de aceitação

- Nenhuma nova conta Zion é necessária para atribuir uma função eclesiástica a alguém que já usa a plataforma.
- Um membro sem conta Zion pode ser registado pela secretaria sem criar uma identidade de login artificial.
- Um responsável departamental só acede ao espaço autorizado.
- A actividade registada é reutilizada pelo relatório; não é necessário reintroduzir os mesmos números manualmente.
- O relatório pode ser gerado no servidor mesmo que ninguém esteja com a página aberta.
- Dados em falta são apresentados como faltantes, nunca inventados.
- Aprovação/submissão preserva autor, hora, conteúdo enviado e histórico.
- Relatórios e cadastro permanecem isolados por organização e por permissão.
- Os módulos actuais continuam operacionais; qualquer alteração passa por CI e revisão de produção.

## 7. Referência normativa

A estrutura funcional deve ser validada contra a edição actual do Manual da Igreja e, para procedimentos administrativos que não estejam definidos publicamente no Manual, contra a política oficial aplicável à entidade. O software deve permitir configurar variações jurisdicionais, em vez de assumir que um único formulário representa todas as divisões.
