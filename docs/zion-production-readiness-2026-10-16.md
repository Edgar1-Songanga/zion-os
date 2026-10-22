# ZION OS — auditoria de prontidão para produção

**Data da verificação:** 16 de outubro de 2026 (UTC)  
**Fonte de código:** GitHub `main`  
**Último commit de `main` verificado nesta auditoria:** `e9fde29a9cc15ea974da508054a2cf8c05ae8655`  
**Limite:** esta auditoria usou consultas de leitura à base de dados e metadados de deployment. Não foram executadas escritas de produção nem migrações.

## Alterações de código integradas

| PR | Resultado | Âmbito |
|---|---|---|
| #64 | Integrado | Corrige parsing do token Bearer em Identity e relações familiares da Secretaria; adiciona testes. |
| #65 | Integrado | Liga o centro real de notificações ao Topbar; alerta global de chamadas RESA com som/vibração repetidos enquanto a chamada toca; reforça notificações push urgentes no service worker. |
| #67 | Integrado | Relatório operacional da Secretaria a partir dos registos reais, exportação CSV UTF-8 e impressão/guardar PDF; distingue o relatório dos formulários oficiais. |
| #68 | Integrado | Recuperação de notificações em reconexão/retorno à aba, prevenção de pedidos sobrepostos e mensagens de erro visíveis. |
| #70 | Integrado | Workspace do Ministério Pessoal/Evangelismo que consulta o Bible Engine existente e publica estudos no RESA com referências bíblicas e âmbito organizacional. |
| #71 | Integrado | Mensagens de erro dos Relatórios diferenciadas para permissões, sessão, schema/migration e timeout. |

O CI dos PRs integrados acima passou. Isto valida build/testes automatizados, não substitui testes autenticados reais nem validação de migrações SQL.

## Estado Vercel

- Frontend `zion-os-omega.vercel.app` e API `zion-os-api-delta.vercel.app` foram publicados em estado **READY** no commit `814d20416a5ac5ef2156a5e0a18b45de0955173e`.
- O `main` actual avançou depois desse deployment: os PRs #68, #70 e #71 foram integrados após o SHA publicado. Existe um preview READY com a árvore de código mais recente, mas a actualização de produção para o `main` actual não foi concluída nesta sessão.
- Não foram encontrados logs de erro nos dois deployments de produção consultados no intervalo de 30 minutos após a publicação. Isto não prova que todas as rotas ou fluxos autenticados funcionem.
- O deployment de produção actual ainda precisa de ser actualizado para incluir as últimas alterações de notificação, workspace ministerial e mensagens de diagnóstico.

## Estado verificado da base de dados de produção

Só foi encontrado **um projecto Supabase acessível**; não foi encontrado ambiente de staging. Por isso, as migrações pendentes não foram aplicadas directamente à produção.

### Tabelas e dados

| Área | Estado observado |
|---|---|
| Organizações | 2 registos |
| `organization_memberships` | 2 registos activos, ambos com papel `organization_owner` |
| Unidades organizacionais | 4 registos |
| Registos de membros da igreja | Tabela existe; 0 registos |
| Transferências de membros | **Tabela ausente** |
| Registos de baptismo | **Tabela ausente** |
| Relatórios ministeriais | Tabela existe; 0 registos |
| Contas financeiras / lançamentos / linhas | Tabelas existem; 0 registos |
| Colaboradores / períodos de payroll / itens de payroll | Tabelas existem; 0 registos |
| Clubes / membros de clubes / actividades juvenis | Tabelas existem; 0 registos |

A migração de bootstrap de papéis e a migração de notificações urgentes de chamadas aparecem no histórico de produção. As migrações `20261014120000_church_member_transfer_workflow.sql` e `20261014130000_church_member_baptism_validation.sql` não aparecem no histórico; a consulta de catálogo confirmou que as respectivas tabelas ainda não existem.

### Relatórios ministeriais

A tabela `ministry_reports` tem actualmente um modelo mínimo: `id`, `ministry_id`, `title`, `status`, `submitted_at` e `submitted_by`. A política observada para esta tabela é apenas de leitura (`SELECT`); não há política de escrita correspondente no conjunto consultado. Portanto, não se deve declarar implementado o fluxo de redacção, submissão hierárquica, revisão, devolução, aprovação e histórico. É necessária uma proposta de modelo/RLS e validação num ambiente não produtivo.

### Permissões de departamentos

Os papéis `finance_manager`, `hr_manager` e `payroll_manager` existem e têm permissões de gestão, mas a produção não tem memberships atribuídos a esses papéis. Os dois memberships observados são de `organization_owner`; esse papel tem permissões de leitura de Finanças/RH/Payroll e gestão organizacional, mas não substitui a atribuição formal de gestores departamentais.

A auditoria da RPC `youth_ministry_operational_report`, executada apenas como verificação de leitura com contexto de proprietário, passou e devolveu zero clubes/actividades. Os erros de permissão registados anteriormente podem estar relacionados com o estado de membership anterior ao bootstrap; é necessário confirmar com uma sessão real. Não existem dados juvenis de produção para validar resultados funcionais de ponta a ponta.

## Avisos de segurança Supabase

O advisor de segurança devolveu:
- extensão `pg_net` instalada no schema `public`;
- três funções `SECURITY DEFINER` executáveis por `authenticated` (`resa_create_conversation`, `resa_profiles_for_ids`, `resa_search_profiles`), que exigem revisão dos limites de autorização e dos dados devolvidos — o aviso, isoladamente, não prova exploração;
- protecção contra palavras-passe comprometidas desactivada.

Não foram alteradas definições de Auth nem privilégios de base de dados nesta auditoria.

## Bloqueios e ordem de trabalho

1. **Actualizar produção a partir do `main` actual** através do fluxo autorizado Vercel; o deployment actual está no SHA anterior `814d204...`.
2. **Disponibilizar staging Supabase** ou outro ambiente descartável autorizado antes de executar/reconciliar SQL.
3. **Reconciliar as migrações de transferências e baptismos** pela via oficial de gestão de base de dados; validar ordem, pré-requisitos, RLS, triggers e testes com sessões reais.
4. **Definir e implementar o fluxo de relatórios ministeriais** (modelo, período, conteúdo, estados, autoria, submissão/revisão/histórico e RLS) e validar num ambiente não produtivo.
5. **Atribuir gestores departamentais autorizados** a Finanças, RH e Payroll; não atribuir papéis privilegiados automaticamente.
6. **Preparar os dados reais iniciais** conforme decisões institucionais: plano de contas aprovado, colaboradores autorizados, clubes e actividades juvenis. Não inserir dados fictícios.
7. Rever os avisos do Supabase: avaliar cada função privilegiada, mover `pg_net` conforme documentação aplicável e activar a protecção de palavras-passe comprometidas por configuração autorizada.
8. Continuar a auditoria módulo a módulo, preservando funcionalidades verdes e exigindo CI, testes autenticados e validação de produção antes de marcar cada área como concluída.

**Critério de conclusão:** build verde não equivale a produção pronta. Uma área só é considerada pronta quando o fluxo real, as permissões/RLS, as migrações, os dados necessários e os testes autenticados forem verificados.
