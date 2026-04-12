# Pendencias Humanas - FrotaViva FIRE Block

Data: 2026-04-12
Status: AGUARDANDO execucao humana
Contexto: auditoria multi-agente identificou 8 itens criticos, @devops executou 6 commits locais. Faltam acoes que exigem browser/credenciais.

---

## Pre-requisitos

- Acesso ao Supabase Dashboard (projeto `bsjuntynmnlhbvxemxqp`)
- Acesso ao Vercel Dashboard (projeto `siga-bem`)
- Acesso ao GitHub repo `guibertolo/siga-bem` (settings/secrets)
- Claude Code aberto em `C:/Users/guiro/OneDrive/Documentos/Claude/` (raiz do aiox-core)
- Dev server parado (nao precisa estar rodando)

---

## Passo 1: Cleanup check de fechamento_item

**Onde:** Supabase SQL Editor
**URL:** https://supabase.com/dashboard/project/bsjuntynmnlhbvxemxqp/sql/new

**O que fazer:**
1. Abrir o link acima
2. Colar e executar:

```sql
SELECT referencia_id, COUNT(*) AS ocorrencias
FROM fechamento_item
WHERE tipo = 'viagem'
GROUP BY referencia_id
HAVING COUNT(*) > 1;
```

3. Verificar resultado:

| Resultado | Acao |
|-----------|------|
| **Vazio (0 linhas)** | Tudo limpo, seguir pro Passo 2 |
| **Retornou linhas** | Ha viagens duplicadas em 2+ fechamentos. Pedir ajuda ao Claude Code antes de continuar (ele resolve a limpeza) |

**Por que:** a migration FIRE cria um UNIQUE INDEX em `fechamento_item(referencia_id) WHERE tipo='viagem'`. Se existir duplicata, o INDEX falha e a migration inteira aborta.

---

## Passo 2: Rotacionar service_role JWT no Supabase

**Onde:** Supabase API Settings
**URL:** https://supabase.com/dashboard/project/bsjuntynmnlhbvxemxqp/settings/api

**O que fazer:**
1. Abrir o link acima
2. Rolar ate a secao **Project API keys**
3. Achar a linha `service_role` (nao confundir com `anon`)
4. Clicar em **Reset** (ou **Rotate**)
5. Confirmar a rotacao
6. **COPIAR O TOKEN NOVO** (vai precisar nos proximos passos)

**IMPORTANTE:** apos rotacionar, o token antigo (que esta exposto no historico git) fica INVALIDO imediatamente. Isso e o objetivo. O deploy atual em Vercel vai parar de funcionar ate voce atualizar la (passo 3). Se tiver usuarios ativos, avise antes.

**Guardar o token novo em local seguro** (notepad temporario, 1Password, etc). Voce vai colar ele em 3 lugares.

---

## Passo 3: Atualizar token em 3 lugares

### 3A. Arquivo .env.local (local)

No Claude Code, rodar:

```
! cd apps/siga-bem && nano .env.local
```

Ou pedir pro Claude editar:

> "Atualiza o SUPABASE_SERVICE_ROLE_KEY no .env.local pra <token-novo>"

(Colar o token novo no lugar do antigo na linha `SUPABASE_SERVICE_ROLE_KEY=...`)

### 3B. Vercel Dashboard (producao + preview + development)

**URL:** https://vercel.com/guibertolo/siga-bem/settings/environment-variables

1. Abrir o link
2. Achar `SUPABASE_SERVICE_ROLE_KEY`
3. Clicar no icone de editar (caneta)
4. Colar o token novo
5. Garantir que esta marcado para: **Production**, **Preview**, **Development**
6. Salvar

**Alternativa via CLI** (se instalar vercel depois):
```bash
cd apps/siga-bem
npm i -g vercel  # se nao tiver
vercel env rm SUPABASE_SERVICE_ROLE_KEY production
vercel env add SUPABASE_SERVICE_ROLE_KEY production
# colar token quando perguntar
# repetir pra preview e development
```

### 3C. GitHub Actions Secrets

**URL:** https://github.com/guibertolo/siga-bem/settings/secrets/actions

1. Abrir o link
2. Achar `SUPABASE_SERVICE_ROLE_KEY` (se existir)
3. Clicar em **Update**
4. Colar o token novo
5. Salvar

Se NAO existir (o CI talvez use outro mecanismo), pular este sub-passo.

---

## Passo 4: Aplicar migration FIRE

**Onde:** terminal (Claude Code ou bash)

Depois de confirmar que o Passo 1 voltou vazio E o Passo 2+3 estao feitos:

```bash
cd apps/siga-bem
npx supabase db push
```

Se pedir login do Supabase CLI:
```bash
npx supabase login
# colar o access token do Supabase (diferente do service_role!)
# URL: https://supabase.com/dashboard/account/tokens
```

**Verificacao apos aplicar:**

Voltar ao Supabase Dashboard e conferir:

1. **Storage policies** (Database > Policies > storage.objects):
   - As 4 policies inseguras sumiram ("Users can upload/view/update/delete comprovantes")
   - As 3 seguras continuam ("Upload comprovante na pasta da empresa", "Leitura comprovante da propria empresa", "Deletar comprovante da propria empresa")

2. **Funcao** (Database > Functions):
   - `fn_calcular_fechamento` agora tem bloco de validacao `IF NOT EXISTS` no inicio

3. **Indice** (Database > Indexes em `fechamento_item`):
   - `idx_fechamento_item_viagem_unique` existe

---

## Passo 5: Commit do .gitignore + push de tudo

**Onde:** Claude Code

Pedir pro Claude:

> "Commita o .gitignore atualizado e faz push de tudo"

Ele vai:
1. `git add .gitignore`
2. `git commit -m "chore: add lighthouse reports to gitignore"`
3. `git push origin main` (6 commits do @devops + 1 do gitignore = 7 commits)

**O CI corrigido vai rodar no push.** Pode falhar por causa dos 9 erros de lint pre-existentes (nao introduzidos por nos). Isso vira story 14.1 (lint cleanup). Nao bloqueia o FIRE.

---

## Passo 6: Validar em producao

Depois do push + Vercel redeployar automaticamente:

1. Abrir https://siga-bem-rosy.vercel.app
2. Logar como dono1@frotaviva.com.br / Teste2026!
3. **Testar upload de comprovante:** ir em Gastos > qualquer gasto > adicionar comprovante (foto JPG). Deve funcionar
4. **Testar sidebar:** badges de "viagens em andamento" devem estar visiveis (classes Tailwind corrigidas)
5. **Testar multi-empresa:** se tiver 2+ empresas, trocar empresa no switcher e verificar que dados mudam

Se algo quebrar, o rollback e simples:
```bash
cd apps/siga-bem
git revert HEAD~7..HEAD --no-commit
git commit -m "revert: rollback FIRE block"
git push origin main
```

---

## Passo 7 (OPCIONAL): Limpar historico git

**NAO RECOMENDADO.** O token antigo ja esta invalido apos o Passo 2. Limpar historico e destrutivo (force-push, colaboradores precisam reclonar).

Se mesmo assim quiser:
```bash
pip install git-filter-repo
cd apps/siga-bem
git filter-repo --replace-text <(echo 'eyJhbGciOiJI==>***REDACTED***') --force
git push origin main --force
```

---

## Resumo visual

```
Passo 1: SQL Editor — cleanup check .............. [ ]
Passo 2: Supabase — rotacionar JWT ............... [ ]
Passo 3A: .env.local — atualizar token ........... [ ]
Passo 3B: Vercel Dashboard — atualizar token ...... [ ]
Passo 3C: GitHub Secrets — atualizar token ........ [ ]
Passo 4: Terminal — supabase db push .............. [ ]
Passo 5: Claude Code — commit + push ............. [ ]
Passo 6: Browser — validar em producao ........... [ ]
Passo 7: (opcional) — limpar historico git ........ [ ]
```

Tempo estimado: ~20 minutos (passos 1-6)

---

## Apos completar

Pedir ao Claude:

> "Pendencias humanas do FIRE resolvidas, vamos comecar a atacar stories"

Ele vai:
1. Confirmar que CI passou
2. Perguntar qual story quer comecar (9 estao sprint-0-ready)
3. Sugerir track backend (14.1) ou frontend (11.1 / 15.1)

---

## Documentos de referencia desta sessao

| Documento | Path |
|-----------|------|
| Architecture Audit | `docs/review/2026-04-12/architecture-audit.md` |
| Database Audit | `docs/review/2026-04-12/db-audit.md` |
| UX Audit | `docs/review/2026-04-12/ux-audit.md` |
| QA Audit | `docs/review/2026-04-12/qa-audit.md` |
| Competitive Audit | `docs/review/2026-04-12/competitive-audit.md` |
| Consolidated Roadmap | `docs/review/2026-04-12/consolidated-roadmap.md` |
| FIRE Execution Report | `docs/review/2026-04-12/fire-block-execution.md` |
| Naming Analysis | `docs/research/naming-analysis-2026-04-12.md` |
| INPI Availability | `docs/research/inpi-availability-2026-04-12.md` |
| Stories Index | `docs/stories/active/_INDEX-2026-04-12.md` |
| **Este checklist** | `docs/review/2026-04-12/pendencias-humanas-checklist.md` |
