# Auditoria dos departamentos administrativos — ZION OS

**Data:** 15 de outubro de 2026
**Base de código examinada:** `main`, SHA `0574f484c7e1fb603c7b28ac682ef7aacb49726b`
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
3. **Ministério Pessoal/Escola Sabatina:** existe conteúdo de lições da Escola Sabatina e leitura de referências bíblicas. O código examinado não demonstra ferramentas de gestão do conselho, classes/unidades, presenças ou acompanhamento operacional de interessados/estudos bíblicos.
4. **Mordomia Cristã:** identificada no catálogo de ministérios, com perfil/recurso informativo; não foi encontrado fluxo administrativo próprio de planeamento, programas ou relatórios de Mordomia. Não se deve converter dados confidenciais de doação individual em indicadores visíveis a dirigentes de Mordomia.
5. **Juventude:** é a área não financeira com mais implementação operacional observada: clubes, membros, liderança, atividades, progressão/investiduras e relatório, com serviços e testes unitários. Ainda falta validar migrations, RLS e matriz de permissões num ambiente real.
6. **Secretaria:** fora do âmbito desta ronda, conforme pedido.
7. **Produção:** na consulta Vercel, a versão de produção do frontend correspondia ao SHA anterior `0574f48` e estava `READY`. Isso não verifica o estado da API Vercel separada, da base de dados, das migrations ou dos dados. A alteração desta ronda ainda não está integrada nem implantada.

## Estado por área

| Área | Estado | Evidência no repositório | Trabalho feito / lacuna principal |
|---|---|---|---|
| **Tesouraria / Finanças** | **AMARELO** | `apps/web/app/finance/page.tsx` oferece plano de contas e lançamento de débito/crédito. `apps/api/src/finance/finance.service.ts` verifica linhas equilibradas, contas ativas/da organização/moeda e chama `create_finance_manual_journal_entry`. `supabase/migrations/20261009120000_finance_atomic_journal.sql` exige `finance.manage`, cria entrada/linhas e log dentro da função transacional. RLS de leitura/escrita por permissão organizacional em `20261007154500_hierarchical_hr_finance_access.sql`. | Corrigi divergência de input no serviço e acrescentei 7 testes. Não há fluxo comprovado para entrega/contagem de dinheiro, recibos individuais, envio periódico à Associação nem reconciliação bancária. O Manual (pp. 115–119) exige registos/recibos e preservação da finalidade; é necessário definir processo aprovado pela UPASD/Associação antes de criar esse fluxo. Migrations e RLS efetivamente aplicadas não foram verificadas. |
| **Recursos Humanos** | **AMARELO** | Página `apps/web/app/hr/page.tsx`; endpoints e serviço `apps/api/src/hr-payroll/hr-payroll.controller.ts` e `hr-payroll.service.ts`; migrations da fundação, acessos hierárquicos e integridade documental em `supabase/migrations/2026100713*` e `20261007163000_hr_documents_integrity.sql`. | Existem registos e permissões em código, mas falta teste integrado real da matriz de funções, acessos por organização e documentos. Retenção, acesso e requisitos laborais dependem de política da organização e lei, não são dedutíveis apenas do Manual. |
| **Payroll** | **AMARELO** | `apps/web/app/payroll/page.tsx`; serviço e migrations de aprovação/regras estatutárias; teste de regressão em `apps/api/src/hr-payroll/hr-payroll.service.spec.ts`. | Recalcular em `REVIEW` foi bloqueado na alteração anterior. Nesta auditoria não alterei regras remuneratórias: continua pendente validar `FORMULA`, concorrência, atomicidade e recuperação após falha, bem como a implementação das regras estatutárias e segregação de quem calcula/aprova. Requer testes controlados antes de salários reais. A salvaguarda é inferida da necessidade de registos rigorosos; o Manual não especifica cálculo salarial. |
| **Ministério Pessoal / Escola Bíblica** | **AMARELO** | Catálogo em `apps/web/components/ministry/ministry-catalog.ts` inclui «Escola Sabatina e Ministério Pessoal»; página `/ministry` e API genérica de perfis de ministério em `apps/api/src/spiritual/ministry/`. Manual: capítulo 9, pp. 139–141. | Não encontrei operação própria para classes bíblicas, distribuição/encaminhamento de interessados, acompanhamento, ou conselho/relatório do departamento. Antes de criar, acordar que dados são necessários, quem os vê, consentimento e como se evita duplicar a Secretaria ou os registos de membros. |
| **Escola Sabatina** | **AMARELO** | `/sabbath-school` carrega lições em `apps/web/app/sabbath-school/page.tsx`; endpoint `apps/api/src/spiritual/adventist/sabbath-school.controller.ts`; repositório para `spiritual_sabbath_school_lessons`. A interface mostra lições e referências bíblicas. | Implementação observada é principalmente conteúdo/estudo; não prova registo de unidades/classes locais, presenças, professores, visitantes ou relatório departamental. Não fiz alteração de conteúdo sem confirmar fonte, direitos e edição da lição. |
| **Mordomia Cristã** | **AMARELO** | Entrada `stewardship` em `apps/web/components/ministry/ministry-catalog.ts`; serviços financeiros genéricos na área Finance. Manual: capítulo 9, pp. 142–143, e capítulo 12, p. 187 e seguintes. | Não encontrei módulo próprio de Mordomia com programas/planeamento de departamento. O Manual define Mordomia como abrangendo a vida cristã e também meios financeiros; não autoriza divulgar registos pessoais de doações. Definir com o departamento/Associação quais métricas agregadas e que processos são pretendidos, sem expor dados confidenciais. |
| **Juventude / clubes e classes** | **AMARELO** | Página `/youth`; serviços em `apps/api/src/spiritual/youth/`; componentes em `apps/web/components/youth/`; migrations de clubes, progressão, atividades, retenção e relatório entre `20261011102803` e `20261011104505`; suites de testes de clubes, progressão e atividades. Manual: capítulo 9, pp. 143–151. | Cobertura operacional e testes existem. Falta validar no Frame as migrations e realizar testes autenticados de papéis, organização/clube, menores, consentimentos, histórico e relatórios. Não assumir que todos os segmentos/estruturas locais são obrigatórios em todas as igrejas. |
| **Outros ministérios** | **AMARELO** | Catálogo em `apps/web/components/ministry/ministry-catalog.ts`; perfil/catálogo e administração genérica de ministérios. | Muitas entradas são catálogo e não módulos operacionais separados. Nenhuma funcionalidade nova específica foi criada sem um fluxo e requisitos aprovados; confirmar prioridades e responsáveis locais antes de ampliar. |
| **Administração / governação** | **AMARELO** | Rotas `/admin`, `/church-administration`; `apps/api/src/governance/`; serviços de organização/unidades. | Há blocos funcionais de governação, mas não foi feita nova validação ponta a ponta de eleição, conselho, atas, decisão e hierarquia. Confirmar matriz de competências no Manual e políticas da Associação; não concluir autorização efetiva sem ambiente de teste. |
| **Relatórios** | **AMARELO** | `/reports` consulta ministérios e relatório operacional de Juventude; existem funções de relatório e verificações de permissão. | A existência do relatório não demonstra reconciliação com fonte oficial nem submissão institucional. Validar métricas, escopos, funcionamento em falha e quem pode ver dados. |

## Correção financeira desta ronda

- **Contrato do RPC:** `create_finance_manual_journal_entry` impõe descrição aparada com 2–500 caracteres e data SQL `date`. A API só verificava descrição não vazia e usava `Date.parse`, que pode normalizar uma data impossível como `2026-02-30` em vez de rejeitá-la.
- **Alteração:** `apps/api/src/finance/finance.service.ts` valida a descrição dentro dos limites do RPC e verifica data `YYYY-MM-DD` por round-trip UTC antes de consultar contas ou chamar o RPC.
- **Regressão:** `apps/api/src/finance/finance.service.spec.ts` cobre data impossível, limites da descrição, desequilíbrio, validação de contas/moeda e chamada do RPC atómico.
- **Teste observado:** suite API completa — **21 suites / 72 testes aprovados**, incluindo os sete novos testes financeiros. Build da API executado; resultado final a confirmar no CI da branch após a integração.
- **Base do Manual:** manutenção de registos e documentação financeira (capítulo 9, pp. 118–119). A verificação antecipada de datas é uma salvaguarda técnica inferida para evitar dados inválidos; não é uma regra literal do Manual.

## Ações recomendadas por ordem

1. Fazer merge da correção financeira só depois de CI verde e conferir que o deployment automático aponta para o SHA novo.
2. Consultar a UPASD/Associação sobre o processo oficial de recolha, contagem, recibos, confidencialidade e reporte de fundos antes de desenhar um módulo de Tesouraria de doações/ofertas. Não inferir política local a partir do Manual.
3. Validar RLS e matriz de permissões de Finanças, RH/Payroll, Ministérios e Juventude em ambiente de teste autorizado com contas por função e por organização; confirmar migrations aplicadas pelo Frame. Não fazer escrita em produção nesta ronda.
4. Para Payroll, testar transações concorrentes/recuperáveis e todas as regras e componentes salariais aprovados pela entidade empregadora antes de salários reais.
5. Para Ministério Pessoal, Escola Bíblica e Mordomia, acordar com dirigentes quais operações devem ser registadas, dados mínimos, base de acesso, conservação e relatórios. Só então propor esquema/fluxos específicos.
6. Para Escola Sabatina, validar origem/licença/versão das lições e definir se o objetivo é conteúdo ou gestão local de unidades e presenças.
7. Para Juventude, validar papéis, proteção e consentimentos relacionados com menores, retenção e escopo de clube/organização em ambiente controlado.
8. Depois do CI e deploy, smoke test das páginas públicas/aplicação e da API; isso não substitui teste autenticado de dados, RLS ou aprovação denominacional.

## Fora do que foi verificado

- A migration não foi aplicada e nenhuma base de dados/Frame foi modificada.
- Não houve teste autenticado contra a aplicação ou API de produção.
- O deployment Vercel `READY` observado no SHA `0574f48` é a produção anterior à correção financeira desta ronda; não prova estado da API separada ou da base de dados.
- O termo «classe batina» foi entendido como possivelmente «classe batismal», mas requer confirmação. Nenhum fluxo novo de batismo/membresia foi concebido ou alterado; esses registos pertencem ao âmbito da Secretaria, explicitamente excluído.
- A auditoria não equivale a certificação de conformidade, auditoria independente, nem autorização para registar informação pessoal/financeira real.
