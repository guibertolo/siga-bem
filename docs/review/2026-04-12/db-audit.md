# Auditoria da Camada de Dados - FrotaViva

**Data:** 2026-04-12
**Auditor:** Dara (AIOX Data Engineer)
**Escopo:** Schema Supabase, RLS, indices, queries, integridade, multi-empresa, storage
**Profundidade:** Media (top 15-25 achados classificados)
**Stack auditada:** Next.js 16 + Supabase Postgres + RLS + TypeScript

## Legenda

| Severidade | Significado |
|------------|-------------|
| CRITICO | Vulnerabilidade ativa ou risco iminente de corrupcao/vazamento |
| ALTO | Falha arquitetural, bug funcional ou risco alto de performance |
| MEDIO | Divergencia de best practice, debito tecnico notavel |
| BAIXO | Polimento, consistencia, melhoria incremental |

Esforco: S (ate 2h), M (meio dia), L (dia inteiro ou mais).
Impacto: S (reduz irritacao), M (destrava feature ou corrige bug real), L (fecha vetor de ataque ou evita incidente sev1).

---

## Sumario Executivo (5 linhas para lead)

1. **CRITICO**: JWT `service_role` hardcoded em 4 scripts `scripts/seed-*.js` e commitado no repo. Qualquer pessoa com acesso ao repo (ou historico) tem bypass total de RLS na producao. Rotacao imediata.
2. **ALTO**: Fluxo multi-empresa usa `admin client` (service_role bypassa RLS) iterando sobre `usuario.selected_empresas`, que so e validado na escrita. Se um `usuario_empresa.ativo` for revogado depois, o array antigo continua concedendo acesso cross-tenant. Padrao cinto-e-suspensorio violado.
3. **ALTO**: Queries do BI (`app/(dashboard)/bi/actions.ts`, ~27 `supabase.from(...)` em `viagem`/`gasto`) confiam apenas em RLS. Zero filtro explicito `empresa_id`. Inconsistencia grave com outros modulos e amplifica risco caso RLS afrouxe por descuido.
4. **ALTO**: O diff nao commitado em `fechamentos/actions.ts` + `multi-actions.ts` tem bug de logica: viagens em fechamento `aberto` ou `fechado` sao marcadas como "pendentes de acerto" e podem ser duplamente lancadas em novos fechamentos, gerando pagamentos em dobro.
5. **ALTO**: Sem tabela `audit_log`. Fluxo `aberto -> fechado -> pago` e multi-empresa nao deixam rastro. `usuario` e `empresa` podem ser editados sem historico.

---

## Top Achados (ordenados por severidade)

### 1. CRITICO - service_role JWT hardcoded e commitado em scripts de seed

**Arquivos/linhas:**
- `scripts/seed-dados-ricos.js:13-14`
- `scripts/seed-test-accounts.js:17-18`
- `scripts/seed-simulacao-semana.js:17-18`
- `scripts/seed-frota-viva.js:10`

```js
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY ||
  'eyJhbGciOiJIUzI1NiIs... (JWT completo commitado)';
```

**Impacto:** O JWT tem `exp: 2090-xx`. Qualquer pessoa com acesso ao repo (ou ao git history apos rotacao) pode ler e modificar toda a base de producao do projeto `bsjuntynmnlhbvxemxqp.supabase.co`, bypassando 100% das RLS. Vaza todos os CNPJs, CPFs, valores financeiros e comprovantes. Pior ainda: o fallback `||` torna a key o valor default, entao rodar o script num ambiente sem env var ainda funciona contra producao.

**Rationale:** A memoria do projeto ja documenta que `project_tokens_temporarios.md` planeja rotacao - mas o debito continua ativo no codigo. Tambem e uma gotcha recorrente do Supabase: service_role e basicamente senha root do banco.

**Proposta:**
1. Rotacionar `SUPABASE_SERVICE_ROLE_KEY` no dashboard Supabase AGORA (invalida o JWT commitado).
2. Remover fallback literal dos 4 scripts, falhar se env var nao setada:

```js
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!SERVICE_ROLE_KEY) {
  console.error('SUPABASE_SERVICE_ROLE_KEY nao definida. Abortando.');
  process.exit(1);
}
```

3. Criar `.env.local.example` com placeholder, garantir `.env*` no `.gitignore` (ja deve estar pelo Next, verificar).
4. Usar `git filter-repo` ou `bfg` para limpar a key do historico apos rotacao (sem isso, dump do repo ainda vaza).
5. Opcional: commit hook pra bloquear strings que parecem JWT.

**Esforco:** M (rotacao + clean history + update scripts)
**Impacto:** L (fecha vetor de acesso root)

---

### 2. CRITICO - Multi-empresa com admin client e validacao TOCTOU

**Arquivos:** `lib/queries/multi-empresa-query.ts:26-49`, `app/(dashboard)/empresa/multi-select-actions.ts:30-42`, `lib/supabase/admin.ts`

O fluxo e:
1. Usuario escolhe empresas -> `setSelectedEmpresas()` valida contra `usuario_empresa` (ok nesse momento)
2. Salva array em `usuario.selected_empresas` (coluna `UUID[]`)
3. Toda leitura multi-empresa passa por `queryMultiEmpresa` que usa **admin client (bypassa RLS)** e itera pelo array cacheado

**Problema:** Entre o `setSelectedEmpresas` e uma query qualquer depois, o dono da empresa B pode ter revogado (`UPDATE usuario_empresa SET ativo = false`) o acesso do usuario - mas `selected_empresas` continua apontando pra ela, e como o leitura usa admin client, os dados continuam vazando. Nao ha re-checagem no path de leitura.

**Impacto:** Vazamento cross-tenant ativo enquanto o array nao for limpo. Se o usuario tiver sido admin convidado e for removido, ele continua vendo financeiro, BI, fechamentos, viagens, gastos da empresa ate relogar ou alguem chamar `clearSelectedEmpresas`. Em auditoria LGPD isso e um incidente reportavel.

**Rationale:** Padrao "cinto-e-suspensorio" exige que a leitura tambem valide. Usar service_role para bypass de RLS em fluxo de leitura e uma red flag forte - o natural seria fazer N queries com RLS ativo, uma por empresa, trocando contexto via `fn_switch_empresa`, ou simplesmente passando `empresa_id` no filtro e deixando RLS fazer o trabalho (a funcao `fn_get_empresa_id` ja retorna a empresa ativa atual, entao precisaria de uma variacao).

**Proposta (curto prazo - patch):**
Em `queryMultiEmpresa`, antes de iterar, reconsultar `usuario_empresa` e interseccionar com o array:

```ts
// Em queryMultiEmpresa, apos ler ctx
const supabase = await createClient();  // client com auth, RLS ativo
const { data: bindings } = await supabase
  .from('usuario_empresa')
  .select('empresa_id')
  .eq('ativo', true);
const validIds = new Set((bindings ?? []).map(b => b.empresa_id));
const safeIds = ctx.empresaIds.filter(id => validIds.has(id));
if (safeIds.length !== ctx.empresaIds.length) {
  // Limpar selected_empresas stale em background, ou so ignorar
}
```

**Proposta (medio prazo):** Abandonar admin client no path de leitura multi-empresa. Criar helper `fn_get_query_empresas()` STABLE SECURITY DEFINER que retorna array de empresas validas (interseccao de `selected_empresas` com `usuario_empresa.ativo=true`). Trocar RLS de tabelas sensiveis de `empresa_id = fn_get_empresa_id()` para `empresa_id = ANY(fn_get_query_empresas())`. A partir dai as queries vivem com RLS, sem service_role.

**Esforco:** curto prazo S, medio prazo L
**Impacto:** L (fecha vetor de cross-tenant ativo)

---

### 3. ALTO - Diff nao commitado em fechamentos: bug de logica, nao so de filtro

**Arquivos:** `app/(dashboard)/fechamentos/actions.ts:291-315`, `multi-actions.ts:30-54`

Diff altera `getViagensPendentesAcerto` pra so considerar uma viagem como "ja acertada" se ela estiver ligada a `fechamento_item` cujo `fechamento.status = 'pago'`.

**Analise de correcao:**

a) **Bug semantico grave**: Uma viagem que ja esta em fechamento `aberto` ou `fechado` (em processo de pagamento) sera reapresentada como "pendente". O dono pode criar um SEGUNDO fechamento incluindo a mesma viagem, e o sistema nao bloqueia isso (nao ha unique em `fechamento_item(referencia_id, tipo)` quando a referencia e viagem). Resultado: motorista recebe 2x pelo mesmo frete no momento em que ambos fechamentos virarem `pago`.

b) **Race condition**: Duas sessoes do dono (ou dono + gestor) abrindo a tela "viagens pendentes" ao mesmo tempo, cada uma criando fechamento pro mesmo motorista - a unica defesa e o check de overlap no periodo, mas ele e por janela de datas (`createFechamento` linhas 410-423), nao por viagem. Se periodos forem diferentes mas contiverem a mesma viagem, ambos passam.

c) **Viagem presa em fechamento cancelado**: Nao existe status `cancelado` em `fechamento_status` (apenas `aberto | fechado | pago`). Se `fechamento` for deletado (so permitido com status=`aberto`, cascade em `fechamento_item`), entao a viagem volta sim pra lista pendente. OK aqui.

d) **Indice**: A query nova faz `.eq('empresa_id').eq('status', 'pago')` em fechamento. O indice `idx_fechamento_status` e apenas em `(status)` - baixa seletividade quando a maioria dos fechamentos esta `pago`. Ja existe `idx_fechamento_empresa_motorista` mas nao cobre status. Recomendo indice parcial.

**Proposta:**

Patch imediato (semantico):

```ts
// Em vez de filtrar por "pago", filtrar por qualquer fechamento nao-deletado
// (ja esta ligado a um fechamento = nao aparece como pendente)
// OU mudar a UI pra mostrar 3 colunas: "nunca acertadas", "em fechamento aberto/fechado", "pagas"
```

Deixar o filtro atual apenas se a UX for "mostrar tudo que ainda nao virou dinheiro no bolso do motorista" - mas ai precisa de constraint unica pra evitar duplicidade:

```sql
-- Migration proposta (nao executar ainda)
CREATE UNIQUE INDEX uq_fechamento_item_viagem_nao_duplicada
  ON fechamento_item (referencia_id)
  WHERE tipo = 'viagem';
```

**Atencao**: esse unique index bloqueia o reaparecimento em um 2o fechamento. Se o product decidir que "pago" e quem libera, entao ao mudar fechamento pra `pago` nao haveria problema - mas viagens em `aberto` teriam que ser bloqueadas via logica de app. Discutir com PO.

Indice para performance do filtro:

```sql
CREATE INDEX idx_fechamento_empresa_status_pago
  ON fechamento (empresa_id)
  WHERE status = 'pago';
```

**Esforco:** M (patch semantico + migration + testes)
**Impacto:** L (evita pagamento em dobro para motorista)

---

### 4. ALTO - BI confia apenas em RLS, sem filtro empresa_id explicito

**Arquivo:** `app/(dashboard)/bi/actions.ts` (2069 linhas). Grep em `empresa_id` retorna 9 ocorrencias, mas 4 sao em `caminhao`/`motorista` e 1 e no `or()` do `categoria_gasto` (por causa do null global). Zero filtro em `viagem` e `gasto` - que sao as duas tabelas mais sensiveis do BI.

Exemplo (`bi/actions.ts:99-111`):
```ts
let viagemQuery = supabase
  .from('viagem')
  .select('id, valor_total')
  .eq('status', 'concluida')
  .gte('data_saida', filtros.periodoInicio)
  .lte('data_saida', filtros.periodoFim);
// Sem .eq('empresa_id', usuario.empresa_id)
```

**Impacto:**
- **Consistencia**: outras areas (`fechamentos`, `gastos`, `viagens`, `dashboard/multi-actions`) filtram explicitamente. Divergencia dificulta auditoria.
- **Robustez**: se alguem futuramente mudar a RLS de `viagem` (ex: criar policy nova com `FOR ALL USING (true)` por erro), o BI imediatamente vaza dados cross-tenant sem disparar alerta.
- **Defense in depth**: a premissa do projeto (memoria multi-empresa e schema) e cinto-e-suspensorio. O BI quebra o acordo.
- **Debug**: quando um dono reclama "meus numeros tao errados", e mais dificil saber se e bug da RLS ou bug da query.

**Rationale:** BI e area de leitura pesada com muitas linhas de agregacao. Um bug de RLS que expoe `viagem.valor_total` cross-tenant expoe receita financeira do concorrente. Risco comercial alto.

**Proposta:** Passe de refatoracao pra adicionar `.eq('empresa_id', usuario.empresa_id)` em todas as queries de `viagem`, `gasto`, `fechamento`, `motorista`, `caminhao` dentro de `bi/actions.ts` e `bi/multi-actions.ts`. Pode criar helper:

```ts
// lib/queries/scoped.ts
export async function scopedQuery(table: string, empresaId: string) {
  const supabase = await createClient();
  return supabase.from(table).select().eq('empresa_id', empresaId);
}
```

Ou mais simples: lint rule custom que bloqueia `.from('viagem')` sem `.eq('empresa_id')` no mesmo statement.

**Esforco:** M (patch mecanico)
**Impacto:** M (defense in depth)

---

### 5. ALTO - Ausencia de audit_log

**Busca:** `audit_log` / `audit_trail` nao existe em nenhuma migration.

**O que precisa de audit:**
- `fechamento` -> `status` (aberto/fechado/pago/reaberto) + `pago_em` + `pago_por`. Hoje soh grava o `fechado_por`/`pago_por` atual, sem historico (se reabrir, perde o rastro anterior). O schema tem os campos `fechado_por`/`pago_por` mas sao sobrescritos no reabrir (`actions.ts:733-737`).
- `usuario_empresa` (ativo/inativo, mudanca de role)
- `empresa` (edicao de plano, mudanca de CNPJ)
- `motorista.percentual_pagamento` (alteracao muda fechamentos futuros)
- Transicoes de `viagem.status` (principalmente para `em_andamento -> concluida` que dispara fechamento)

**Proposta (nova migration):**

```sql
CREATE TABLE audit_log (
  id            BIGSERIAL PRIMARY KEY,
  empresa_id    UUID NOT NULL REFERENCES empresa(id) ON DELETE RESTRICT,
  usuario_id    UUID REFERENCES usuario(id) ON DELETE SET NULL,
  tabela        TEXT NOT NULL,
  registro_id   UUID NOT NULL,
  acao          TEXT NOT NULL CHECK (acao IN ('insert','update','delete','status_change')),
  campo         TEXT,
  valor_antes   JSONB,
  valor_depois  JSONB,
  ip            INET,
  user_agent    TEXT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_audit_empresa_data ON audit_log (empresa_id, created_at DESC);
CREATE INDEX idx_audit_registro ON audit_log (tabela, registro_id);

ALTER TABLE audit_log ENABLE ROW LEVEL SECURITY;
CREATE POLICY audit_select_empresa ON audit_log
  FOR SELECT USING (empresa_id = fn_get_empresa_id() AND fn_get_user_role() IN ('dono','admin'));
-- INSERT so via service_role / trigger. Sem UPDATE/DELETE (append-only).
```

Triggers PL/pgSQL para `fechamento`, `usuario_empresa`, `motorista` e `empresa`, ou escrita explicita nos Server Actions.

**Esforco:** L (schema + triggers + integracao UI)
**Impacto:** M (requisito LGPD + story planejada "Gestor Fase 2")

---

### 6. ALTO - Duplo set de storage policies em `storage.objects` (comprovantes)

**Arquivos:**
- `20260328180600_create_foto_comprovante.sql:85-109` cria 3 policies (`Upload/Leitura/Deletar comprovante na pasta da empresa`) com filtro por `storage.foldername(name)[1] = fn_get_empresa_id()::text`
- `20260330300000_create_storage_policies.sql:5-34` cria mais 4 policies (`Users can upload comprovantes`, etc) **sem** filtro de empresa - apenas `bucket_id = 'comprovantes'`

**Impacto:** Policies no Postgres sao **OR**-ed no SELECT. Qualquer usuario autenticado pode baixar comprovante de qualquer empresa - a policy "Users can view comprovantes" sem filtro de pasta vence a policy restritiva. Comprovantes contem fotos de notas fiscais com CNPJ, valor, razao social. **Vazamento cross-tenant de PII/fiscal**.

**Verificar:** rodar no SQL Editor:
```sql
SELECT policyname, cmd, qual, with_check
FROM pg_policies
WHERE schemaname = 'storage' AND tablename = 'objects';
```

**Proposta:** Dropar as policies da migration `20260330300000_create_storage_policies.sql` (ou pelo menos transforma-las em `RESTRICTIVE`). Nova migration:

```sql
DROP POLICY IF EXISTS "Users can upload comprovantes" ON storage.objects;
DROP POLICY IF EXISTS "Users can view comprovantes" ON storage.objects;
DROP POLICY IF EXISTS "Users can update comprovantes" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete comprovantes" ON storage.objects;
-- As policies restritivas da migration 180600 ja cobrem o caso
```

**Esforco:** S
**Impacto:** L (fecha vazamento de PII fiscal)

---

### 7. ALTO - `categoria_gasto` global: dono pode deletar seed compartilhado

**Arquivo:** `20260328180500_create_categoria_gasto_and_gasto.sql:41-48`

```sql
CREATE POLICY "Dono e admin gerenciam categorias da empresa"
  ON categoria_gasto FOR ALL
  USING (empresa_id = fn_get_empresa_id() AND fn_get_user_role() IN ('dono', 'admin'));
```

Como e `FOR ALL` e a primeira policy de SELECT aceita `empresa_id IS NULL`, o dono nao consegue DELETAR as globais (bom). Porem, a policy `FOR ALL` com `USING` so valida `empresa_id = fn_get_empresa_id()` - o que permite dono criar `categoria_gasto` com `empresa_id=NULL` (quebrando seed global) se ele burlar a camada de app e enviar NULL? Vamos verificar: INSERT tem `WITH CHECK` implicito igual ao USING entao `empresa_id = fn_get_empresa_id()` - NULL nao bate, ok, bloqueado. **Falso alarme pra INSERT.**

Problema real menor: as policies de SELECT sao duas separadas (`empresa_id IS NULL` e `empresa_id = fn_get_empresa_id()`). Se no futuro alguem quiser "categorias globais inativas invisiveis", a logica vai ficar fragil. Baixo risco hoje.

**Reclassificando:** BAIXO.

---

### 7 (real). ALTO - Falta unique index em `fechamento_item (referencia_id)` quando tipo='viagem'

**Arquivo:** `20260328180900_create_fechamento.sql:109-129`

Sem essa constraint, nada impede que a mesma viagem seja lancada em 2 fechamentos diferentes (ver achado 3 acima). Com o patch recente alterando semantica pro "pendente enquanto nao pago", o risco vira realidade.

**Proposta:**
```sql
-- Migration: evitar que a mesma viagem vire item de 2 fechamentos
CREATE UNIQUE INDEX uq_fi_viagem_unica
  ON fechamento_item (referencia_id)
  WHERE tipo = 'viagem';

-- Gasto pode ate ser repetido (ex: pro-rata), mas viagem nao.
-- Se o product quiser permitir reapresentar viagem apos cancelamento, ai a unicidade precisa incluir fechamento_status.
```

**Esforco:** S (se dados atuais ja forem consistentes; se houver duplicidade, precisa dedup antes)
**Impacto:** L (bloqueia pagamento em dobro ao nivel do schema)

---

### 8. ALTO - `types/database.ts` e hand-written placeholder

**Arquivo:** `types/database.ts:1-6` comenta explicitamente "These are placeholder types. In production, generate with: npx supabase gen types typescript".

**Impacto:** TypeScript nao ta amarrado no schema real. Mudancas de schema (rename de coluna, novo enum value) nao quebram o build - caem direto em runtime error, geralmente na producao. Ja ha drift potencial: `Usuario` type tem `ultima_empresa_id` mas nao tem `selected_empresas` - a interface pode estar desatualizada. Todas as chamadas pro Supabase perdem intellisense de nomes de tabela/coluna e retornam `any` por padrao.

**Proposta:**
```bash
# Gerar types do projeto real
npx supabase gen types typescript --project-id bsjuntynmnlhbvxemxqp > types/database.generated.ts
# Adicionar ao package.json:
"scripts": {
  "db:types": "supabase gen types typescript --project-id bsjuntynmnlhbvxemxqp > types/database.generated.ts"
}
# CI: rodar em PR que toca supabase/migrations e falhar se diff != 0
```

Importar `Database` e tipar os clients:
```ts
import type { Database } from '@/types/database.generated';
createClient<Database>(...);
```

**Esforco:** M (gerar + migrar os `as unknown as` existentes)
**Impacto:** M (type safety + evita bugs em produto por drift)

---

### 9. ALTO - `fn_calcular_fechamento` usa `SECURITY DEFINER` sem validar empresa_id

**Arquivo:** `20260328180900_create_fechamento.sql:176-225`

```sql
CREATE OR REPLACE FUNCTION fn_calcular_fechamento(
  p_motorista_id UUID, p_periodo_inicio DATE, p_periodo_fim DATE
) ... SECURITY DEFINER AS $$
...
WHERE v.motorista_id = p_motorista_id AND v.status = 'concluida' ...
$$;
```

Funcao roda com permissoes do owner, bypassa RLS, e soh filtra por `motorista_id`. **Qualquer usuario autenticado pode calcular o fechamento de qualquer motorista do sistema** (incluindo de outras empresas). So precisa saber o UUID. Os UUIDs de motorista de outras empresas normalmente nao vazam pelo endpoint, mas nao e defesa - UUIDs vazam via error messages, logs, URL shares.

**Proposta:**

```sql
CREATE OR REPLACE FUNCTION fn_calcular_fechamento(
  p_motorista_id UUID, p_periodo_inicio DATE, p_periodo_fim DATE
) ... SECURITY DEFINER AS $$
DECLARE v_mot_empresa UUID;
BEGIN
  -- Verificar se o motorista pertence a empresa do usuario autenticado
  SELECT empresa_id INTO v_mot_empresa FROM motorista WHERE id = p_motorista_id;
  IF v_mot_empresa IS NULL OR v_mot_empresa != fn_get_empresa_id() THEN
    RAISE EXCEPTION 'Motorista nao pertence a esta empresa';
  END IF;
  ...
END;
$$;
```

Alternativa: dropar `SECURITY DEFINER` e trocar por `SECURITY INVOKER`, deixando RLS de viagem/gasto fazer o trabalho.

**Esforco:** S
**Impacto:** L (fecha vazamento cross-tenant via funcao RPC)

---

### 10. MEDIO - `fn_calcular_fechamento` e codigo TS desincronizados

**Arquivo:** `actions.ts:464-498` e funcao SQL em `fechamento.sql:198-220`

A funcao SQL calcula `total_viagens` via `SUM(ROUND(valor_total * percentual_pagamento / 100)`. O codigo TypeScript repete essa formula em JS: `Math.round((v.valor_total * v.percentual_pagamento) / 100)` (actions.ts:469) e tambem em `previewFechamentoDetalhado:208`.

**Problema:**
- **Drift**: qualquer mudanca na formula (ex: comissao escalonada por distancia) tem que ser feita em 3 lugares.
- **Precisao divergente**: `Math.round` em JS e banker's rounding diferente de `ROUND` do Postgres em alguns casos. Divergencia de 1 centavo pode ocorrer. Para cegonheiros isso e zero impacto, mas em auditoria fica estranho.

**Proposta:** Tratar `fn_calcular_fechamento` como fonte unica. Remover os calculos manuais em JS, reusar o RPC. Se precisar dos itens individuais para criar `fechamento_item`, criar `fn_calcular_fechamento_detalhado` que ja retorna a lista.

**Esforco:** M
**Impacto:** S

---

### 11. MEDIO - `motorista.percentual_pagamento` nao se propaga historicamente

**Arquivo:** `20260330500000_add_percentual_pagamento_to_motorista.sql` + `viagem.percentual_pagamento` (coluna em viagem tambem)

Schema armazena percentual tanto em `motorista` (contrato atual) quanto em cada `viagem` (snapshot). Isso e correto pra imutabilidade do valor pago. Porem:

**Problema:** Nao ha campo indicando "quando o percentual do motorista mudou pela ultima vez". Se o dono mudar de 25% pra 30% hoje, todas as **viagens futuras** devem usar 30% - mas o codigo em `actions.ts:452` ja usa o valor armazenado na viagem, OK. Ainda assim, falta:

- Registro historico (`motorista_percentual_historico` ou `audit_log`) pra auditoria
- Validacao: quando dono reabrir fechamento com viagens antigas, o valor do item continua sendo o `snapshot` - OK.

**Proposta menor:** pelo menos adicionar trigger/log no audit_log (item 5) do UPDATE em `motorista.percentual_pagamento`. Sem audit_log, criar tabela dedicada:

```sql
CREATE TABLE motorista_percentual_historico (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  motorista_id UUID NOT NULL REFERENCES motorista(id) ON DELETE CASCADE,
  empresa_id UUID NOT NULL REFERENCES empresa(id) ON DELETE RESTRICT,
  percentual_antigo NUMERIC(5,2),
  percentual_novo NUMERIC(5,2) NOT NULL,
  alterado_por UUID REFERENCES usuario(id),
  alterado_em TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

**Esforco:** S
**Impacto:** S

---

### 12. MEDIO - Acertos "avulsos" (planejado) precisam de disambiguation em fechamento_item.tipo

**Contexto:** spawn prompt menciona "Acertos individuais vao virar tipo avulso".

**Proposta de estruturacao:**

1. Adicionar `avulso` ao CHECK de `fechamento_item.tipo` (ou melhor, migrar para um ENUM explicito):

```sql
DO $$ BEGIN
  CREATE TYPE fechamento_item_tipo AS ENUM ('viagem', 'gasto', 'avulso');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

ALTER TABLE fechamento_item
  ALTER COLUMN tipo TYPE fechamento_item_tipo USING tipo::fechamento_item_tipo;
```

2. Para `avulso`, `referencia_id` pode ser NULL (acerto nao liga a viagem/gasto especifico):
```sql
ALTER TABLE fechamento_item
  ALTER COLUMN referencia_id DROP NOT NULL;

ALTER TABLE fechamento_item ADD CONSTRAINT ck_fi_ref_por_tipo CHECK (
  (tipo IN ('viagem','gasto') AND referencia_id IS NOT NULL) OR
  (tipo = 'avulso' AND referencia_id IS NULL)
);
```

3. Para item 7 (unique index em viagem), excluir avulsos explicitamente:
```sql
CREATE UNIQUE INDEX uq_fi_viagem_unica
  ON fechamento_item (referencia_id) WHERE tipo = 'viagem';
```

4. Campo `descricao` fica obrigatorio pra avulso (ja e NOT NULL), campo `valor` pode ser negativo (descontos)? Discutir com PO antes de mudar o CHECK.

**Esforco:** M
**Impacto:** S (enable feature futura)

---

### 13. MEDIO - Views sem WHERE empresa_id + security_invoker inconsistente

**Arquivo:** `20260329190000_extend_gasto_abastecimento.sql:57-152`

Views `vw_media_combustivel_regiao`, `vw_custo_por_caminhao`, `vw_custo_por_motorista`, `vw_gastos_bi` estao marcadas com `security_invoker = true` (bom - rodam com permissoes do caller, respeitando RLS). **Porem** `view_viagens_ativas` (em `20260328180700_create_viagem.sql:106-122`) **nao** tem security_invoker. Em Supabase, por default view roda como SECURITY DEFINER (owner = postgres), o que pode bypassar RLS.

**Verificar:**
```sql
SELECT relname, reloptions FROM pg_class WHERE relname LIKE 'view_%' OR relname LIKE 'vw_%';
```

**Proposta:**
```sql
ALTER VIEW view_viagens_ativas SET (security_invoker = true);
```

Adicionar ao checklist de criacao de view no projeto.

**Esforco:** S
**Impacto:** M (evita vazamento silencioso)

---

### 14. MEDIO - Views de BI com JOIN sem filtro de empresa_id

**Arquivo:** `20260329190000_extend_gasto_abastecimento.sql`, view `vw_gastos_bi`

A view faz `SELECT g.empresa_id, ... FROM gasto g LEFT JOIN categoria_gasto cg`. Nao tem `WHERE`. Com `security_invoker=true`, ok - caller tem RLS ativa. **Mas** se alguem consultar pelo admin client, a view retorna tudo. O mesmo problema do BI (item 4) em outro nivel.

**Proposta:** seguro: aceitavel se RLS estiver correta. Registrar nos docs que essas views **nunca** devem ser queried via admin client.

**Esforco:** trivial (documentacao)
**Impacto:** S

---

### 15. MEDIO - Middleware usa `getSession()` que confia no cookie, risco de token spoof

**Arquivo:** `lib/supabase/middleware.ts:33-35`

```ts
// Use getSession() instead of getUser() in middleware for performance.
// getSession() reads from the cookie locally (no Supabase API round-trip).
const { data: { session } } = await supabase.auth.getSession();
```

**Contexto:** Supabase docs recomendam `getUser()` no middleware **justamente pra validar o JWT** no Auth server. `getSession()` apenas parseia o cookie local - um token JWT expirado ou forjado passaria aqui e soh seria pego na camada de layout/page.

**Rationale:** existe defesa em profundidade via `getCurrentUsuario()` que chama `getUser()` na page. OK - mas quem nao passar por page (ex: route handler, API route futura) fica sem defesa. O comentario "performance" e valido, porem a falha sem fallback pode deixar enderecos acessiveis com token expirado.

**Proposta:**
- Manter `getSession()` no middleware pra performance
- Mas adicionar guarda em `layout.tsx` do `(dashboard)` chamando `getCurrentUsuario()` que hoje usa `getUser()`. Verificar se esta em todas as pages/route handlers.
- OU seguir o doc oficial e trocar pra `getUser()` - overhead de ~50ms por request, aceitavel.

**Esforco:** S
**Impacto:** M (defesa em profundidade auth)

---

### 16. MEDIO - `fn_get_user_role` e `fn_get_empresa_id` dessincronizadas apos multi-empresa

**Arquivo:** `20260329200000_usuario_empresa_multitenancy.sql:60-73` e `20260328180100_create_usuario_table.sql:71-79`

Apos a migration multi-empresa, `fn_get_user_role` le de `usuario_empresa` (junction). Mas `fn_get_empresa_id` continua lendo de `usuario.empresa_id` (coluna direta). Resultado: se por algum motivo `usuario.empresa_id` e `usuario.role` forem atualizados separadamente (bug de aplicacao ou rollback parcial), o user tera empresa A com role B, levando a inconsistencia de policies.

**Cenario de risco:** `fn_switch_empresa` (migration 180200) atualiza **ambas** `empresa_id` e `role` atomicamente em `usuario`. Porem se o dono ou algum admin script mudar soh a `role` na `usuario_empresa` (via UI "mudar permissao do usuario") mas nao re-sincronizar `usuario.role`, o `fn_get_user_role` retorna `ue.role` **da empresa atual** (`u.empresa_id`) - que pode estar desatualizada.

**Proposta:** Unificar. `fn_get_empresa_id` deveria retornar de `usuario.empresa_id` e `fn_get_user_role` deveria usar o mesmo empresa_id consistentemente (ja usa). Idealmente migrar `usuario.role` pra deprecated e manter soh em `usuario_empresa`.

**Esforco:** M
**Impacto:** S

---

### 17. MEDIO - Query `listFechamentos` ordena por periodo_inicio sem ORDER stable

**Arquivo:** `actions.ts:544-569`

```ts
query.order('periodo_inicio', { ascending: false }).range(from, to);
```

Sem segundo criterio, paginacao fica instavel quando varios fechamentos tem o mesmo `periodo_inicio`. Usuario pode ver a mesma linha em 2 paginas.

**Proposta:**
```ts
query
  .order('periodo_inicio', { ascending: false })
  .order('id', { ascending: false })  // tiebreaker estavel
  .range(from, to);
```

Aplicar padrao em todas as paginas paginadas (viagens, gastos, etc).

**Esforco:** S
**Impacto:** S

---

### 18. MEDIO - Timestamps timezone: banco tz-aware, mas queries enviam string sem TZ

**Arquivo:** `actions.ts:177-178` e varias outras

```ts
.gte('data_saida', `${periodoInicio}T00:00:00`)
.lte('data_saida', `${periodoFim}T23:59:59`)
```

O banco armazena `TIMESTAMPTZ`. Supabase client envia a string sem sufixo de timezone. Postgres assume `session timezone` (normalmente UTC no Supabase). Mas o usuario esta em UTC-3 (Brasilia). O `23:59:59` do filtro e UTC, que corresponde a `20:59:59 BRT` do mesmo dia. **3 horas perdidas no fim do periodo.** Viagens entre 21:00 e 00:00 BRT ficam fora do fechamento do dia.

**Proposta:**
```ts
.gte('data_saida', `${periodoInicio}T00:00:00-03:00`)
.lte('data_saida', `${periodoFim}T23:59:59-03:00`)
```

Ou criar utility `toBrtRange(startDate, endDate)` que retorna os bounds corretos. Aplicar em BI, fechamentos, viagens actions.

**Esforco:** M (auditoria de todas as queries com timestamp)
**Impacto:** M (correcao de bug financeiro sutil)

---

### 19. MEDIO - `fechamento.periodo_inicio/fim` sao DATE mas viagem.data_saida e TIMESTAMPTZ

**Arquivo:** `fechamento.sql:31-32` vs `viagem.sql:27`

`fn_calcular_fechamento` usa `v.data_saida::DATE >= p_periodo_inicio`. Casting timestamp pra date usa o TZ do servidor (normalmente UTC). Mesma pegadinha do item 18, mas do lado SQL.

**Proposta:**
```sql
WHERE v.data_saida AT TIME ZONE 'America/Sao_Paulo' >= p_periodo_inicio
  AND v.data_saida AT TIME ZONE 'America/Sao_Paulo' <= p_periodo_fim + INTERVAL '1 day' - INTERVAL '1 second';
```

Ou armazenar um campo `data_saida_brt DATE` gerado.

**Esforco:** M
**Impacto:** M (correcao financeira)

---

### 20. BAIXO - Tipos monetarios consistentes, mas sem constraint de positivo em percentual de viagem negativa

Check: todas as colunas de valor sao INTEGER centavos (`valor_total`, `valor`, `total_viagens`, `saldo_motorista`). **Ponto positivo forte.**

Pequena nota: `saldo_motorista` pode ser negativo (bom, e adiantamento). `fechamento_item.valor CHECK (valor >= 0)`? Nao, soh tem a constraint implicita do type. Se acertos avulsos puderem ser descontos (valor negativo), ok nao tem check hoje.

**Proposta:** documentar em comentario na tabela que valores sao "sempre positivos; sinal e dado pelo tipo do item", ou adicionar check se o PO decidir.

**Esforco:** S
**Impacto:** S

---

### 21. BAIXO - `fn_refresh_benchmarking` pode rodar sem k-anonymity guard

**Arquivo:** `20260331100000_benchmarking_sector_view.sql`

Doc comments mencionam "k-anonymity: minimo 5 empresas por segmento", mas a funcao nao bloqueia salvar medianas quando `total_empresas < 5`. Grava qualquer coisa, incluindo com uma unica empresa - o que anula o anonimato.

**Proposta:**
```sql
-- Dentro do INSERT...SELECT, filtrar:
WHERE stats.total_empresas >= 5
```

Sem isso, um dono com cegonha fechada unica no sistema ve exatamente seus proprios dados apresentados como "mediana do setor".

**Esforco:** S
**Impacto:** M (LGPD + integridade do produto)

---

### 22. BAIXO - `foto_comprovante` RLS policy usa subquery correlata (IN)

**Arquivo:** `20260328180600_create_foto_comprovante.sql:49-64`

```sql
CREATE POLICY "Motorista ve comprovantes dos proprios gastos"
  ON foto_comprovante FOR SELECT
  USING (gasto_id IN (SELECT id FROM gasto WHERE motorista_id = fn_get_motorista_id()));
```

Cada SELECT executa subquery. Para motorista com 100s de gastos + 100s de comprovantes, Postgres usa hash join normalmente ok. Mas padrao mais rapido e:

```sql
USING (EXISTS (SELECT 1 FROM gasto g WHERE g.id = foto_comprovante.gasto_id AND g.motorista_id = fn_get_motorista_id()))
```

Ou ainda melhor: denormalizar `motorista_id` em `foto_comprovante` (ja tem `empresa_id` redundante, mais um nao muda o custo e simplifica policy pra igualdade direta).

**Esforco:** S
**Impacto:** S (perf, nao funcional)

---

### 23. BAIXO - Seeds nao respeitam o `ON DELETE RESTRICT`

**Arquivo:** `scripts/seed-dados-ricos.js:8` diz "Idempotent: cleanup primeiro". Seeds tentam deletar na ordem correta, mas com FKs `ON DELETE RESTRICT` (`viagem.motorista_id`, `viagem.caminhao_id`, `gasto.caminhao_id SET NULL`, `gasto.categoria_id RESTRICT`) qualquer ordem errada quebra. Nao e bug hoje, mas fragil.

**Proposta:** criar `fn_reset_empresa(p_empresa_id)` idempotente que deleta em ordem topologica. Ou usar `TRUNCATE CASCADE` em ambiente local apenas.

**Esforco:** S
**Impacto:** S

---

### 24. BAIXO - Indices partial redundantes e falta de covering index para fechamento pago

**Situacao atual dos indices em `fechamento`:**
- `(empresa_id, motorista_id)` - bom pra filtros por motorista
- `(empresa_id, periodo_inicio, periodo_fim)` - bom pra overlap check
- `(motorista_id, periodo_inicio DESC)` - motorista ve proprios
- `(status)` - baixa seletividade (muita repeticao)

**Proposta:**
```sql
DROP INDEX idx_fechamento_status;  -- pouco util isolado
CREATE INDEX idx_fechamento_empresa_status
  ON fechamento (empresa_id, status);  -- filtros compostos

-- Pro patch do item 3/7:
CREATE INDEX idx_fechamento_item_referencia_viagem
  ON fechamento_item (referencia_id, fechamento_id)
  WHERE tipo = 'viagem';
```

**Esforco:** S
**Impacto:** S

---

### 25. BAIXO - Todas FKs usam ON DELETE RESTRICT (duro demais pra algumas)

**Observacao:** `empresa`, `motorista`, `caminhao` tem `ON DELETE RESTRICT` em quase tudo. Soft delete (ativo=false) e o padrao de fato, o que e correto. Mas se um dia precisar LGPD delete (right to be forgotten), hoje um `motorista` com 1 viagem antiga nao pode ser deletado. Solucao atual: anonimizar (nome = NULL, cpf = NULL) + status = 'inativo'. Documentar esse fluxo.

**Esforco:** trivial (doc)
**Impacto:** S (LGPD readiness)

---

## Itens Nao Criticos Observados (sem ficar no top)

- `empresa.cnpj` tem regex check, mas `motorista.cpf` tambem - consistente, bom.
- `updated_at` trigger e reutilizavel em quase todas as tabelas - bom.
- Policies tem nomes em portugues e em snake_case misturados - cosmetico, padronizar.
- `benchmarking_setor` usa SERIAL id - todo resto usa UUID; inconsistencia ok (append-only small table).
- `motorista_caminhao` historico sem `end date` quando desativado - pode virar confusao em relatorios.
- `plano_tipo` enum tem 'enterprise' mas sem nenhuma feature diferencial no schema ainda.
- Sem constraint de email valido em `empresa.email` / `usuario.email` - relegar a Zod na app layer.

---

## Proximos passos sugeridos (priorizacao por risco)

| # | Acao | Prioridade | Esforco |
|---|------|------------|---------|
| 1 | Rotacionar service_role + limpar historico git | 0-CRITICO | M |
| 2 | Patch storage.objects policies duplicadas | 1-CRITICO | S |
| 3 | Adicionar validacao TOCTOU em queryMultiEmpresa | 2-ALTO | S |
| 4 | Validar empresa_id em fn_calcular_fechamento | 3-ALTO | S |
| 5 | Decidir semantica pendente-de-acerto + unique index fechamento_item | 4-ALTO | M |
| 6 | Refator BI actions para usar empresa_id explicito | 5-ALTO | M |
| 7 | Gerar types/database.ts do schema real + CI check | 6-ALTO | M |
| 8 | Migration audit_log + triggers basicos | 7-ALTO | L |
| 9 | Audit de timezones em queries de data_saida | 8-MEDIO | M |
| 10 | Unificar `fn_get_user_role` e `fn_get_empresa_id` multi-empresa | 9-MEDIO | M |

---

## Notas finais

- **Nenhuma migration executada.** Todas as propostas de DDL sao **referencia**, nao sao para rodar agora.
- Recomendo que antes de aplicar items 1, 2, 3 o `@devops` crie um backup logico (`pg_dump`) do projeto Supabase.
- Antes do item 5 (unique index), rodar um SELECT pra verificar se existe duplicidade ja no banco atual.
- Para o item 1 (rotacao), coordenar com o deploy do Vercel pra que a nova env var esteja setada antes de revogar a antiga, evitando downtime.

Relatorio gerado por Dara. Sem alteracoes no banco. Sem commits.
