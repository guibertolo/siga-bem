# Security Squad Briefing — FrotaViva (apps/siga-bem)

**Data:** 2026-05-16
**Driver project status:** Pre-piloto. SaaS multi-tenant com PII real de motoristas (CPF, CNH, foto).

> **REGRA OBRIGATÓRIA:** Esta documentação deve ser lida pelo `security-director` (ou qualquer especialista do security-squad) ANTES de propor solução, refatoração, auditoria ou implementação em `apps/siga-bem/`. Sem ler isto, a skill pode propor desfazer decisões já tomadas, repetir caminhos descartados, ou ignorar débito conhecido.
>
> **Cross-reference:** Skills do squad estão em `.claude/skills/security-squad/`. Routing rule em `.claude/rules/security-squad-routing.md`. Quality gate em `.aiox-core/development/checklists/security-quality-gate.md`.

---

## Sumário (1 minuto)

FrotaViva é SaaS multi-tenant para gestão de frotas (transportadoras cegonheiras). Stack Next.js 16 + Supabase + Vercel. Coleta PII sensível: CPF, CNH, foto de motorista, dados de viagens com placa de veículo. LGPD aplica fully. Em pre-piloto com frota real do tio do owner. Audit completa 2026-04-14 identificou 29 findings com 2 CRITICAL pendentes (não fixadas). Tokens marcados temporários há 34+ dias sem rotação documentada. LGPD: sem cookie banner, sem /privacidade. Public launch bloqueado por estas pendências.

---

## Stack atual

**Frontend / Backend:**
- Next.js 16 (App Router + Turbopack)
- React 19
- Tailwind v4
- Server Actions + Route Handlers

**Auth + DB:**
- Supabase Auth (magic link + email/password)
- Postgres com RLS (Supabase managed)
- Supabase Storage para uploads (bucket `comprovantes`)
- Custom JWT claims via Auth Hook (`empresa_id` em `app_metadata`)

**LLM (Copilot Epic 9):**
- Provider chain: Gemini Free → Groq → Anthropic (per memória)
- Vercel AI SDK
- Tools com belt-and-suspenders `empresaIds` validation
- Embeddings: Voyage AI

**Hosting:**
- Vercel (Production scope + Preview)
- Custom domain: frotaviva.com.br (ou TBD per status pre-launch)

**Observability:**
- Sentry (SEM beforeSend pra strip PII — finding H6)
- Vercel Analytics

**Repo:**
- guibertolo/siga-bem (privado)
- Branch protection ativa em main? (verificar)

---

## Findings ATIVOS da Audit 2026-04-14

Source: `project_frotaviva_security_audit.md` na memória pessoal.

### 🚨 CRITICAL — bloqueia piloto

#### C1: Bucket `comprovantes` RLS dropped
- **Arquivo:** Migration `20260412120000_fire_block_security_fixes.sql:44-47`
- **Status:** Indeterminado — policies dropadas e nunca recriadas
- **Risco:** Cross-tenant leak via Storage OU upload broken em prod
- **Fix:** Recriar policies SELECT/INSERT/UPDATE/DELETE pra bucket `comprovantes` com check `(storage.foldername(name))[1] = current_empresa_id()::text`
- **Owner skill:** `security-squad:database-rls-specialist` + `cloud-platform-guard`
- **Severidade:** CRITICAL (bloqueia piloto)

#### C2: `multi-empresa-query.ts` usa service_role
- **Arquivo:** `lib/queries/multi-empresa-query.ts:28,37`
- **Status:** Em produção
- **Risco:** Single missing `.eq('empresa_id', ...)` em caller = full cross-tenant leak
- **Callers afetados:** 11 server actions (per finding H2 da audit)
- **Fix:** Helper `withEmpresa({ supabase, empresaId }) => ...` que força validation. Migrar 11 callers. Adicionar Semgrep custom rule.
- **Owner skill:** `security-squad:database-rls-specialist` + `appsec-engineer`
- **Severidade:** CRITICAL (bloqueia piloto)

### ⚠️ HIGH — recomendado pre-piloto

#### H1: View `view_viagens_ativas` sem `security_invoker`
- **Risco:** Roda como superuser, ignora RLS
- **Fix:** `CREATE OR REPLACE VIEW ... WITH (security_invoker = true)`
- **Owner:** `database-rls-specialist`

#### H2: 11 server actions sem defense-in-depth empresa_id
- **Risco:** RLS é único barrier, single point of failure
- **Fix:** Padronizar via `withEmpresa` helper
- **Owner:** `appsec-engineer` + `database-rls-specialist`

#### H6: Sentry sem `beforeSend` scrubber
- **Risco:** CPF, CNPJ, email, CNH indo pra Sentry (third-party)
- **Fix:** Implementar `beforeSend` com regex pra strip PII
- **Owner:** `cloud-platform-guard` + `privacy-lgpd`

#### H7: CI sem secrets Sentry
- **Risco:** Source maps podem shippar em bundle (visível em DevTools)
- **Fix:** Configurar `SENTRY_AUTH_TOKEN` em GitHub Secrets + Sentry release upload
- **Owner:** `devsecops` + `cloud-platform-guard`

### Outros findings da audit (24 itens)

Consultar `project_frotaviva_security_audit.md` na memória pessoal pra detalhes completos. Distribuídos como:
- 4 MEDIUM (M10 cookie banner, M11 preview protection, M12 Zod só Node, M13 ...)
- ~15 LOW
- ~5 INFO

---

## Tokens — rotation pending (status 2026-05-16)

Per `project_tokens_temporarios.md`:

| Token | Marcação | Last rotation | Action |
|-------|----------|---------------|--------|
| Supabase anon key | Temporário | Não documentada | Verificar via Dashboard |
| Supabase service_role | Temporário | Não documentada | URGENT rotation antes piloto |
| Supabase CLI token | Expires Jun 2026 | N/A | Rotacionar quando próximo |
| Vercel deploy token | Temporário | Não documentada | Rotacionar |
| GROQ_API_KEY | Temporário | Não documentada | Rotacionar |
| ANTHROPIC_API_KEY | Temporário | Não documentada | Rotacionar |
| GEMINI_API_KEY | Free tier | N/A | **REMOVER do chain por LGPD risk** |

**34+ dias sem rotação documentada.** Pre-piloto: rotacionar TODOS via playbook documentado.

Owner skill: `security-squad:cloud-platform-guard` + `devsecops` pra orchestrate rotation.

---

## LGPD — gaps conhecidos

- [ ] Cookie banner ausente (M10)
- [ ] Página `/privacidade` ausente
- [ ] DPIA do Copilot LLM pendente (processa PII com LLM)
- [ ] LIA documentada para analytics (legítimo interesse)
- [ ] Endpoint `/api/me/export` (Art. 18 II + V)
- [ ] Endpoint `/api/me/delete` cascata (Art. 18 IV + VI)
- [ ] Endpoint `/api/me/consent` (Art. 18 IX)
- [ ] Vendor DPA review (Vercel, Supabase, Anthropic, Groq, Sentry, Resend)
- [ ] Email `privacidade@frotaviva.com.br` setup + monitored
- [ ] DPO designado (pode ser owner pra escala pequena)

Owner skill: `security-squad:privacy-lgpd` pra plano completo. Pre-piloto BLOQUEADO sem cookie banner + /privacidade + endpoints SAR mínimos.

---

## Decisões arquiteturais aceitas

### Multi-tenant via `empresa_id` em `app_metadata`
- Custom JWT claim via Auth Hook (`custom_access_token_hook`)
- RLS policies usam `current_empresa_id()` helper function
- Performance > query subselect em cada policy
- **Não mudar** este padrão sem discussão arquitetural

### Service_role para queries multi-empresa (sob auditoria)
- `lib/queries/multi-empresa-query.ts` usa service_role
- Helper futuro `withEmpresa` deve substituir esse approach
- service_role permanece em jobs/admin/cron, NÃO em request flow

### Defense-in-depth (belt + suspenders)
- RLS é layer 1
- App layer também valida `empresa_id`
- Audit log de ações sensíveis
- Sem layer único de proteção

### Copilot LLM com tool authorization
- Cada tool valida `empresaIds` do caller
- "Belt and suspenders" pattern já implementado
- NÃO regredir esta validation

---

## Hotfixes históricos (lessons learned)

### 2026-04-12 — Migration "fire-block-security-fixes"
- Tentativa de fix em massa de findings sec
- Migration `20260412120000` DROPOU policies de Storage sem recriar
- Resultou em C1 atual
- **Lição:** migrations security devem ter pgTAP test confirmando policies funcionando post-migration

### 2026-04-14 — Audit completa
- 29 findings identificadas
- Roadmap consolidado em `docs/review/2026-04-12/consolidated-roadmap.md`
- 13 stories ativas em `docs/stories/active/`

### Token rotation overdue (34+ dias)
- Tokens marcados temporários em Abril 2026
- Sem rotation efetuada ainda
- **Lição:** Token rotation precisa de cadence formal + reminder system

---

## Padrões aceitos / preferidos

| Padrão | Status |
|--------|--------|
| Server Actions com Zod schema input | OBRIGATÓRIO |
| RLS em cada tabela com PII | OBRIGATÓRIO |
| `WITH CHECK` em UPDATE/INSERT policies | OBRIGATÓRIO |
| Custom JWT claim via Auth Hook | ESTABELECIDO |
| Defense-in-depth (RLS + app layer) | OBRIGATÓRIO |
| Pre-commit hook (lint + typecheck + test) | INSTALADO |
| Quality gates pre-merge (lint + typecheck + test + check-ptbr) | INSTALADO |
| Gitleaks pre-commit | PENDENTE — implementar via `devsecops` |
| Semgrep em CI | PENDENTE — implementar |
| OSV-Scanner em CI | PENDENTE — implementar |
| pgTAP RLS test suite | INCOMPLETO — só SELECT em 4 tabelas |
| Audit log de ações sensíveis | INCOMPLETO — somente algumas |
| Sentry `beforeSend` PII scrub | PENDENTE (H6) |
| Custom domain + Force HTTPS | TBD |
| security.txt | NÃO IMPLEMENTADO |

---

## Padrões a EVITAR / armadilhas conhecidas

- ❌ `service_role` em código que roda em browser (verificado: grep limpo)
- ❌ `NEXT_PUBLIC_*` com valor secret real
- ❌ Query sem `.eq('empresa_id', ...)` em service_role context
- ❌ Migration que DROP policies sem recriar
- ❌ UPDATE policy sem WITH CHECK (permite shift empresa_id)
- ❌ View sem `security_invoker = true`
- ❌ Function SECURITY DEFINER sem `SET search_path`
- ❌ Claim sensível em `user_metadata` (user pode editar)
- ❌ `console.log(process.env)` em produção
- ❌ Provider chain inclui Gemini Free (LGPD training risk)
- ❌ Hardcoded CPF/CNH/email em logs
- ❌ `git push --no-verify` sem motivo claro

---

## Roadmap de segurança sugerido (pre-piloto)

### Sprint 1 — Blockers (CRITICAL)
- [ ] Fix C1 (bucket comprovantes RLS) via `database-rls-specialist`
- [ ] Fix C2 (helper `withEmpresa` + migrar 11 callers) via `database-rls-specialist` + `appsec-engineer`
- [ ] Audit imediato: search por pattern similar em outros queries

### Sprint 2 — LGPD foundations
- [ ] Cookie banner (per `privacy-lgpd`)
- [ ] /privacidade page (template no skill)
- [ ] Endpoint /api/me/export
- [ ] Endpoint /api/me/delete (cascade)
- [ ] Email privacidade@frotaviva setup

### Sprint 3 — DevSecOps bootstrap
- [ ] gitleaks pre-commit
- [ ] Semgrep CI
- [ ] OSV-Scanner CI
- [ ] Dependabot config
- [ ] Branch protection com required checks
- [ ] Sentry beforeSend scrubber

### Sprint 4 — Hardening + tests
- [ ] pgTAP test suite cross-tenant (8 cenários × 12 tabelas) per `database-rls-specialist`
- [ ] Token rotation playbook + execute
- [ ] Audit log completo
- [ ] CSP via middleware
- [ ] Security headers full

### Sprint 5 — Pre-launch
- [ ] DPIA Copilot
- [ ] Smoke pentest (não Claimed) per `offensive-pentest`
- [ ] Migrar Gemini Free → Gemini Paid OU remover do chain
- [ ] Token rotation playbook automated
- [ ] IR runbook documented

### Go-live readiness checklist
- [ ] Todos itens Sprint 1-5 verde
- [ ] security-quality-gate.md PASS
- [ ] LGPD compliance documented
- [ ] Backup restore tested
- [ ] Status page setup
- [ ] Vendor DPAs reviewed

---

## Contatos / Stakeholders

- **Owner:** Guilherme Bertolo
- **Pre-piloto user:** Tio (transportadora real)
- **DPO:** Owner (até escalar)
- **Email privacidade:** privacidade@frotaviva.com.br (pendente setup)
- **Email security:** security@frotaviva.com.br (pendente setup)

## Updates a este briefing

Atualizar sempre que:
- Finding novo de audit
- Hotfix de prod aplicado
- Decisão arquitetural significativa
- LGPD policy mudança
- Vendor adicionado/removido
- Token rotation executada

**Owner do update:** quem fez a mudança (não user). Append em "Histórico de updates" abaixo.

---

## Histórico de updates

| Data | Update | Por quem |
|------|--------|----------|
| 2026-05-16 | Briefing inicial criado junto com security-squad creation | security-squad creation |
