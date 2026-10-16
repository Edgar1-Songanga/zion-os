# Auditoria dos departamentos administrativos — ZION OS

**Data:** 15 de outubro de 2026 (auditoria inicial); atualizado em 16 de outubro de 2026.
**Base de código examinada:** snapshot inicial de `main`, SHA `0574f484c7e1fb603c7b28ac682ef7aacb49726b`; correção financeira integrada em `5e865f823fa85b34ad7e86573570359558b8c55c`; fase 1 ministerial em revisão na branch `feature/ministry-program-operations-2026-10-16`.
**Âmbito:** Tesouraria/Finanças, RH/Payroll, Ministério Pessoal/Escola Sabatina, Mordomia Cristã, Juventude, Ministérios, Administração/governação e Relatórios.
**Exclusão expressa:** **Secretaria**. Não foram propostas nem feitas alterações aos seus ficheiros ou fluxos.

## Referência normativa e limites

Foi consultado o **Manual da Igreja Adventista do Sétimo Dia, 21.ª edição, revisão de 2025**, tradução portuguesa da UPASD/Publicadora SerVir, edição de fevereiro de 2026. A página de recursos da UPASD apresenta a edição portuguesa de 2026; o PDF credita o original à Conferência Geral e a tradução à UPASD/Publicadora SerVir.

- **Tesouraria:** capítulo 9, secção «Tesoureiro», pp. impressas 115–119 — custódia dos fundos, contas em nome da igreja, fundos da Associação, despesas locais sujeitas à autorização competente, fundos auxiliares e finalidade, recibos, documentos, verificação dos livros, relatórios e confidencialidade.
- **Ministérios Pessoais / Escola Bíblica / Escola Sabatina:** capítulo 9, títulos identificados no índice nas pp. 135–141 — comissões e oficiais, Ministério Pessoal e coordenador da Escola Bíblica.
- **Mordomia:** capítulo 9, «Ministérios da Mordomia», pp. 142–143; capítulo 12, «Mordomia», a partir da p. 187 — abrange a vida cristã e os recursos, não apenas dinheiro.
- **Ministérios da Juventude Adventista:** capítulo 9, pp. 143–151 — estrutura de conselhos, direção, clubes/segmentos e planeamento do ministério.

O Manual orienta a estrutura e princípios e não especifica uma aplicação informática, modelo de dados ou todos os procedimentos da associação local. Por isso, o relatório distingue **regra expressa**, **salvaguarda técnica inferida** e **política que precisa de confirmação local/legal**. Não se conclui que uma migration esteja aplicada em produção apenas porque existe no repositório.

**Fontes oficiais:** [página UPASD — Manual da IASD](https://recursos.adventistas.org.pt/secretaria/manuais-e-guias/manual-da-igreja/) (publicação indicada em 3 de abril de 2026); [PDF português de 2026](https://s3.eu-central-003.backblazeb2.com/upasd-recursos/secretaria/manuais/igreja/Manual%20de%20Igreja%202026.pdf); [Church Manual — Conferência Geral](https://gc.adventist.org/church-manual/); [PDF inglês, revisão de 13 de outubro de 2025](https://gc.adventist.org/wp-content/uploads/2025/10/Seventh-day_Adventist_Church_Manual-2025-10-13.pdf).

## Resumo executivo

1. **Tesouraria/Finanças:** existe um fluxo real de plano de contas e livro diário, com lançamento de dupla entrada através de RPC atómico e controlo de permissões no backend. Corrigi a validação local de datas e descrições para coincidir com o contrato do RPC e acrescentei sete testes. Isto não cria receção de dízimos/ofertas, recibos de doadores ou reconciliação bancária, que não estão demonstrados neste fluxo.
2. **RH/Payroll:** existem páginas, API, migrations e segregação de funções; a correção anterior impede novo cálculo em estado `REVIEW`. O comportamento de fórmulas salariais, processamento atómico/recuperável e autorização em ambiente real ainda requer trabalho/verificação. Não declarar pronto para salários reais.
3. **Ministério Pessoal/Escola Sabatina:** existe conteúdo de lições da Escola Sabatina. A fase 1 acrescenta planeamento e acompanhamento de programas ministeriais; continua sem gerir conselho, classes/unidades, presenças ou interessados/estudos bíblicos.
4. **Mordomia Cristã:** o catálogo e a fase 1 permitem planear programas departamentais, mas ainda não há fluxo próprio de indicadores ou gestão financeira. Não se devem expor registos pessoais de ofertas/dízimos a dirigentes de Mordomia.
5. **Juventude:** é a área não financeira com mais implementação operacional observada: clubes, membros, liderança, atividades, progressão/investiduras e relatório, com serviços e testes unitários. Ainda falta validar migrations, RLS e matriz de permissões num ambiente real.
6. **Secretaria:** fora do âmbito desta ronda, conforme pedido.
7. **Produção:** a correção financeira da PR #60 está integrada e publicada no SHA `5e865f8`; a fase 1 ministerial desta revisão ainda aguarda CI, merge e deployment. Os smoke tests anteriores não verificam autenticação, RLS, Frame/base de dados, migrations aplicadas ou dados.

## Estado por área

| Área | Estado | Evidência no repositório | Trabalho feito / lacuna principal |
|---|---|---|---|
| **Tesouraria / Finanças** | **AMARELO** | `apps/web/app/finance/page.tsx` oferece plano de contas e lançamento de débito/crédito. `apps/api/src/finance/finance.service.ts` verifica linhas equilibradas, contas ativas/da organização/moeda e chama `create_finance_manual_journal_entry`. `supabase/migrations/20261009120000_finance_atomic_journal.sql` exige `finance.manage`, cria entrada/linhas e log dentro da função transacional. RLS de leitura/escrita por permissão organizacional em `20261007154500_hierarchical_hr_finance_access.sql`. | Corrigi divergência de input no serviço e acrescentei 7 testes. Não há fluxo comprovado para entrega/contagem de dinheiro, recibos individuais, envio periódico à Associação nem reconciliação bancária. O Manual (pp. 115–119) exige registos/recibos e preservação da finalidade; é necessário definir processo aprovado pela UPASD/Associação antes de criar esse fluxo. Migrations e RLS efetivamente aplicadas não foram verificadas. |
| **Recursos Humanos** | **AMARELO** | Página `apps/web/app/hr/page.tsx`; endpoints e serviço `apps/api/src/hr-payroll/hr-payroll.controller.ts` e `hr-payroll.service.ts`; migrations da fundação, acessos hierárquicos e integridade documental em `supabase/migrations/2026100713*` e `20261007163000_hr_documents_integrity.sql`. | Existem registos e permissões em código, mas falta teste integrado real da matriz de funções, acessos por organização e documentos. Retenção, acesso e requisitos laborais dependem de política da organização e lei, não são dedutíveis apenas do Manual. |
| **Payroll** | **AMARELO** | `apps/web/app/payroll/page.tsx`; serviço e migrations de aprovação/regras estatutárias; teste de regressão em `apps/api/src/hr-payroll/hr-payroll.service.spec.ts`. | Recalcular em `REVIEW` foi bloqueado na alteração anterior. Nesta auditoria não alterei regras remuneratórias: continua pendente validar `FORMULA`, concorrência, atomicidade e recuperação após falha, bem como a implementação das regras estatutárias e segregação de quem calcula/aprova. Requer testes controlados antes de salários reais. A salvaguarda é inferida da necessidade de registos rigorosos; o Manual não especifica cálculo salarial. |
| **Ministério Pessoal / Escola Bíblica** | **AMARELO** | Catálogo em `apps/web/components/ministry/ministry-catalog.ts` inclui «Escola Sabatina e Ministério Pessoal»; página `/ministry` e API genérica de perfis de ministério em `apps/api/src/spiritual/ministry/`. Manual: capítulo 9, pp. 139–141. | A fase 1 permite planear programas sem registar interessados. Classes bíblicas, encaminhamento, acompanhamento individual e conselho/relatório próprio continuam por definir; acordar dados, acesso, consentimento e limites com a Secretaria/Associação antes de construir esses fluxos. |
| **Escola Sabatina** | **AMARELO** | `/sabbath-school` carrega lições em `apps/web/app/sabbath-school/page.tsx`; endpoint `apps/api/src/spiritual/adventist/sabbath-school.controller.ts`; repositório para `spiritual_sabbath_school_lessons`. | A fase 1 pode registar programas/planos do departamento, mas não gere classes/unidades locais, presenças, professores ou visitantes. Não foi alterado conteúdo das lições sem confirmar fonte, direitos e edição. |
| **Mordomia Cristã** | **AMARELO** | Entrada `stewardship` no catálogo; a fase 1 usa o registo comum de programas ministeriais. Manual: capítulo 9, pp. 142–143, e capítulo 12, p. 187 e seguintes. | Planeamento genérico está disponível após deploy; ainda não há relatórios próprios nem métricas. O Manual define Mordomia de modo amplo e não autoriza divulgar registos pessoais de doações. Métricas agregadas e processos financeiros exigem validação da organização/Associação. |
| **Juventude / clubes e classes** | **AMARELO** | Página `/youth`; serviços em `apps/api/src/spiritual/youth/`; componentes em `apps/web/components/youth/`; migrations de clubes, progressão, atividades, retenção e relatório entre `20261011102803` e `20261011104505`; suites de testes de clubes, progressão e atividades. Manual: capítulo 9, pp. 143–151. | Cobertura operacional e testes existem. Falta validar no Frame as migrations e realizar testes autenticados de papéis, organização/clube, menores, consentimentos, histórico e relatórios. Não assumir que todos os segmentos/estruturas locais são obrigatórios em todas as igrejas. |
| **Outros ministérios** | **AMARELO** | Catálogo em `apps/web/components/ministry/ministry-catalog.ts`; fase 1 de planeamento genérico em `/ministry`. | Muitas entradas continuam a ser apenas catálogo; não há processos específicos por departamento. Confirmar prioridades e responsáveis locais antes de acrescentar presenças, acompanhamento individual, métricas financeiras ou outros dados sensíveis. |
| **Administração / governação** | **AMARELO** | Rotas `/admin`, `/church-administration`; `apps/api/src/governance/`; serviços de organização/unidades. | Há blocos funcionais de governação, mas não foi feita nova validação ponta a ponta de eleição, conselho, atas, decisão e hierarquia. Confirmar matriz de competências no Manual e políticas da Associação; não concluir autorização efetiva sem ambiente de teste. |
| **Relatórios** | **AMARELO** | `/reports` consulta ministérios e relatório operacional de Juventude; existem funções de relatório e verificações de permissão. | A existência do relatório não demonstra reconciliação com fonte oficial nem submissão institucional. Validar métricas, escopos, funcionamento em falha e quem pode ver dados. |

## Correção financeira desta ronda

- **Contrato do RPC:** `create_finance_manual_journal_entry` impõe descrição aparada com 2–500 caracteres e data SQL `date`. A API só verificava descrição não vazia e usava `Date.parse`, que pode normalizar uma data impossível como `2026-02-30` em vez de rejeitá-la.
- **Alteração:** `apps/api/src/finance/finance.service.ts` valida a descrição dentro dos limites do RPC e verifica data `YYYY-MM-DD` por round-trip UTC antes de consultar contas ou chamar o RPC.
- **Regressão:** `apps/api/src/finance/finance.service.spec.ts` cobre data impossível, limites da descrição, desequilíbrio, validação de contas/moeda e chamada do RPC atómico.
- **Teste observado:** suite API completa da correção financeira — **21 suites / 72 testes aprovados**, incluindo os sete novos testes financeiros; CI da PR #60 e da `main` passou.
- **Base do Manual:** manutenção de registos e documentação financeira (capítulo 9, pp. 118–119). A verificação antecipada de datas é uma salvaguarda técnica inferida para evitar dados inválidos; não é uma regra literal do Manual.

## Fase 1 — programas e atividades dos departamentos

- **Objetivo:** dar a Ministério Pessoal, Escola Sabatina, Mordomia e aos demais ministérios do catálogo um registo comum para planear e acompanhar programas, sem esperar pela conceção de fluxos com dados pessoais.
- **Implementação em revisão:** `POST /v1/ministries/:id/programs` e `PATCH /v1/ministries/:id/programs/:programId`; a página `/ministry` permite criar/editar nome, descrição, estado e datas. Reutiliza `ministry_programs`; não acrescenta migration.
- **Permissões:** o token autenticado aplica a RLS já existente; escrita exige `organization.manage`. O update filtra também por `ministry_id` para impedir alteração cruzada entre ministérios. A política local de quem deve receber esta permissão continua por confirmar.
- **Validação:** datas de calendário, intervalo coerente, estado permitido, limites de texto e escopo de atualização. Testes da API após a fase 1: **22 suites / 77 testes aprovados**; builds local de API e Web passaram.
- **Limite:** o Manual orienta organização e responsabilidades; este planeador é uma salvaguarda/ferramenta técnica, não uma exigência expressa do Manual. Não inclui presenças, classes/unidades, acompanhamento de interessados, ofertas/dízimos, pagamentos ou métricas individuais. A fase aguarda CI, merge e deploy.

## Ações recomendadas por ordem

1. Fazer merge/deploy da fase 1 ministerial só depois de CI verde e confirmar a versão em produção.
2. Consultar a UPASD/Associação sobre o processo oficial de recolha, contagem, recibos, confidencialidade e reporte de fundos antes de desenhar um módulo de Tesouraria de doações/ofertas. Não inferir política local a partir do Manual.
3. Validar RLS e matriz de permissões de Finanças, RH/Payroll, Ministérios e Juventude em ambiente de teste autorizado com contas por função e por organização; confirmar migrations aplicadas pelo Frame. Não fazer escrita em produção nesta ronda.
4. Para Payroll, testar transações concorrentes/recuperáveis e todas as regras e componentes salariais aprovados pela entidade empregadora antes de salários reais.
5. Para Ministério Pessoal e Mordomia, acordar com dirigentes quais operações adicionais devem ser registadas, dados mínimos, base de acesso, conservação e relatórios.
6. Para Escola Sabatina, validar origem/licença/versão das lições e decidir separadamente se quer gestão local de classes/unidades e presenças; não recolher presenças até aprovar papéis e retenção.
7. Para Juventude, validar papéis, proteção e consentimentos relacionados com menores, retenção e escopo de clube/organização em ambiente controlado.
8. CI e deploy da correção financeira anterior foram concluídos; a fase 1 ministerial ainda aguarda CI/produção. Depois do deploy, fazer smoke test e realizar testes autenticados de dados/RLS num ambiente de teste autorizado antes de declarar os fluxos conformes.

## Fora do que foi verificado

- A migration não foi aplicada e nenhuma base de dados/Frame foi modificada.
- Não houve teste autenticado contra a aplicação ou API de produção.
- Os deployments Vercel de frontend e API ficaram `READY` no SHA `5e865f8` e os smoke tests públicos passaram; isso não prova o estado da base de dados nem que migrations/RLS foram aplicadas.
- O termo «classe batina» foi entendido como possivelmente «classe batismal», mas requer confirmação. Nenhum fluxo novo de batismo/membresia foi concebido ou alterado; esses registos pertencem ao âmbito da Secretaria, explicitamente excluído.
- A auditoria não equivale a certificação de conformidade, auditoria independente, nem autorização para registar informação pessoal/financeira real.
