# ZION OS — Auditoria inicial da Administração

**Data:** 2026-10-15
**Referência consultada:** branch `main`, commit `eed6b8155400bf72af7f0020d6ffd15fdf26f839` (`fix(admin): centralize department navigation and remove duplicates`)
**Âmbito:** análise estática do repositório, pipelines disponíveis e execução local de build/testes. Não houve acesso à produção nem à base de dados.

## Resumo executivo

- A `main` existe e contém rotas administrativas separadas para Secretaria, Finanças, RH, Payroll, Ministérios, Relatórios, Administração da Igreja e Juventude. A navegação centralizada foi alterada no último commit; não foram encontrados indícios de que seja necessário criar módulos duplicados.
- As páginas de Finanças, RH, Payroll, Secretaria, Relatórios e Juventude fazem chamadas à API e há controladores/serviços reais para parte relevante do percurso. A existência de código não confirma que os endpoints, migrations e políticas estejam aplicados na instalação de produção.
- Há políticas RLS e grants por organização/função nas migrations observadas. O estado aplicado, o isolamento efetivo em dados reais, os papéis provisionados e as permissões observadas em produção **não puderam ser verificados**.
- Foi identificada e corrigida uma falha no Payroll: a API permitia recalcular uma execução `REVIEW`, apesar de o primeiro cálculo já ter criado itens; repetir a operação podia duplicar itens/linhas e tornar os totais inconsistentes. A API agora só calcula em `DRAFT`; foi adicionado teste de regressão.
- **Não há módulos classificados como VERDE**, pois não houve verificação autenticada de ponta a ponta contra uma instalação e uma base de dados reais, nem confirmação de aplicação das migrations pelo Frame.
- Estado global: **AMARELO — auditoria estática inicial e validações locais concluídas; produção e dependências Frame pendentes**.

## Evidências e testes

| Verificação | Resultado observado |
|---|---|
| Clone e branch | `main`, HEAD `eed6b81`; clone sem alterações locais antes do trabalho |
| API: build | Aprovado (`pnpm --filter api build`), também após a correção |
| API: testes | 20 suites / 65 testes aprovados após a correção; inclui o novo teste de bloqueio do recálculo em `REVIEW` |
| Web: build de produção | Aprovado com variáveis de validação de CI, sem credenciais reais |
| Catálogos i18n | 26 catálogos × 111 mensagens validados |
| GitHub Actions | Run `38559856244` da `main` no SHA consultado `eed6b815…`: conclusão `success`; inclui jobs API, Web e integridade do repositório |
| Migrations no clone | 63 ficheiros SQL encontrados; há migrations de Secretaria, HR/Payroll/Finanças, ministérios e Juventude |
| Teste de produção/API real | Não executado: sem sessão/organização de teste autorizada e sem configuração confirmada de produção |
| Frame / aplicação de migrations | Não confirmado; nenhum acesso direto ou escrita em Supabase foi efetuado |

O run Actions consultado é evidência da execução nesse SHA, não uma confirmação do estado atual de produção. A build Web local usou valores sentinela equivalentes ao CI.

## Quadro de estado por área

| Área | Estado | O que o repositório permite confirmar | Falhas, limites e próxima ação |
|---|---|---|---|
| **Secretaria** | **AMARELO** | Página `/secretariat`; endpoints de membros, famílias, transferências e batismos são consumidos por `apps/web/app/secretariat/page.tsx`; serviços/controladores dedicados em `apps/api/src/organizations`; migrations de base, permissões, histórico, relações, transferências e validação de batismo. Suites de serviços/API da Secretaria passam nos testes locais. | Migrações `20261013200722`–`20261014130000` têm de ser confirmadas no Frame; testar cada operação e permissões com utilizadores de funções e organizações distintas; os testes unitários não confirmam API+DB em produção. Não declarar validada em produção.
| **Finanças** | **AMARELO** | `/finance` usa `resaRequest` em `/v1/finance/...`; controller/service reais, consulta de contas e diário, criação de contas e lançamento por RPC transacional. Validações de equilíbrio, contas ativas, organização e moeda no serviço; migrations de RLS e `create_finance_manual_journal_entry`. | Não existe teste dedicado de Finance no conjunto `apps/api/src/finance`; execução real do RPC e migrations não verificada. Criar testes de serviço/controller e teste de integração controlado após confirmação Frame, incluindo falhas RLS e leitura/escrita por organização.
| **Recursos Humanos** | **AMARELO** | `/hr` consome endpoints de empregados e ausências; controller/service e tabelas de empregados, contratos e pedidos de licença; políticas RLS por organização e identidade de empregado definidas em migration. | Não foram encontrados testes dedicados aos serviços `hr-payroll`; não houve prova de criação/consulta/aprovação real, escopo multi-organização ou validação de documentos/contratos com dados reais. Implementar cobertura e testar matriz de papéis após confirmação Frame.
| **Payroll** | **AMARELO** | `/payroll` comunica com endpoints de períodos, cálculo e aprovação. Há tabelas, políticas por função e migrations de aprovação e regras estatutárias. | **Corrigido nesta alteração:** execução em `REVIEW` podia ser recalculada, acrescentando novos itens sem substituição atómica dos existentes. Agora só aceita `DRAFT`; teste regressivo adicionado. Continuam pendentes teste de integração transacional/concorrência, cálculo de regras estatutárias (o serviço observado calcula componentes `FIXED`/`PERCENTAGE`, e ignora `FORMULA`) e confirmação das migrations. Não classificar como pronto para salários reais.
| **Ministérios** | **AMARELO** | `/ministry` usa `MinistryLivePage`; endpoints `GET/POST/PATCH /v1/ministries`; serviço e adaptador de diretório; testes unitários de validação/normalização. Há migration de perfil e reconciliação. | Testes de serviço não demonstram RLS nem persistência real; confirmar aplicação das migrations, leitura e edição por papéis distintos, e correspondência da UI para lista/criação/edição.
| **Relatórios** | **AMARELO** | `/reports` consulta a API para Ministérios e o relatório operacional de Juventude, distingue falha de dados em falta e inclui atualização/impresso. Existe RPC com `security invoker` e verificação de permissão para agregados jovens. | Testar os resultados e limites de acesso com dados reais; validar que todos os indicadores/escopos representam métricas de negócio corretas e que o RPC/migration existem em produção. A atualização periódica da página não é envio institucional nem relatório periódico submetido.
| **Administração / gestão organizacional** | **AMARELO** | Rotas `/admin` e `/church-administration`; a última alteração na `main` centraliza navegação departamental. Dashboard de administração da igreja exige claims autenticadas no servidor. | Claims na rota não provam autorização por operação nem visibilidade dos dados organizacionais. Testar hierarquia organização/unidade, papéis, navegação, membros e métricas com contas representativas, além da existência de migrations no Frame.
| **Privacidade e segurança** | **AMARELO** | Migrations observadas habilitam RLS, revogam acesso `anon` e aplicam permissões organizacionais em domínios de Finanças/RH/Payroll, Juventude e Secretaria; endpoints API usam bearer tokens e acessam Supabase REST com token delegado. | Não se verificou a configuração real, aplicação das políticas, claims/roles provisionados, logs/auditoria em produção, nem isolamento com contas de teste. Não há evidência suficiente para VERDE nem base para afirmar vulnerabilidade geral. Fazer revisão de políticas e testes negativos multi-organização com o processo autorizado.
| **Juventude** | **AMARELO** | `/youth`; endpoints para clubes, membros, liderança, atividades, progressão, investiduras e relatório; diretórios Supabase; testes unitários para clubes/atividades/progressão. Migrations de fundação, progressão, atividades e retenção incluem RLS e relacionamentos de organização/clube. | Confirmar migrations no Frame e executar testes de ponta a ponta (registo, presenças, progresso, liderança, retenção, relatórios) sob papéis reais; unit tests não confirmam RLS aplicado.
| **Outras áreas administrativas existentes** | **AMARELO** | `apps/web/app/admin/moderation` e módulos administrativos adicionais identificados por rotas/estrutura; `apps/web/app` inclui ainda áreas operacionais e serviços espirituais. | Inventário inicial, não auditoria exaustiva de cada funcionalidade fora das áreas prioritárias explicitadas. Próxima ronda deve inspecionar moderação e restantes rotas admin individualmente, sem criar duplicados.

## Correção aplicada nesta ronda

- `apps/api/src/hr-payroll/hr-payroll.service.ts`: `calculatePayroll()` rejeita estados diferentes de `DRAFT`; antes também aceitava `REVIEW`, embora o cálculo insira novos registos em `payroll_items`/`payroll_item_lines`.
- `apps/api/src/hr-payroll/hr-payroll.service.spec.ts`: teste regressivo assegura que um processamento em `REVIEW` é rejeitado antes de carregar empregados ou iniciar novas escritas.
- Validação após alteração: build da API aprovado; 20 suites / 65 testes aprovados; `git diff --check` aprovado.

Esta correção reduz risco de duplicação, mas **não torna o Payroll pronto para produção**. Uma falha durante execução pode ainda deixar o run em `CALCULATING` ou registos parciais: a solução robusta exige operação transacional/idempotente aprovada pelo Frame, testes concorrentes e regra explícita de recuperação/retry. Não foi criada uma migration nem executada qualquer operação na base de dados.

## Ordem recomendada de correção e validação

1. **Fechar bloqueadores de segurança e dependências do Frame:** obter inventário de migrations aplicadas por ambiente; validar permissões e RLS com contas de teste e duas organizações; confirmar a configuração real sem expor dados.
2. **Payroll (risco financeiro):** desenhar com o Frame cálculo idempotente/atómico e recuperação de `CALCULATING`; validar regras estatutárias e fórmulas suportadas; adicionar testes de concorrência, falhas parciais, autorização e separação de organizações antes de salários reais.
3. **Finanças:** acrescentar testes de API/RPC e verificar lançamento atómico, restrições de moeda, livro diário, contas e papéis através do fluxo autorizado.
4. **RH:** testar empregado, contrato, licença, aprovação e documentos com perfis separados; cobrir validação e isolamento.
5. **Secretaria:** aplicar/confirmar migrations por Frame e executar os fluxos de membro, família, transferência e validação de batismo incluindo trilho de auditoria.
6. **Juventude e Ministérios:** confirmar migrations e executar fluxos operacionais completos e permissões por organização/clube.
7. **Relatórios e Administração:** validar métricas contra registos de origem, mensagens de indisponibilidade, acesso hierárquico, navegação consolidada e estados vazios/erro.
8. **Pré-produção:** executar testes integrados com ambiente autorizado, verificar logs/erros e Actions após cada grupo de correções. Só então reclassificar itens validados; nenhuma implantação ou alteração de produção foi feita nesta ronda.

## Limites desta entrega

- O clone corresponde ao SHA indicado no início da auditoria; alterações locais ainda têm de passar por revisão e merge.
- A correção preparada não foi enviada para `main` nem implantada.
- Sem acesso confirmado à aplicação de produção, ao Frame e a uma organização/identidade de teste, as verificações de dados reais, RLS efetivo e comportamento observado na produção permanecem **não verificadas**.
- Estados `AMARELO` são deliberados e seguem o critério de não inferir funcionamento apenas pela existência de ficheiros ou migrations.
