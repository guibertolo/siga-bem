# PRD: Fluxo de Criacao de Viagem/Carga

**Versao:** 1.0
**Data:** 2026-03-29
**Autor:** Bob (PM Agent)
**Status:** Draft

---

## 1. Contexto e Motivacao

### 1.1 Briefing do Stakeholder

> "O fluxo do patrao e pegar uma carga de manha e delegar o motorista que ira faze-la. Ou o proprio motorista pode pegar a carga de manha na chamada e adicionar ela no seu fluxo, colocando local de partida, destino, valor do pagamento total. Caso isso seja adicionado pelo patrao, nao pode ser alterado pelo motorista. Cada motorista so consegue visualizar seu proprio historico de viagens."

### 1.2 Problema

O sistema atual (`createViagem` em `app/(dashboard)/viagens/actions.ts`) bloqueia motoristas de criar viagens (linha 192: `if (usuario.role === 'motorista') return error`). Isso impede o Fluxo B (motorista pega carga diretamente). Alem disso, nao ha mecanismo de "lock" que impeca motoristas de editar viagens criadas pelo dono.

### 1.3 Objetivo

Implementar dois fluxos distintos de criacao de viagem com controle de permissoes granular, refletindo a operacao real de transportadoras de cegonheiros.

---

## 2. Analise do Sistema Existente

### 2.1 Schema Atual da Tabela `viagem`

| Coluna | Tipo | Observacao |
|--------|------|-----------|
| `id` | UUID PK | Auto-gerado |
| `empresa_id` | UUID FK | Isolamento por empresa |
| `motorista_id` | UUID FK | Motorista responsavel |
| `caminhao_id` | UUID FK | Caminhao utilizado |
| `origem` | TEXT | Cidade/local de partida |
| `destino` | TEXT | Cidade/local de destino |
| `data_saida` | TIMESTAMPTZ | Data/hora de saida |
| `data_chegada_prevista` | TIMESTAMPTZ | Estimativa de chegada |
| `data_chegada_real` | TIMESTAMPTZ | Chegada efetiva |
| `valor_total` | INTEGER | Valor do frete em centavos |
| `percentual_pagamento` | NUMERIC(5,2) | % do motorista |
| `status` | ENUM | planejada, em_andamento, concluida, cancelada |
| `km_estimado` | INTEGER | Distancia estimada (Story 3.3) |
| `km_saida` | INTEGER | Odometro na saida |
| `km_chegada` | INTEGER | Odometro na chegada |
| `observacao` | TEXT | Notas livres |
| `created_by` | UUID FK | **Ja existe** -- quem criou |
| `created_at` | TIMESTAMPTZ | Auto |
| `updated_at` | TIMESTAMPTZ | Auto |

**Descoberta importante:** O campo `created_by` ja existe no schema. A coluna `valor_total` ja representa o valor do frete. Isso reduz significativamente o escopo de mudancas no banco.

### 2.2 RLS Policies Atuais

| Policy | Regra |
|--------|-------|
| `viagem_select` | dono/admin: todas da empresa. motorista: apenas `motorista_id = fn_get_motorista_id()` |
| `viagem_insert` | **Apenas dono/admin** (bloqueio atual) |
| `viagem_update` | dono/admin: qualquer. motorista: apenas proprias |
| `viagem_delete` | Apenas dono/admin |

### 2.3 Application-Level Restrictions

| Arquivo | Restricao | Problema |
|---------|-----------|----------|
| `actions.ts:192` | `if (role === 'motorista') return error` na `createViagem` | Bloqueia Fluxo B |
| `actions.ts:248` | `updateViagem` nao verifica `created_by` | Motorista pode editar viagem do dono |
| `nova/page.tsx:3` | Importa `listMotoristasAtivos` -- dono seleciona motorista | Motorista nao precisa selecionar |
| `ViagemForm.tsx` | Todos os campos editaveis sempre | Nao ha campo locked |

### 2.4 Roles do Sistema (types/usuario.ts)

```typescript
type UsuarioRole = 'dono' | 'motorista' | 'admin';
```

- **dono**: Proprietario da transportadora (acesso total)
- **admin**: Gerente/administrativo (acesso quase total)
- **motorista**: Condutor (acesso restrito a seus proprios dados)

---

## 3. Especificacao dos Fluxos

### 3.1 Fluxo A: Dono/Admin Cria e Delega

**Ator:** Dono ou Admin
**Trigger:** Dono pega carga na chamada da manha

**Sequencia:**

1. Dono acessa `/viagens/nova`
2. Preenche formulario completo:
   - Origem (obrigatorio)
   - Destino (obrigatorio)
   - Valor total do frete (obrigatorio)
   - Percentual do motorista (obrigatorio)
   - Motorista designado (seleciona da lista)
   - Caminhao (filtrado por vinculo do motorista)
   - Data de saida, KM estimado, observacao (opcionais)
3. Sistema salva com `created_by = usuario.id` e `editavel_motorista = false`
4. Viagem aparece no painel do motorista designado
5. **Motorista NAO pode alterar:** origem, destino, valor_total, percentual_pagamento, caminhao_id, motorista_id
6. **Motorista PODE:** registrar gastos vinculados, atualizar status (iniciar, concluir), registrar km_saida/km_chegada, editar observacao

### 3.2 Fluxo B: Motorista Cria Propria Viagem

**Ator:** Motorista
**Trigger:** Motorista pega carga diretamente na chamada

**Sequencia:**

1. Motorista acessa `/viagens/nova`
2. Preenche formulario simplificado:
   - Origem (obrigatorio)
   - Destino (obrigatorio)
   - Valor total do frete (obrigatorio)
   - Percentual de pagamento (pre-preenchido se configurado, editavel)
   - Caminhao (pre-selecionado pelo vinculo ativo, editavel entre seus vinculos)
   - Motorista: **auto-preenchido e oculto** (sempre o proprio)
   - Data de saida, KM estimado, observacao (opcionais)
3. Sistema salva com `created_by = usuario.id` e `editavel_motorista = true`
4. **Motorista PODE editar tudo** (ele e o criador)
5. Dono/Admin ve essa viagem normalmente na listagem geral

### 3.3 Visibilidade do Historico

| Role | Ve | Edita |
|------|------|-------|
| Dono/Admin | TODAS as viagens da empresa | QUALQUER viagem |
| Motorista | SOMENTE suas viagens (`motorista_id = self`) | Somente viagens com `editavel_motorista = true` OU campos permitidos |

---

## 4. Campos Novos Necessarios

### 4.1 Coluna: `editavel_motorista`

```sql
ALTER TABLE viagem
  ADD COLUMN editavel_motorista BOOLEAN NOT NULL DEFAULT true;

COMMENT ON COLUMN viagem.editavel_motorista IS
  'false quando viagem criada por dono/admin — motorista nao pode editar campos core.';
```

**Logica de preenchimento:**
- `createViagem` por dono/admin: `editavel_motorista = false`
- `createViagem` por motorista: `editavel_motorista = true`

**Nota sobre campos descartados:**
- `criado_por_id` -- **NAO necessario**. O campo `created_by` ja existe no schema e cumpre essa funcao.
- `valor_frete` -- **NAO necessario**. O campo `valor_total` ja representa o valor do frete da carga em centavos.

### 4.2 Divergencia em `types/database.ts`

O arquivo `types/database.ts` (linha 93) usa `valor_frete_centavos` enquanto o schema real usa `valor_total`. Isso indica um tipo antigo/desatualizado. O PRD segue o schema real (`valor_total`). Recomenda-se sincronizar o tipo `database.ts` com o schema real em uma task separada.

---

## 5. Alteracoes de RLS

### 5.1 Policy `viagem_insert` (ALTERAR)

Atualmente permite apenas dono/admin. Deve permitir motorista criar com restricoes:

```sql
DROP POLICY viagem_insert ON viagem;

-- Dono/admin: qualquer viagem na empresa
-- Motorista: apenas viagens onde motorista_id = self
CREATE POLICY viagem_insert ON viagem
  FOR INSERT WITH CHECK (
    empresa_id = fn_get_empresa_id()
    AND (
      fn_get_user_role() IN ('dono', 'admin')
      OR (
        fn_get_user_role() = 'motorista'
        AND motorista_id = fn_get_motorista_id()
        AND editavel_motorista = true
      )
    )
  );
```

### 5.2 Policy `viagem_update` (REFINAR)

A policy atual permite motorista atualizar suas viagens sem restricao de campos. O controle granular de campos (quais campos o motorista pode alterar) deve ser feito na **application layer** (server actions), pois RLS nao opera no nivel de colunas.

A policy RLS permanece permitindo UPDATE para motorista em suas viagens. A restricao de campos fica em `updateViagem()`.

### 5.3 Campos que Motorista PODE Alterar (quando `editavel_motorista = false`)

| Campo | Motorista pode alterar? | Razao |
|-------|------------------------|-------|
| `origem` | NAO | Definido pelo dono |
| `destino` | NAO | Definido pelo dono |
| `valor_total` | NAO | Valor do frete e definido pelo dono |
| `percentual_pagamento` | NAO | Definido pelo dono |
| `motorista_id` | NAO | Delegacao do dono |
| `caminhao_id` | NAO | Definido pelo dono |
| `data_saida` | NAO | Definido pelo dono |
| `data_chegada_prevista` | NAO | Definido pelo dono |
| `status` | SIM | Motorista inicia e conclui viagem |
| `km_saida` | SIM | Registrado pelo motorista |
| `km_chegada` | SIM | Registrado pelo motorista |
| `data_chegada_real` | SIM | Registrado na conclusao |
| `observacao` | SIM | Livre para notas do motorista |

### 5.4 Campos que Motorista PODE Alterar (quando `editavel_motorista = true`)

Todos os campos -- o motorista criou a viagem.

---

## 6. Alteracoes na Application Layer

### 6.1 `createViagem()` em `actions.ts`

**Antes:** Bloqueia motorista (retorna erro).
**Depois:**

```
SE role === 'motorista':
  - motorista_id = obter do usuario.motorista_id (forcado, nao do formulario)
  - editavel_motorista = true
  - created_by = usuario.id
SE role === 'dono' OU 'admin':
  - motorista_id = do formulario (selecao)
  - editavel_motorista = false
  - created_by = usuario.id
```

### 6.2 `updateViagem()` em `actions.ts`

**Antes:** Nao verifica `editavel_motorista` nem `created_by`.
**Depois:**

```
SE role === 'motorista':
  Buscar viagem existente
  SE editavel_motorista === false:
    BLOQUEAR alteracao de: origem, destino, valor_total, percentual_pagamento,
                           motorista_id, caminhao_id, data_saida, data_chegada_prevista
    PERMITIR apenas: observacao, km_saida (se status permite)
  SE editavel_motorista === true:
    PERMITIR todas as alteracoes
SE role IN ('dono', 'admin'):
  PERMITIR todas as alteracoes
```

### 6.3 `ViagemForm.tsx` (componente)

**Mudancas:**

1. Receber nova prop: `isMotorista: boolean` e `editavelMotorista: boolean`
2. Quando motorista e `editavel_motorista = false`:
   - Campos core renderizados como `<span>` (read-only, exibicao) ou `<input disabled>`
   - Campos operacionais (km_saida, observacao) permanecem editaveis
3. Quando motorista e modo `create`:
   - Ocultar campo `motorista_id` (auto-preenchido)
   - Pre-selecionar caminhao do vinculo ativo
4. Quando dono/admin:
   - Formulario completo, sem restricoes

### 6.4 `nova/page.tsx` (pagina de criacao)

**Mudancas:**

1. Verificar role do usuario
2. Se motorista: buscar apenas seus caminhoes (ja funciona via `listCaminhoesPorMotorista`)
3. Se motorista: nao carregar lista de motoristas (desnecessario)
4. Passar `isMotorista` para `ViagemForm`

### 6.5 `page.tsx` (listagem de viagens)

**Mudancas:**

1. Botao "Nova Viagem" deve aparecer para motoristas tambem (atualmente nao tem restricao de UI, mas a action bloqueia)
2. Filtro de motorista: ocultar para motoristas (ve apenas seus)
3. Nenhuma outra alteracao necessaria (RLS ja filtra)

### 6.6 `middleware.ts`

**Sem alteracao necessaria.** O matcher atual (`/dashboard/:path*`, `/usuarios/:path*`) nao cobre `/viagens/:path*`, mas viagens ja esta dentro de `(dashboard)` group, entao a protecao de autenticacao funciona via o layout do dashboard group.

---

## 7. Migration Necessaria

### 7.1 Unica Migration

**Nome:** `20260330_add_editavel_motorista_to_viagem.sql`

```sql
-- =============================================================================
-- Migration: Fluxo de Carga — Adiciona editavel_motorista e ajusta RLS
-- PRD: prd-fluxo-carga.md
-- =============================================================================

-- 1. ADD COLUMN
ALTER TABLE viagem
  ADD COLUMN IF NOT EXISTS editavel_motorista BOOLEAN NOT NULL DEFAULT true;

COMMENT ON COLUMN viagem.editavel_motorista IS
  'false quando viagem criada por dono/admin — motorista nao pode editar campos core.';

-- 2. BACKFILL: viagens existentes criadas por dono/admin = false
UPDATE viagem v
SET editavel_motorista = false
WHERE EXISTS (
  SELECT 1 FROM usuario u
  WHERE u.id = v.created_by
  AND u.role IN ('dono', 'admin')
);

-- 3. INDEX: queries filtered by editavel_motorista
CREATE INDEX IF NOT EXISTS idx_viagem_editavel
  ON viagem (motorista_id, editavel_motorista);

-- 4. ADJUST RLS: allow motorista to INSERT own viagens
DROP POLICY IF EXISTS viagem_insert ON viagem;

CREATE POLICY viagem_insert ON viagem
  FOR INSERT WITH CHECK (
    empresa_id = fn_get_empresa_id()
    AND (
      fn_get_user_role() IN ('dono', 'admin')
      OR (
        fn_get_user_role() = 'motorista'
        AND motorista_id = fn_get_motorista_id()
        AND editavel_motorista = true
      )
    )
  );
```

### 7.2 Sem Necessidade de Novas Tabelas

O sistema ja possui todos os campos necessarios (`valor_total` = valor do frete, `created_by` = criador). Apenas 1 coluna nova (`editavel_motorista`) e 1 policy ajustada.

---

## 8. Impacto nas Stories Existentes

### 8.1 Stories de Gastos (2.x)

**Impacto: NENHUM.** Gastos ja sao vinculados a viagens via `gasto.viagem_id`. O motorista ja pode registrar gastos em suas viagens independente de quem criou a viagem.

### 8.2 Stories de Viagem (3.x)

| Story | Impacto | Detalhe |
|-------|---------|---------|
| 3.1 CRUD Viagens | **ALTO** | Alterar `createViagem`, `updateViagem`, form, RLS |
| 3.2 Veiculos Transportados | Nenhum | Vinculo viagem_veiculo nao muda |
| 3.3 Estimativa de Custo | Nenhum | `km_estimado` nao afetado |

### 8.3 Stories de Fechamento (4.x)

**Impacto: NENHUM.** O fechamento usa `valor_total * percentual_pagamento / 100` independente de quem criou a viagem. A funcao `fn_calcular_fechamento` nao precisa mudar.

### 8.4 Stories de BI (5.x)

| Story | Impacto | Detalhe |
|-------|---------|---------|
| 5.1 Combustivel | Nenhum | Gastos sao independentes de quem criou viagem |
| 5.5 Dashboard BI | Nenhum | Views usam dados agregados |
| 5.6 Previsao Lucro/Margem | **MEDIO** | `valor_total` (= valor do frete) ja existe e e a base do calculo. O campo `editavel_motorista` pode ser usado para segmentar margens: viagens delegadas vs. auto-criadas |

### 8.5 Resumo de Impacto

| Componente | Tipo de Mudanca | Esforco |
|------------|-----------------|---------|
| Migration SQL | 1 migration (ADD COLUMN + RLS) | Baixo |
| `actions.ts` | Alterar `createViagem` e `updateViagem` | Medio |
| `ViagemForm.tsx` | Adicionar logica de campos locked | Medio |
| `nova/page.tsx` | Adaptar para role motorista | Baixo |
| `types/viagem.ts` | Adicionar `editavel_motorista` ao tipo | Baixo |
| RLS policies | DROP + CREATE 1 policy | Baixo |
| Testes | Novos testes para ambos os fluxos | Medio |

---

## 9. Regras de Negocio (Sumario)

| ID | Regra | Enforcement |
|----|-------|-------------|
| RN-01 | Motorista so ve suas proprias viagens | RLS (`viagem_select`) |
| RN-02 | Dono/Admin ve todas as viagens da empresa | RLS (`viagem_select`) |
| RN-03 | Motorista pode criar viagem com motorista_id = self | RLS (`viagem_insert` ajustada) + application |
| RN-04 | Viagem criada por dono: `editavel_motorista = false` | Application (`createViagem`) |
| RN-05 | Viagem criada por motorista: `editavel_motorista = true` | Application (`createViagem`) |
| RN-06 | Motorista nao edita campos core de viagem locked | Application (`updateViagem`) |
| RN-07 | Motorista pode registrar gastos em qualquer viagem sua | Ja funciona (sem mudanca) |
| RN-08 | Motorista pode atualizar status (iniciar, concluir) | Ja funciona via `updateViagemStatus` |
| RN-09 | Dono pode editar qualquer viagem | Ja funciona (sem mudanca) |
| RN-10 | Motorista nao pode excluir viagens | Ja funciona (RLS `viagem_delete`) |

---

## 10. Riscos e Mitigacoes

| Risco | Probabilidade | Impacto | Mitigacao |
|-------|--------------|---------|-----------|
| Motorista tenta burlar lock via API direta | Media | Alto | RLS no INSERT garante `editavel_motorista = true` para motorista; `updateViagem` valida no server |
| Backfill errado em viagens existentes | Baixa | Medio | Backfill conservador (viagens existentes todas criadas por dono/admin, setar `false` para todas) |
| `types/database.ts` diverge do schema real | Confirmado | Baixo | Task separada para sincronizar tipos |
| Motorista sem caminhao vinculado nao consegue criar viagem | Media | Medio | UI deve mostrar mensagem clara; `listCaminhoesPorMotorista` ja retorna lista vazia |
| Confusao de UX: motorista nao entende campos locked | Media | Medio | Campos read-only com estilo visual diferenciado + tooltip explicando |

---

## 11. Criterios de Aceite (por Fluxo)

### Fluxo A — Dono Delega

- [ ] AC-A1: Dono cria viagem selecionando motorista, caminhao, origem, destino, valor do frete
- [ ] AC-A2: Viagem salva com `editavel_motorista = false` e `created_by = dono.id`
- [ ] AC-A3: Motorista ve a viagem delegada em sua listagem
- [ ] AC-A4: Motorista NAO consegue alterar origem, destino, valor_total, percentual, caminhao
- [ ] AC-A5: Motorista CONSEGUE atualizar status (iniciar, concluir)
- [ ] AC-A6: Motorista CONSEGUE registrar gastos vinculados a viagem
- [ ] AC-A7: Motorista CONSEGUE registrar km_saida e km_chegada
- [ ] AC-A8: Motorista CONSEGUE editar observacao

### Fluxo B — Motorista Cria

- [ ] AC-B1: Motorista acessa `/viagens/nova` sem erro (atualmente bloqueado)
- [ ] AC-B2: Campo motorista auto-preenchido e oculto (nao seleciona outro motorista)
- [ ] AC-B3: Caminhao pre-selecionado pelo vinculo ativo, editavel entre vinculos proprios
- [ ] AC-B4: Viagem salva com `editavel_motorista = true` e `created_by = motorista.id`
- [ ] AC-B5: Motorista pode editar todos os campos da viagem que criou
- [ ] AC-B6: Dono/Admin ve a viagem na listagem geral

### Visibilidade

- [ ] AC-V1: Motorista ve SOMENTE viagens onde `motorista_id = self`
- [ ] AC-V2: Dono/Admin ve TODAS as viagens da empresa
- [ ] AC-V3: Historico de viagens do motorista inclui viagens delegadas e auto-criadas

### Seguranca

- [ ] AC-S1: Motorista nao consegue inserir viagem com `motorista_id` de outro motorista (RLS)
- [ ] AC-S2: Motorista nao consegue inserir viagem com `editavel_motorista = false` (RLS)
- [ ] AC-S3: Bypass via API direta (sem UI) e bloqueado por RLS + server action validation

---

## 12. Estimativa de Esforco

| Item | Story Points | Observacao |
|------|-------------|-----------|
| Migration + backfill | 1 | Simples, 1 coluna + 1 policy |
| Server actions (create + update) | 3 | Logica condicional por role + lock check |
| ViagemForm adaptacao | 3 | Formulario condicional, campos locked |
| Nova pagina / pagina adaptada | 1 | Ajuste de props e data loading |
| Tipos TypeScript | 1 | Adicionar campo + sync types |
| Testes unitarios e integracao | 3 | Dois fluxos completos + edge cases |
| **Total** | **12** | ~2-3 dias de desenvolvimento |

---

## 13. Recomendacao de Implementacao

**Ordem sugerida para stories/tasks:**

1. **Migration SQL** -- Adicionar `editavel_motorista`, backfill, ajustar RLS
2. **Server actions** -- Alterar `createViagem` (permitir motorista) e `updateViagem` (check lock)
3. **Tipos TypeScript** -- Adicionar campo ao tipo `Viagem` e `ViagemFormData`
4. **ViagemForm** -- Logica de campos locked/read-only
5. **Pagina nova** -- Adaptar para role motorista
6. **Testes** -- Cobrir ambos os fluxos + edge cases de seguranca
7. **Sync `types/database.ts`** -- Alinhar `valor_frete_centavos` com schema real (`valor_total`)

---

## Apendice A: Queries de Referencia

**Viagens do motorista (historico):**
```sql
SELECT * FROM viagem
WHERE motorista_id = :motorista_id
ORDER BY data_saida DESC;
-- RLS ja filtra automaticamente
```

**Viagens delegadas vs. auto-criadas (BI):**
```sql
SELECT
  editavel_motorista,
  COUNT(*) as total,
  SUM(valor_total) as frete_total
FROM viagem
WHERE empresa_id = :empresa_id
GROUP BY editavel_motorista;
```

**Margem de lucro por viagem (Story 5.6):**
```sql
SELECT
  v.id,
  v.valor_total AS frete_centavos,
  ROUND(v.valor_total * v.percentual_pagamento / 100) AS valor_motorista,
  COALESCE(SUM(g.valor), 0) AS total_gastos,
  v.valor_total - ROUND(v.valor_total * v.percentual_pagamento / 100) - COALESCE(SUM(g.valor), 0) AS margem
FROM viagem v
LEFT JOIN gasto g ON g.viagem_id = v.id
WHERE v.empresa_id = :empresa_id
  AND v.status = 'concluida'
GROUP BY v.id;
```
