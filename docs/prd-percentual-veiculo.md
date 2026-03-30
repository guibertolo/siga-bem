# PRD: Percentual do Motorista, Lock de Datas e Veiculo Opcional

**Versao:** 1.0
**Data:** 2026-03-29
**Autor:** @pm (Bob/Morgan)
**Origem:** Briefing do stakeholder (proprietario de transportadora cegonheira)

---

## 1. Contexto e Motivacao

O stakeholder levantou tres ajustes no fluxo de viagens apos uso real do sistema:

1. O percentual de pagamento do motorista deve ser controlado exclusivamente pelo patrao (dono/admin), impedindo que o motorista altere esse valor.
2. Viagens criadas pelo motorista devem permitir edicao de datas ate o inicio, a menos que a viagem tenha sido criada pelo patrao.
3. O campo de veiculo (caminhao) no planejamento de viagem nao deve ser obrigatorio -- permitir criacao de viagem sem veiculo vinculado.

---

## 2. Analise do Estado Atual

### 2.1 Percentual de Pagamento (`percentual_pagamento`)

**Schema atual** (migration `20260328180700`):
- Coluna `percentual_pagamento NUMERIC(5,2) NOT NULL DEFAULT 0` na tabela `viagem`
- Constraint: `CHECK (percentual_pagamento >= 0 AND percentual_pagamento <= 100)`

**Frontend atual** (`ViagemForm.tsx`):
- Campo `percentual_pagamento` sempre editavel -- qualquer usuario pode alterar (linhas 353-371)
- Calculo automatico de `valor_motorista` via `calcularValorMotorista()` exibido em tempo real
- Nao existe verificacao de role para este campo

**Backend atual** (`actions.ts`):
- `createViagem` e `updateViagem` aceitam `percentual_pagamento` de qualquer usuario
- Nao ha restricao por role na gravacao do percentual

**Problema:** Motorista pode alterar o proprio percentual. Isso compromete controle financeiro do dono.

### 2.2 Lock de Datas

**Regra atual** (Story 3.4):
- `editavel_motorista = false` quando dono cria -> campos `origem`, `destino`, `valor_total` ficam locked para motorista
- `editavel_motorista = true` quando motorista cria -> pode editar tudo enquanto `status = planejada`
- Datas (`data_saida`, `data_chegada_prevista`) **nunca sao locked** -- sao sempre editaveis no estado atual

**Backend** (`updateViagem` actions.ts, linhas 302-318):
- Apenas verifica lock de `origem`, `destino`, `valor_total`
- Datas nao estao na lista de campos locked

**Problema parcial:** Na verdade o comportamento atual JA permite que motorista edite datas quando `editavel_motorista = true`. O stakeholder quer confirmar que:
- Motorista que criou a viagem pode alterar datas ate iniciar
- Motorista NAO pode alterar datas de viagem criada pelo dono

### 2.3 Veiculo (Caminhao) Obrigatorio

**Schema atual:**
- `caminhao_id UUID NOT NULL REFERENCES caminhao(id)` -- campo NOT NULL

**Frontend atual** (`ViagemForm.tsx`):
- Validacao Zod: `caminhao_id: z.string().min(1, 'Selecione um caminhao')` -- obrigatorio

**Backend atual** (`actions.ts`):
- Schema Zod: `caminhao_id: z.string().uuid('Selecione um caminhao')` -- obrigatorio

**Problema:** Impossivel criar viagem sem veiculo vinculado. Stakeholder quer flexibilidade para definir o caminhao depois.

---

## 3. Requisitos

### FR-001: Percentual do motorista controlado pelo dono

**Regra de negocio:** O campo `percentual_pagamento` so pode ser definido e editado por usuarios com role `dono` ou `admin`. O motorista pode visualizar o valor calculado (`valor_motorista`), mas NAO pode editar o campo `percentual_pagamento`.

**Detalhamento:**

| Cenario | Quem define | Motorista ve | Motorista edita |
|---------|-------------|--------------|-----------------|
| Dono cria viagem | Dono seta o % | Sim (somente leitura) | Nao |
| Motorista cria viagem | Dono seta depois (ou default empresa) | Sim (somente leitura) | Nao |
| Edicao de viagem | Somente dono/admin | Sim (somente leitura) | Nao |

**Implicacao importante:** Quando o motorista cria uma viagem, ele NAO pode definir o percentual. Opcoes:
- **[AUTO-DECISION]** "Como o motorista cria viagem sem percentual?" -> Usar `percentual_pagamento = 0` como default e o dono define depois. (Razao: manter simplicidade; o dono vai revisar a viagem de qualquer forma; zero impede calculo errado antes da definicao.)

**Campos adicionados ao lock:**
- `percentual_pagamento` entra na lista de campos locked junto com `origem`, `destino`, `valor_total`
- Na pratica: campos financeiros = locked para motorista SEMPRE (nao depende de `editavel_motorista`)

### FR-002: Datas editaveis pelo motorista quando ele criou a viagem

**Regra de negocio expandida:**

| Quem criou | Campo | Status `planejada` | Status `em_andamento` |
|------------|-------|--------------------|-----------------------|
| Dono/admin | `data_saida` | Locked para motorista | Locked para todos |
| Dono/admin | `data_chegada_prevista` | Locked para motorista | Locked para todos |
| Motorista | `data_saida` | Editavel pelo motorista | Locked para todos |
| Motorista | `data_chegada_prevista` | Editavel pelo motorista | Locked para todos |

**Regra simplificada:**
```
datas_editaveis_motorista = editavel_motorista === true AND status === 'planejada'
```

Isso ja e consistente com a regra geral de lock da Story 3.4. As datas precisam ser adicionadas a lista de campos verificados no backend.

### FR-003: Veiculo (caminhao) opcional na criacao

**Regra de negocio:**
- O campo `caminhao_id` passa a ser NULLABLE na tabela `viagem`
- Formulario permite salvar viagem sem selecionar caminhao
- Na listagem e detalhe, exibir "-" ou "Nao definido" quando caminhao nao estiver vinculado
- **Configuracao futura:** flag na tabela `empresa` para forcar obrigatoriedade (`obrigar_veiculo_viagem BOOLEAN DEFAULT false`)

**[AUTO-DECISION]** "Implementar a configuracao do patrao agora ou depois?" -> Implementar apenas a opcionalidade agora. A flag de configuracao fica como item de backlog. (Razao: stakeholder disse "podendo ser definido mais para frente", indicando que a config nao e urgente.)

---

## 4. Impacto Tecnico

### 4.1 Migrations Necessarias

#### Migration 1: `caminhao_id` nullable + `percentual_pagamento` lock
```sql
-- 1. Tornar caminhao_id nullable
ALTER TABLE viagem ALTER COLUMN caminhao_id DROP NOT NULL;

-- 2. Nenhuma alteracao de schema para percentual_pagamento
--    (campo ja existe; lock e na camada de aplicacao)
--    (campo ja existe; lock e na camada de aplicacao)
```

**Nao precisa de migration para:**
- `percentual_pagamento` -- campo ja existe, lock e na camada de aplicacao
- `editavel_motorista` -- campo ja existe
- Datas -- lock e na camada de aplicacao

### 4.2 Componentes que Mudam

| Arquivo | Mudanca | Complexidade |
|---------|---------|-------------|
| `types/viagem.ts` | `caminhao_id: string \| null` em `Viagem`; `caminhao_id` opcional em `ViagemFormData` | Baixa |
| `components/viagens/ViagemForm.tsx` | (1) `percentual_pagamento` disabled para motorista; (2) `caminhao_id` nao obrigatorio no Zod; (3) datas disabled quando lock ativo | Media |
| `app/(dashboard)/viagens/actions.ts` | (1) Validacao Zod de `caminhao_id` aceitar vazio; (2) `createViagem` forcar `percentual_pagamento = 0` para motorista; (3) `updateViagem` bloquear edicao de percentual por motorista; (4) `updateViagem` bloquear edicao de datas quando locked | Media |
| `app/(dashboard)/viagens/nova/page.tsx` | Remover guard `noCaminhaoMessage` (caminhao nao e mais obrigatorio) | Baixa |
| `app/(dashboard)/viagens/[id]/page.tsx` | Exibir "Nao definido" para caminhao null; ajustar calculo de estimativa quando sem caminhao | Baixa |
| `components/viagens/VeiculosSection.tsx` | Nenhuma (veiculos transportados sao independentes do caminhao) | Nenhuma |
| `components/viagens/EstimativaViagem.tsx` | Tratar `caminhaoId = null` (sem estimativa de consumo) | Baixa |

### 4.3 Logica de Lock Expandida

A regra de lock precisa cobrir mais campos:

```typescript
// ANTES (Story 3.4): apenas origem, destino, valor_total
const camposCoreLocked = !(role === 'dono' || (editavel_motorista && status === 'planejada'));

// DEPOIS: campos core + datas + percentual
const camposCoreLocked = !(role === 'dono' || (editavel_motorista && status === 'planejada'));
// Inclui agora: origem, destino, valor_total, data_saida, data_chegada_prevista

// PERCENTUAL: sempre locked para motorista (independente de editavel_motorista)
const percentualLocked = role === 'motorista'; // true = motorista nunca edita
```

**Tabela completa de permissoes por campo:**

| Campo | Dono/Admin | Motorista (criou) `planejada` | Motorista (dono criou) `planejada` | Qualquer `em_andamento+` |
|-------|-----------|-------------------------------|-------------------------------------|--------------------------|
| `origem` | Editavel | Editavel | Locked | Locked* |
| `destino` | Editavel | Editavel | Locked | Locked* |
| `valor_total` | Editavel | Editavel | Locked | Locked* |
| `data_saida` | Editavel | Editavel | **Locked** (novo) | Locked |
| `data_chegada_prevista` | Editavel | Editavel | **Locked** (novo) | Locked |
| `percentual_pagamento` | Editavel | **Locked** (novo) | **Locked** (novo) | Dono editavel** |
| `caminhao_id` | Editavel | Editavel | Editavel | Locked |
| `observacao` | Editavel | Editavel | Editavel | Editavel |
| `km_estimado` | Editavel | Editavel | Editavel | Locked |
| `km_saida` | Editavel | Editavel | Editavel | Editavel |

\* Dono pode editar campos core em `em_andamento` (regra atual mantida)
\** Dono pode ajustar percentual a qualquer momento (decisao de negocio: ele controla o financeiro)

---

## 5. Stories Derivadas

### Story S-001: Percentual do motorista exclusivo do dono

**Escopo:**
- Frontend: `percentual_pagamento` disabled para motorista em `ViagemForm.tsx`
- Backend: `createViagem` seta `percentual_pagamento = 0` quando motorista cria
- Backend: `updateViagem` rejeita alteracao de `percentual_pagamento` por motorista
- Frontend: motorista ve campo readonly com valor + `valor_motorista` calculado

**Estimativa:** P (1 dia)
**Dependencias:** Story 3.4 (Done)
**Bloqueia:** Nenhum

### Story S-002: Datas locked para motorista em viagem do dono

**Escopo:**
- Frontend: `data_saida` e `data_chegada_prevista` disabled quando `camposLocked = true`
- Backend: `updateViagem` bloqueia alteracao de datas quando locked
- Datas adicionadas a lista de campos verificados no check de `coreFieldChanged`

**Estimativa:** P (0.5 dia)
**Dependencias:** Story 3.4 (Done)
**Bloqueia:** Nenhum

### Story S-003: Veiculo opcional na viagem

**Escopo:**
- Migration: `ALTER TABLE viagem ALTER COLUMN caminhao_id DROP NOT NULL`
- Frontend: remover `min(1)` do Zod para `caminhao_id`
- Backend: aceitar `caminhao_id = null` na validacao e insert
- Frontend: tratar caminhao null no detalhe e listagem
- Ajustar `EstimativaViagem` para funcionar sem caminhao

**Estimativa:** M (1-2 dias)
**Dependencias:** Story 3.4 (Done), Story 3.3 (Done)
**Bloqueia:** Nenhum

### Story S-004 (Backlog): Configuracao de obrigatoriedade de veiculo por empresa

**Escopo:**
- Migration: coluna `obrigar_veiculo_viagem BOOLEAN DEFAULT false` na tabela `empresa`
- Tela de configuracoes: toggle para dono ativar/desativar
- Validacao condicional: se flag ativa, `caminhao_id` volta a ser obrigatorio no formulario

**Estimativa:** P (1 dia)
**Dependencias:** Story S-003
**Status:** Backlog (stakeholder indicou que e futuro)

---

## 6. Riscos e Mitigacoes

| Risco | Probabilidade | Impacto | Mitigacao |
|-------|--------------|---------|-----------|
| Viagens existentes com caminhao_id NOT NULL quebram com FK check | Baixa | Alto | Migration apenas relaxa constraint; dados existentes ficam validos |
| Motorista cria viagem com percentual 0 e dono esquece de setar | Media | Alto | Dashboard deve alertar viagens com percentual 0 (story futura de notificacao) |
| Estimativa de custo quebra sem caminhao vinculado | Media | Baixo | `EstimativaViagem` ja recebe `caminhaoId` como prop -- tratar null com mensagem "Defina um caminhao para ver estimativa" |
| RLS de viagem referencia caminhao_id -- nullable pode gerar inconsistencia | Baixa | Medio | RLS atual nao filtra por caminhao_id; sem impacto |

---

## 7. Decisoes Autonomas Registradas

| # | Pergunta | Decisao | Razao |
|---|----------|---------|-------|
| 1 | Como o motorista cria viagem sem poder definir percentual? | `percentual_pagamento = 0` como default; dono define depois | Simplicidade; zero impede calculo incorreto antes da revisao do dono |
| 2 | Implementar config de obrigatoriedade de veiculo agora? | Nao, apenas opcionalidade. Config fica no backlog (Story S-004) | Stakeholder disse "mais para frente"; nao e urgente |
| 3 | Percentual deve ser locked mesmo em viagens criadas pelo motorista? | Sim, SEMPRE locked para motorista | Stakeholder foi explicito: "setado pelo patrao", "alterado somente pelo patrao" |
| 4 | Dono pode alterar percentual em viagem em_andamento? | Sim | Dono controla financeiro em qualquer estado da viagem |

---

## 8. Resumo Executivo

| Item | Status Atual | Acao Necessaria |
|------|-------------|-----------------|
| Percentual do motorista | Qualquer usuario edita | Restringir a dono/admin (frontend + backend) |
| Datas em viagem do dono | Sempre editaveis | Adicionar ao lock quando `editavel_motorista = false` |
| Veiculo obrigatorio | NOT NULL no schema + obrigatorio no form | Tornar nullable + remover obrigatoriedade |
| Config de obrigatoriedade | Nao existe | Backlog (Story S-004) |

**Total estimado:** 3-4 dias de desenvolvimento (Stories S-001, S-002, S-003)
**Migrations:** 1 (caminhao_id nullable)
**Componentes impactados:** 5 arquivos
