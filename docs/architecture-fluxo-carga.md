# Analise de Impacto: Fluxo de Criacao de Carga/Viagem (Dono vs Motorista)

**Autor:** @architect (Aria)
**Data:** 2026-03-29
**Status:** Proposta para validacao

---

## 1. Resumo Executivo

O stakeholder descreveu tres regras de negocio que divergem do comportamento atual:

| Regra | Estado Atual | Estado Desejado |
|-------|-------------|-----------------|
| Dono cria viagem e delega | Dono/admin criam; motorista NAO cria | Mantido — motorista NAO edita campos da viagem (locked) |
| Motorista cria viagem | BLOQUEADO (app + RLS) | LIBERADO — motorista preenche tudo e pode editar |
| Motorista ve so o proprio historico | RLS ja filtra por `motorista_id` no SELECT | Mantido — ok |

A mudanca principal e **inverter a regra de INSERT**: atualmente so `dono/admin` pode criar viagens. O novo fluxo exige que `motorista` tambem possa criar, com a diferenca de que viagens criadas pelo dono ficam "locked" para edicao pelo motorista.

---

## 2. Analise do Schema Atual

### 2.1 Tabela `viagem` (migration 20260328180700)

A tabela ja possui `created_by UUID REFERENCES usuario(id)` — isso e fundamental pois permite saber quem criou a viagem.

**Campos que faltam:**

| Campo | Tipo | Default | Justificativa |
|-------|------|---------|---------------|
| `valor_frete` | `INTEGER` | `0` | Valor que o cliente paga pelo transporte (centavos). Diferente de `valor_total` que e o custo da viagem. Essencial para margem de lucro (Story 5.6). |
| `editavel_motorista` | `BOOLEAN` | `true` | Flag explicita de lock. |

### 2.2 Decisao Arquitetural: `editavel_motorista` vs Inferencia por Role

**Opcao A: Campo `editavel_motorista` explicito (RECOMENDADA)**

| Aspecto | Avaliacao |
|---------|-----------|
| Clareza | A intencao do dono fica registrada no dado |
| Flexibilidade | Dono pode desbloquear manualmente depois |
| Performance RLS | Filtro direto em booleano, sem JOIN |
| Auditoria | Estado persistido, rastreavel |
| Complexidade | 1 campo extra na migration |

**Opcao B: Inferir pelo role de `created_by`**

| Aspecto | Avaliacao |
|---------|-----------|
| Clareza | Requer JOIN com `usuario` para saber o role do criador |
| Flexibilidade | Nao permite que o dono "desbloqueie" uma viagem |
| Performance RLS | JOIN adicional em EVERY update policy check |
| Auditoria | Depende do estado do usuario no momento da query (se role mudar, muda o lock) |
| Complexidade | 0 campos extra, mas logica RLS mais complexa |

**[AUTO-DECISION]** Opcao A (campo explicito) e superior. Reason: performance no RLS, flexibilidade futura, e o principio de que dados de negocio devem ser persistidos, nao inferidos.

### 2.3 Campo `valor_frete` vs `valor_total`

Analise critica — a tabela ja tem `valor_total` (centavos). Precisamos entender a semantica:

- **`valor_total`** (atual): "Valor total da viagem em centavos (R$ 1.500,00 = 150000)." Pelo comment na migration e pelo uso no ViagemForm ("Valor Total R$"), este campo ja funciona como **valor do frete** cobrado ao cliente.
- **`percentual_pagamento`**: Percentual pago ao motorista sobre o `valor_total`.

**Conclusao:** O campo `valor_total` **ja e** o valor do frete. A Story 5.6 referencia `valor_frete` como se fosse um campo separado, mas a semantica do `valor_total` ja cobre isso. O calculo de margem da Story 5.6 seria: `valor_total - soma_gastos_viagem = lucro`.

**[AUTO-DECISION]** NAO adicionar `valor_frete` como campo separado. O `valor_total` ja cumpre esse papel. Renomear o campo seria uma breaking change desnecessaria. Em vez disso, documentar que `valor_total` = valor do frete cobrado ao cliente. A Story 5.6 deve usar `valor_total` diretamente. Reason: evitar duplicacao de dados e confusao semantica.

---

## 3. Impacto nos RLS Policies

### 3.1 Policies Atuais

```sql
-- INSERT: so dono/admin
CREATE POLICY viagem_insert ON viagem
  FOR INSERT WITH CHECK (
    empresa_id = fn_get_empresa_id()
    AND fn_get_user_role() IN ('dono', 'admin')
  );

-- UPDATE: dono/admin qualquer; motorista a propria
CREATE POLICY viagem_update ON viagem
  FOR UPDATE USING (
    empresa_id = fn_get_empresa_id()
    AND (
      fn_get_user_role() IN ('dono', 'admin')
      OR motorista_id = fn_get_motorista_id()
    )
  );
```

### 3.2 Policies Necessarias (nova migration)

```sql
-- INSERT: dono/admin criam com editavel_motorista = false
--         motorista cria com editavel_motorista = true (autopreenchido no app)
-- RLS libera INSERT para qualquer role da empresa
DROP POLICY IF EXISTS viagem_insert ON viagem;
CREATE POLICY viagem_insert ON viagem
  FOR INSERT WITH CHECK (
    empresa_id = fn_get_empresa_id()
  );

-- UPDATE: dono/admin podem editar tudo
--         motorista so edita SE editavel_motorista = true
--         EXCECAO: motorista SEMPRE pode atualizar status e gastos
--                  (mudanca de status ja e via action separada)
DROP POLICY IF EXISTS viagem_update ON viagem;
CREATE POLICY viagem_update ON viagem
  FOR UPDATE USING (
    empresa_id = fn_get_empresa_id()
    AND (
      fn_get_user_role() IN ('dono', 'admin')
      OR (
        motorista_id = fn_get_motorista_id()
        AND editavel_motorista = true
      )
    )
  );
```

**Ponto critico:** O motorista PRECISA poder atualizar o `status` da viagem (iniciar, concluir) e registrar `km_chegada`, `data_chegada_real` mesmo quando `editavel_motorista = false`. Isso e feito pela action `updateViagemStatus()` que atualiza apenas esses campos. Porem, a RLS policy de UPDATE bloquearia isso.

**Solucao: Policy separada para atualizacao de status**

```sql
-- Motorista pode atualizar status, km_chegada, data_chegada_real
-- mesmo em viagens locked (editavel_motorista = false)
-- Isso requer uma abordagem diferente: usar SECURITY DEFINER function
-- ou permitir UPDATE amplo no RLS e restringir campos no app layer
```

**[AUTO-DECISION]** Manter a policy de UPDATE permissiva para motorista (como ja esta hoje — `motorista_id = fn_get_motorista_id()`) e fazer a restricao de campos editaveis na camada de aplicacao (server actions). Reason: RLS policies com restricao por coluna sao complexas no Supabase (nao ha suporte nativo a column-level RLS). A defesa em profundidade ja existe: a action `updateViagem()` verifica permissoes antes de executar.

### 3.3 Policy Final Recomendada

```sql
-- INSERT: qualquer usuario da empresa (motorista, admin, dono)
DROP POLICY IF EXISTS viagem_insert ON viagem;
CREATE POLICY viagem_insert ON viagem
  FOR INSERT WITH CHECK (
    empresa_id = fn_get_empresa_id()
  );

-- SELECT: mantida (dono/admin ve todas; motorista ve as suas)
-- Sem alteracao.

-- UPDATE: dono/admin qualquer viagem da empresa; motorista so a propria
-- Sem alteracao no RLS. Restricao de campos no app layer.

-- DELETE: mantida (so dono/admin)
-- Sem alteracao.
```

---

## 4. Impacto nos Server Actions

### 4.1 `createViagem()` — MUDANCA NECESSARIA

**Atual (L187-189):**
```typescript
if (usuario.role === 'motorista') {
  return { success: false, error: 'Motorista nao pode criar viagens' };
}
```

**Novo comportamento:**
```typescript
// Remover bloqueio de motorista
// Adicionar logica de editavel_motorista
const editavelMotorista = usuario.role === 'motorista'; // motorista criou → editavel
// Se dono/admin criou → locked para motorista (editavel_motorista = false)

// No insert payload, adicionar:
// editavel_motorista: editavelMotorista,
```

**Quando motorista cria:** O motorista_id e inferido automaticamente do usuario logado (via `usuario.motorista_id`). O motorista so pode selecionar caminhoes vinculados a ele (ja funciona via `listCaminhoesPorMotorista()`).

**Impacto adicional:** A funcao `listMotoristasAtivos()` ja filtra corretamente — quando `role === 'motorista'`, retorna apenas o proprio motorista. OK.

### 4.2 `updateViagem()` — MUDANCA NECESSARIA

**Atual:** Qualquer usuario pode editar campos da viagem se status e `planejada` ou `em_andamento`.

**Novo comportamento:**
```typescript
// Buscar viagem com campo editavel_motorista
const { data: existing } = await supabase
  .from('viagem')
  .select('status, editavel_motorista, motorista_id')
  .eq('id', viagemId)
  .single();

// Se motorista e viagem locked:
if (usuario.role === 'motorista' && !existing.editavel_motorista) {
  return { success: false, error: 'Esta viagem foi criada pelo dono e nao pode ser editada' };
}
```

### 4.3 `updateViagemStatus()` — SEM MUDANCA

O motorista precisa poder iniciar e concluir viagens independente de quem criou. A action atual ja permite que motorista atualize status da propria viagem. OK.

### 4.4 `deleteViagem()` — AJUSTE MENOR

**Atual:** Motorista nao pode excluir viagens.

**Novo comportamento:** Motorista pode excluir viagens que ELE criou (onde `editavel_motorista = true` e `status = 'planejada'`).

```typescript
if (usuario.role === 'motorista') {
  if (!existing.editavel_motorista) {
    return { success: false, error: 'Motorista nao pode excluir viagens criadas pelo dono' };
  }
}
```

### 4.5 `listViagens()` — SEM MUDANCA NECESSARIA

O RLS ja filtra: motorista so ve `WHERE motorista_id = fn_get_motorista_id()`. Nenhuma mudanca necessaria na action.

---

## 5. Impacto nos Componentes

### 5.1 `ViagemForm.tsx` — MUDANCA NECESSARIA

| Area | Mudanca |
|------|---------|
| Modo readonly | Adicionar prop `readonly?: boolean`. Quando true, todos os campos ficam `disabled`, botao de submit escondido. |
| Motorista select | Quando motorista cria, o select de motorista deve vir pre-preenchido e disabled (so pode ser ele mesmo). |
| Caminhao select | Ja funciona — filtra por vinculos do motorista. |

### 5.2 `viagens/page.tsx` — MUDANCA NECESSARIA

| Area | Mudanca |
|------|---------|
| Botao "Nova Viagem" | Atualmente visivel para todos. Deve continuar visivel para motorista tambem (antes era escondido via role check?). Verificar se ha guard no botao. |
| Indicador de lock | Na listagem, exibir icone de cadeado quando `editavel_motorista = false` e o user e motorista. |

**Verificacao necessaria:** A pagina atual nao faz role check para esconder o botao "Nova Viagem" — o botao aparece para todos, mas a action bloqueia motorista. Com a nova regra, o botao ficara funcional para motorista.

### 5.3 `viagens/[id]/page.tsx` — MUDANCA NECESSARIA

A pagina de detalhe/edicao precisa verificar `editavel_motorista` antes de renderizar o form editavel. Se locked, renderizar em modo readonly.

### 5.4 `ViagemList.tsx` — AJUSTE VISUAL

Adicionar coluna ou badge indicando "Criada por voce" / "Delegada pelo dono" para contexto visual do motorista.

### 5.5 `middleware.ts` — SEM MUDANCA

O middleware so gerencia sessao do Supabase. A rota `/viagens` ja esta no matcher implicitamente (qualquer rota `(dashboard)/*`). Sem mudanca necessaria.

---

## 6. Migration SQL Proposta

```sql
-- =============================================================================
-- Migration: Add motorista viagem creation support
-- Feature: Fluxo de criacao de viagem por motorista
-- Timestamp: 20260329XXXXXX (usar timestamp real)
-- =============================================================================

-- ---------------------------------------------------------------------------
-- 1. ADD COLUMN: editavel_motorista
-- ---------------------------------------------------------------------------
ALTER TABLE viagem
  ADD COLUMN IF NOT EXISTS editavel_motorista BOOLEAN NOT NULL DEFAULT true;

COMMENT ON COLUMN viagem.editavel_motorista
  IS 'Se false, motorista nao pode editar campos da viagem (criada pelo dono/admin). Se true, motorista pode editar (criada por ele mesmo ou desbloqueada pelo dono).';

-- ---------------------------------------------------------------------------
-- 2. BACKFILL: viagens existentes criadas por dono/admin → locked
--    viagens criadas por motorista → editavel (nenhuma existe hoje)
-- ---------------------------------------------------------------------------
UPDATE viagem
SET editavel_motorista = false
WHERE created_by IS NOT NULL
  AND created_by IN (
    SELECT id FROM usuario WHERE role IN ('dono', 'admin')
  );

-- Viagens sem created_by (dados antigos) → default locked (seguro)
UPDATE viagem
SET editavel_motorista = false
WHERE created_by IS NULL;

-- ---------------------------------------------------------------------------
-- 3. UPDATE RLS: Allow motorista INSERT
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS viagem_insert ON viagem;
CREATE POLICY viagem_insert ON viagem
  FOR INSERT WITH CHECK (
    empresa_id = fn_get_empresa_id()
  );

-- ---------------------------------------------------------------------------
-- 4. INDEX for editavel_motorista filter (optional, useful for UI queries)
-- ---------------------------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_viagem_editavel
  ON viagem (motorista_id, editavel_motorista)
  WHERE editavel_motorista = true;
```

### Notas sobre a migration:

1. **Backward compatible:** O default `true` nao quebra nada. O backfill corrige viagens existentes.
2. **Nao precisa alterar policies de UPDATE/DELETE/SELECT** — a logica de restricao por `editavel_motorista` fica na camada de aplicacao.
3. **O campo `valor_frete` NAO e adicionado** pois `valor_total` ja cumpre essa semantica (veja secao 2.3).

---

## 7. Classificacao de Epic

### Analise de Pertencimento

| Epic Existente | Escopo | Match? |
|----------------|--------|--------|
| Epic 1 (Usuarios) | CRUD usuario, roles, perfis | Parcial — envolve roles |
| Epic 2 (Gastos) | CRUD gastos, categorias | Nao |
| Epic 3 (Viagens) | CRUD viagem, status, veiculos | SIM — extensao direta |
| Epic 5 (Combustivel/BI) | Notas combustivel, BI | Parcial — Story 5.6 depende |

**[AUTO-DECISION]** Este fluxo pertence ao **Epic 3** como extensao. NAO criar Epic 6. Sugestao de numeracao: **Story 3.4 — Criacao de Viagem por Motorista e Controle de Edicao**.

Reason: O escopo e uma evolucao do CRUD de viagens (Epic 3). Criar um epic separado fragmentaria a documentacao e quebraria a rastreabilidade com Story 3.1/3.2/3.3.

### Dependencias

```
Story 3.4 (esta) ← depende de:
  - Story 3.1 (CRUD viagem) [DONE]
  - Story 1.6 (usuario roles) [DONE]

Story 5.6 (estimativa lucro) ← depende de:
  - Story 3.4 (clarificacao de que valor_total = frete)
  - Story 5.1-5.5 (views de BI)
```

---

## 8. Matriz de Risco e Mitigacao

| Risco | Severidade | Mitigacao |
|-------|-----------|-----------|
| Motorista edita viagem que nao deveria | Alta | `editavel_motorista` checked em TODA server action de mutacao + RLS como 2a barreira |
| Motorista nao consegue iniciar/concluir viagem locked | Alta | `updateViagemStatus()` NAO verifica `editavel_motorista` — sempre permite mudanca de status |
| Dados historicos ficam inconsistentes | Media | Backfill na migration marca todas as existentes como locked |
| `valor_total` confundido com "custo" em vez de "frete" | Media | Adicionar COMMENT na migration, atualizar labels no form |
| Motorista seleciona caminhao de outro motorista | Baixa | Ja mitigado por `listCaminhoesPorMotorista()` |

---

## 9. Checklist de Implementacao (para @dev)

### Migration
- [ ] Criar migration com `editavel_motorista BOOLEAN NOT NULL DEFAULT true`
- [ ] Backfill viagens existentes como `editavel_motorista = false`
- [ ] Atualizar RLS de INSERT para permitir motorista
- [ ] Adicionar COMMENT em `valor_total` clarificando semantica de frete

### Types
- [ ] Adicionar `editavel_motorista: boolean` em `Viagem` interface
- [ ] NAO adicionar `valor_frete` (usar `valor_total`)

### Server Actions
- [ ] `createViagem()`: remover bloqueio de motorista, definir `editavel_motorista` baseado no role
- [ ] `createViagem()`: quando motorista, forcar `motorista_id = usuario.motorista_id`
- [ ] `updateViagem()`: verificar `editavel_motorista` antes de permitir edicao para motorista
- [ ] `updateViagemStatus()`: sem mudanca (motorista sempre pode mudar status)
- [ ] `deleteViagem()`: permitir motorista deletar viagens que ele criou (editavel + planejada)

### Componentes
- [ ] `ViagemForm.tsx`: adicionar prop `readonly` para modo locked
- [ ] `ViagemForm.tsx`: pre-preencher e travar motorista select quando role=motorista
- [ ] `viagens/page.tsx`: manter botao "Nova Viagem" visivel para motorista
- [ ] `viagens/[id]/page.tsx`: verificar editavel_motorista para decidir modo do form
- [ ] `ViagemList.tsx`: adicionar indicador visual de viagem locked

### Testes
- [ ] Motorista cria viagem → `editavel_motorista = true`, `created_by = usuario.id`
- [ ] Dono cria viagem → `editavel_motorista = false`, motorista NAO consegue editar
- [ ] Motorista tenta editar viagem locked → erro amigavel
- [ ] Motorista inicia viagem locked → sucesso (status update permitido)
- [ ] Motorista conclui viagem locked → sucesso com km_chegada e data_chegada_real
- [ ] RLS: motorista so ve viagens WHERE motorista_id = proprio
- [ ] Dono desbloqueia viagem (atualiza editavel_motorista = true) → motorista pode editar

---

## 10. Impacto na Story 5.6 (Estimativa de Lucro)

A Story 5.6 referencia `valor_frete` como campo separado. A analise deste documento conclui que `valor_total` JA E o valor do frete. Impacto na Story 5.6:

1. **AC 4:** "Campo Valor do Frete" no simulador → usar `valor_total` da viagem historica para calculo de lucro real
2. **AC 7:** "Verificar se campo valor_frete existe" → NAO existe e NAO precisa existir. Usar `valor_total`
3. **Dev Notes:** Atualizar para referenciar `valor_total` em vez de `valor_frete`

**Recomendacao:** Atualizar Story 5.6 para remover referencias a `valor_frete` e usar `valor_total` diretamente.

---

*Documento gerado por @architect (Aria) — Siga Bem Project*
*CLI First | Observability Second | UI Third*
