# Reconciliação do histórico de migrações Supabase — Zion OS

**Data da inspecção:** 2026-10-13  
**Repositório:** `Edgar1-Songanga/zion-os`  
**Base de código:** `main` / `933b0ade3ec87b9ea80c5559618be77ea1f171db`  
**Project ref:** `wwdchvadowqakvrxcnkz`

## Resultado do inventário

- Ficheiros locais em `supabase/migrations`: **56**
- Registos devolvidos por `supabase_migrations.schema_migrations`: **55**
- Correspondência exacta do nome normalizado: **38**
- Ficheiros locais sem correspondência exacta pelo nome: **16**
- Registos remotos sem correspondência exacta pelo nome: **15**

A comparação normaliza o prefixo de data e a extensão `.sql`; não compara o conteúdo SQL. Por isso, estes números medem a correspondência nominal, **não** provam que uma migração está em falta, foi aplicada ou foi substituída por outra.

## Ficheiros locais com nome correspondente a um registo remoto

| Ficheiro local | Registo remoto (versão — nome) | Observação |
|---|---|---|
| `20260930_governance_enterprise_hardening.sql` | `20261001033753 — governance_enterprise_hardening` | Nome correspondente; versão difere |
| `20260930_governance_meeting_participants.sql` | `20260930140158 — governance_meeting_participants` | Nome correspondente; versão difere |
| `20260930_meeting_control_engine.sql` | `20260930141729 — meeting_control_engine` | Nome correspondente; versão difere |
| `20260930_resa_notifications_core.sql` | `20261001033750 — resa_notifications_core` | Nome correspondente; versão difere |
| `20261001_governance_votes_rls_initplan_hardening.sql` | `20261001033954 — governance_votes_rls_initplan_hardening` | Nome correspondente; versão difere |
| `20261001_production_rls_performance_hardening.sql` | `20261001033914 — production_rls_performance_hardening_v2` | Nome semelhante; sufixo remoto `v2` |
| `20261001_resa_operational_domains.sql` | `20261002071556 — 20261001_resa_operational_domains` | Nome correspondente; versão difere |
| `20261001_resa_social_foundation.sql` | `20261001161105 — resa_social_foundation` | Nome correspondente; versão difere |
| `20261002_platform_runtime.sql` | `20261002071603 — 20261002_platform_runtime` | Nome correspondente; versão difere |
| `20261002_production_search.sql` | `20261002161601 — 20261002_production_search` | Nome correspondente; versão difere |
| `20261002_resa_discovery_creator.sql` | `20261002071559 — 20261002_resa_discovery_creator` | Nome correspondente; versão difere |
| `20261002_resa_notification_function_permissions.sql` | `20261002071620 — resa_notification_function_permissions` | Nome correspondente; versão difere |
| `20261002_resa_social_notifications.sql` | `20261002071605 — 20261002_resa_social_notifications` | Nome correspondente; versão difere |
| `20261005_fix_resa_media_storage_and_membership_rls.sql` | `20261005152836 — fix_resa_media_storage_and_membership_rls` | Nome correspondente; versão difere |
| `20261005_resa_production_convergence.sql` | `20261005164050 — resa_production_convergence_messaging_notifications_live` | Nome semelhante; conteúdo deve ser comparado |
| `20261006170000_spiritual_growth_event_integration.sql` | `20261006153827 — spiritual_growth_event_integration` | Nome correspondente; versão difere |
| `20261006193000_seed_sabbath_school_q3_2026_lesson_13.sql` | `20261006175120 — seed_sabbath_school_q3_2026_lesson_13` | Nome correspondente; versão difere |
| `20261006194500_gamification_referral_foundation.sql` | `20261006181649 — gamification_referral_foundation` | Nome correspondente; versão difere |
| `20261006201305_harden_resa_call_rls_and_fk_indexes.sql` | `20261006201305 — harden_resa_call_rls_and_fk_indexes` | Versão exacta |
| `20261006_proactive_automation_layer.sql` | `20261006183647 — 20261006_proactive_automation_layer` | Nome correspondente; versão difere |
| `20261006_resa_social_graph_discovery.sql` | `20261006084432 — resa_social_graph_discovery` | Nome correspondente; versão difere |
| `20261006_spiritual_phase2_devotion_growth.sql` | `20261006144713 — 20261006_spiritual_phase2_devotion_growth` | Nome correspondente; versão difere |
| `20261006_translation_cache_foundation.sql` | `20261006183709 — 20261006_translation_cache_foundation` | Nome correspondente; versão difere |
| `20261007102000_harden_profiles_table_grants.sql` | `20261007092645 — harden_profiles_table_grants` | Nome correspondente; versão difere |
| `20261007133000_hr_payroll_finance_foundation.sql` | `20261007132955 — hr_payroll_finance_foundation` | Nome correspondente; versão difere |
| `20261007154500_hierarchical_hr_finance_access.sql` | `20261007143924 — 20261007154500_hierarchical_hr_finance_access` | Nome correspondente; versão difere |
| `20261007160000_payroll_approval_policy.sql` | `20261007144137 — 20261007160000_payroll_approval_policy` | Nome correspondente; versão difere |
| `20261007163000_hr_documents_integrity.sql` | `20261007150116 — 20261007163000_hr_documents_integrity` | Nome correspondente; versão difere |
| `20261007164000_payroll_statutory_rules.sql` | `20261007150121 — 20261007164000_payroll_statutory_rules` | Nome correspondente; versão difere |
| `20261007170000_harden_leave_approval_rls.sql` | `20261007153704 — harden_leave_approval_rls` | Nome correspondente; versão difere |
| `20261008202205_organization_owner_role_authorization_v3.sql` | `20261008202205 — organization_owner_role_authorization_v3` | Versão exacta |
| `20261011093824_sabbath_school_current_lesson_cover.sql` | `20261011093824 — 20261011150000_sabbath_school_current_lesson_cover` | Versão exacta; nome remoto contém prefixo adicional |
| `20261011102803_youth_club_operational_foundation.sql` | `20261011102803 — 20261011110000_youth_club_operational_foundation` | Versão exacta; nome remoto contém prefixo adicional |
| `20261011104445_youth_progression_and_investitures.sql` | `20261011104445 — 20261011120000_youth_progression_and_investitures` | Versão exacta; nome remoto contém prefixo adicional |
| `20261011104458_youth_activities_and_reporting.sql` | `20261011104458 — 20261011130000_youth_activities_and_reporting` | Versão exacta; nome remoto contém prefixo adicional |
| `20261011104505_youth_membership_history_retention.sql` | `20261011104505 — 20261011140000_youth_membership_history_retention` | Versão exacta; nome remoto contém prefixo adicional |
| `20261011104603_resa_conversation_creation_rls.sql` | `20261011104603 — 20261011160000_resa_conversation_creation_rls` | Versão exacta; nome remoto contém prefixo adicional |
| `20261013155000_resa_atomic_conversation_creation.sql` | `20261013155000 — resa_atomic_conversation_creation` | Versão exacta |
| `20261013181919_resa_prevent_unauthorized_conversation_join.sql` | `20261013181919 — resa_prevent_unauthorized_conversation_join` | Versão exacta |
| `20261013182118_resa_restrict_conversation_member_updates.sql` | `20261013182118 — resa_restrict_conversation_member_updates` | Versão exacta |

## Ficheiros locais sem correspondência exacta de nome

- `20260930_foundation_core.sql`
- `20260930_meeting_realtime_authorization.sql`
- `20261002_ministry_administration.sql`
- `20261002_schedule_zion_jobs_worker.sql`
- `20261006190000_spiritual_canonical_content.sql`
- `20261006200000_harden_resa_search_profiles.sql`
- `20261006202000_harden_spiritual_growth_rls.sql`
- `20261006204500_fix_resa_community_rls_recursion.sql`
- `20261007094500_harden_search_rpc_privacy.sql`
- `20261007120000_normalize_profile_locale.sql`
- `20261008210000_resa_messaging_calling_convergence.sql`
- `20261009100000_reconcile_ministry_administration.sql`
- `20261009110000_bootstrap_org_ownership_departments.sql`
- `20261009120000_finance_atomic_journal.sql`
- `20261011100000_ministry_profile_management.sql`
- `20261012173000_bible_review_schedule_sync.sql`

## Registos remotos sem correspondência exacta de nome

- `20260930132113 — 20260930_identity_bootstrap_policies`
- `20260930134441 — organization_unit_membership_management`
- `20260930135409 — governance_core`
- `20260930135432 — governance_quorum`
- `20260930140853 — institutional_meeting_room_core`
- `20260930141849 — harden_meeting_control_trigger_search_path`
- `20261002071722 — resa_moderation_permission`
- `20261003192615 — 20261003_production_fk_indexes`
- `20261005055350 — resa_prayer_production`
- `20261005073824 — resa_calls_and_realtime_signaling`
- `20261005073855 — fix_call_participant_rls_recursion`
- `20261006064350 — 20261006_profile_privacy_production`
- `20261006064627 — harden_security_definer_execute_privileges`
- `20261007133003 — harden_finance_validation_function`
- `20261007133204 — harden_finance_validation_function_execute`

## Verificação adicional já observada

O esquema de produção contém tabelas de organizações, unidades, vínculos, ministérios, relatórios ministeriais, finanças, conteúdo espiritual, actividades e progressão juvenil. A presença de uma tabela não prova que todas as alterações de uma migração local correspondente tenham sido aplicadas; a ausência de um nome exacto no histórico também não prova que o SQL nunca tenha sido executado.

## Próximos passos seguros

1. Comparar o conteúdo de cada um dos 16 ficheiros locais sem correspondência com o conteúdo e os efeitos das migrações remotas candidatas.
2. Comparar funções, índices, constraints, triggers, grants e políticas RLS reais com os objectivos dessas migrações.
3. Atribuir a cada ficheiro um estado baseado em evidência: `correspondência confirmada`, `parcial`, `aplicada sob outro nome`, `não aplicada` ou `indeterminada`.
4. Não inserir linhas artificialmente em `schema_migrations`, não renomear migrações aplicadas e não executar `db push` para “resolver” a contagem.
5. Depois de reconciliar, criar migrações novas apenas para diferenças reais e verificar em ambiente de teste antes da produção.
