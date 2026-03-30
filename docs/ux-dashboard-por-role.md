# UX Spec: Dashboard por Role (Motorista vs Dono/Admin)

**Data:** 2026-03-29
**Autor:** Uma (UX Design Expert)
**Status:** Spec Aprovada

---

## 1. Problema

O dashboard atual exibe os mesmos 3 cards para todos os usuarios:

| Card | Componente | Dados |
|------|-----------|-------|
| Viagens em andamento | `ViagemSummaryCard` | count |
| Gastos do mes | `GastoSummaryCard` | R$ total |
| Acertos pendentes | `FechamentoSummaryCard` | count + R$ total |

**Insight do stakeholder:** "No dashboard do motorista, mostrar os ganhos e nao os gastos. Gastos nao e uma informacao importante para ele, e sim para o patrao."

O motorista precisa ver **quanto ganhou** e **suas viagens**. Gastos totais e acertos pendentes sao metricas de gestao financeira, relevantes apenas para dono/admin.

---

## 2. Roles do Sistema

| Role | Perspectiva | Necessidade no Dashboard |
|------|------------|--------------------------|
| `motorista` | Operacional pessoal | Meus ganhos, minhas viagens, minha agenda |
| `dono` | Gestao financeira | Gastos totais, acertos, visao geral da frota |
| `admin` | Gestao financeira (delegado) | Mesmo que dono |

**Regra de decisao:** `isMotorista = role === 'motorista'`. Dono e admin compartilham o mesmo layout.

---

## 3. Layout: Dashboard do MOTORISTA

### Hierarquia Visual

```
+-----------------------------------------------+
|  Inicio                                        |
|  Bem-vindo, Joao                               |
+-----------------------------------------------+
|                                                 |
|  [ViagemAtivaCard - JA EXISTE]                 |
|  Em Viagem: SP -> RJ                           |
|  Caminhao: ABC-1234 - Scania R450              |
|  Frete: R$ 8.500,00                            |
|  [Ir para Viagem] [+ Despesa] [+ Abastecimento]|
|                                                 |
+-----------------------------------------------+
|                                                 |
|  +-----------------+  +-----------------+       |
|  | Meus Ganhos     |  | Viagens         |       |
|  | R$ 4.250,00     |  | Concluidas      |       |
|  | Este mes        |  | 12              |       |
|  |                 |  | Este mes        |       |
|  +-----------------+  +-----------------+       |
|                                                 |
|  +-----------------+                            |
|  | Proxima Viagem  |                            |
|  | RJ -> MG        |                            |
|  | Saida: 02/04    |                            |
|  | Frete: R$ 6.800 |                            |
|  +-----------------+                            |
|                                                 |
+-----------------------------------------------+
```

### Cards do Motorista

| Posicao | Card | Dados | Componente | Status |
|---------|------|-------|-----------|--------|
| Topo | Viagem Ativa | viagem em_andamento do motorista | `ViagemAtivaCard` | JA EXISTE |
| Grid 1 | Meus Ganhos | `SUM(valor_total * percentual_pagamento / 100)` das viagens concluidas do motorista no mes | `MeusGanhosCard` (NOVO) | CRIAR |
| Grid 2 | Viagens Concluidas | count de viagens concluidas do motorista no mes | `ViagensConcludasCard` (NOVO) | CRIAR |
| Grid 3 | Proxima Viagem | proxima viagem planejada do motorista | `ProximaViagemCard` (NOVO) | CRIAR |

### Cards que o motorista NAO ve

- `GastoSummaryCard` -- gastos sao metricas do dono
- `FechamentoSummaryCard` -- acertos sao metricas do dono
- `ViagemSummaryCard` (versao atual) -- substituido por `ViagensConcludasCard`

---

## 4. Layout: Dashboard do DONO / ADMIN

### Hierarquia Visual

```
+-----------------------------------------------+
|  Inicio                                        |
|  Bem-vindo, Carlos                             |
+-----------------------------------------------+
|                                                 |
|  [ViagemAtivaCard - JA EXISTE]                 |
|  3 viagens em andamento                        |
|  SP->RJ (Joao - ABC-1234) [Ver]               |
|  MG->BA (Pedro - DEF-5678) [Ver]              |
|  RS->SC (Ana - GHI-9012) [Ver]                |
|                                                 |
+-----------------------------------------------+
|                                                 |
|  +-----------------+  +-----------------+       |
|  | Viagens         |  | Gastos          |       |
|  | Em andamento    |  | R$ 45.200,00    |       |
|  | 3               |  | Este mes        |       |
|  +-----------------+  +-----------------+       |
|                                                 |
|  +-----------------+                            |
|  | Acertos         |                            |
|  | Pendentes       |                            |
|  | 5               |                            |
|  | Total: R$ 12.3k |                            |
|  +-----------------+                            |
|                                                 |
+-----------------------------------------------+
```

### Cards do Dono/Admin

| Posicao | Card | Dados | Componente | Status |
|---------|------|-------|-----------|--------|
| Topo | Viagens Ativas (todas) | todas em_andamento | `ViagemAtivaCard` | JA EXISTE |
| Grid 1 | Viagens em andamento | count total | `ViagemSummaryCard` | JA EXISTE |
| Grid 2 | Gastos do mes | R$ total | `GastoSummaryCard` | JA EXISTE |
| Grid 3 | Acertos pendentes | count + R$ | `FechamentoSummaryCard` | JA EXISTE |

Sem alteracoes nos componentes existentes do dono.

---

## 5. Componentes: Plano de Criacao/Modificacao

### 5.1. CRIAR: `MeusGanhosCard`

**Arquivo:** `components/dashboard/MeusGanhosCard.tsx`

**Props:**
```typescript
interface MeusGanhosCardProps {
  totalCentavos: number; // ganhos do motorista no mes (centavos)
}
```

**Calculo do ganho:**
```sql
-- Para o motorista logado, viagens concluidas no mes atual:
SELECT COALESCE(SUM(ROUND(valor_total * percentual_pagamento / 100)::INTEGER), 0)
FROM viagem
WHERE motorista_id = :motorista_id
  AND status = 'concluida'
  AND data_chegada_real >= date_trunc('month', CURRENT_DATE)
  AND data_chegada_real < date_trunc('month', CURRENT_DATE) + interval '1 month'
```

**Visual:** Mesmo estilo do `GastoSummaryCard`, mas com titulo "Meus Ganhos" e cor `text-success` (verde) no valor, reforcarando a conotacao positiva.

**Acessibilidade:** `aria-label="Meus ganhos do mes: R$ X.XXX,XX"`

---

### 5.2. CRIAR: `ViagensConcludasCard`

**Arquivo:** `components/dashboard/ViagensConcludasCard.tsx`

**Props:**
```typescript
interface ViagensConcludasCardProps {
  count: number;
}
```

**Visual:** Mesmo estilo do `ViagemSummaryCard`, titulo "Viagens Concluidas", subtitulo "Este mes".

**Acessibilidade:** `aria-label="Viagens concluidas no mes: X"`

---

### 5.3. CRIAR: `ProximaViagemCard`

**Arquivo:** `components/dashboard/ProximaViagemCard.tsx`

**Props:**
```typescript
interface ProximaViagemCardProps {
  viagem: {
    id: string;
    origem: string;
    destino: string;
    data_saida: string;
    valor_total: number; // centavos
    caminhao_placa: string;
  } | null;
}
```

**Visual:**
- Se `viagem === null`: estado vazio com texto "Nenhuma viagem planejada"
- Se existe: mostra rota, data de saida formatada, valor do frete, link para detalhes
- Borda left accent azul (`border-l-4 border-blue-400`) para diferenciar de viagem ativa (amarelo)

**Acessibilidade:** `aria-label="Proxima viagem: {origem} para {destino}, saida em {data}"`

---

### 5.4. MODIFICAR: `app/(dashboard)/dashboard/actions.ts`

**Adicionar funcao:**
```typescript
export async function getMotoristaData(motoristaId: string): Promise<{
  ganhosMes: number;         // centavos
  viagensConcludasMes: number;
  proximaViagem: ProximaViagemItem | null;
}>
```

Essa funcao executa 3 queries em paralelo via `Promise.all()`:

1. **Ganhos do mes:** `SUM(ROUND(valor_total * percentual_pagamento / 100))` de viagens concluidas do motorista no mes
2. **Viagens concluidas:** `COUNT(*)` de viagens concluidas do motorista no mes
3. **Proxima viagem:** primeira viagem `planejada` do motorista, ordenada por `data_saida ASC`, `LIMIT 1`

---

### 5.5. MODIFICAR: `app/(dashboard)/dashboard/page.tsx`

**Mudancas:**

1. Importar os 3 novos componentes
2. Chamar `getMotoristaData()` condicionalmente (apenas se `isMotorista`)
3. Renderizar grid condicional:

```tsx
{isMotorista ? (
  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
    <MeusGanhosCard totalCentavos={motoristaData.ganhosMes} />
    <ViagensConcludasCard count={motoristaData.viagensConcludasMes} />
    <ProximaViagemCard viagem={motoristaData.proximaViagem} />
  </div>
) : (
  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
    <ViagemSummaryCard count={dashboardData.viagens.count} error={dashboardData.viagens.error} />
    <GastoSummaryCard total={dashboardData.gastos.total} />
    <FechamentoSummaryCard count={dashboardData.fechamentos.count} totalCentavos={dashboardData.fechamentos.totalCentavos} />
  </div>
)}
```

**Otimizacao de data fetching:** Nao chamar `getDashboardData()` para motorista (queries de gastos e fechamentos sao irrelevantes). Usar condicional:

```tsx
const isMotorista = currentUsuario?.role === 'motorista';

const [dashboardData, viagemAtiva, motoristaData] = await Promise.all([
  isMotorista ? null : getDashboardData(),
  getViagemAtiva(),
  isMotorista && currentUsuario?.motorista_id
    ? getMotoristaData(currentUsuario.motorista_id)
    : null,
]);
```

---

## 6. Mapeamento de Dados Existentes

| Dado necessario | Tabela | Campo | Ja disponivel? |
|----------------|--------|-------|---------------|
| Ganhos do motorista | `viagem` | `valor_total * percentual_pagamento / 100` | Sim (calculo existe em fechamento) |
| Viagens concluidas (count) | `viagem` | `status = 'concluida'` + filtro mes | Sim |
| Proxima viagem planejada | `viagem` | `status = 'planejada'` + `motorista_id` | Sim |
| Role do usuario | `usuario` | `role` | Sim (ja usado) |
| Motorista ID | `usuario` | `motorista_id` | Sim (ja usado em ViagemAtivaCard) |

Nenhuma alteracao de schema necessaria. Todos os dados ja existem.

---

## 7. Decisoes de Design

### [AUTO-DECISION] Mostrar valor bruto ou liquido nos ganhos?
**Decisao:** Valor bruto (percentual sobre o frete), sem descontar gastos.
**Razao:** O motorista quer ver quanto "ganhou" pelas viagens. O saldo liquido (ganhos - gastos) e uma metrica do fechamento/acerto, nao do dia a dia. Alem disso, `saldo_motorista` so existe quando o fechamento e gerado.

### [AUTO-DECISION] Grid de 2 ou 3 colunas para motorista?
**Decisao:** 3 colunas (mesma grid do dono), mantendo consistencia visual.
**Razao:** O terceiro card (Proxima Viagem) agrega valor real ao motorista e evita espaco vazio no layout desktop.

### [AUTO-DECISION] Card "Proxima Viagem" com link ou sem?
**Decisao:** Card inteiro e clicavel (Link para `/viagens/{id}`), igual ao `FechamentoSummaryCard`.
**Razao:** Consistencia com o padrao existente de cards clicaveis.

### [AUTO-DECISION] Cor do valor em MeusGanhosCard?
**Decisao:** `text-success` (verde do design system).
**Razao:** Reforcar conotacao positiva de ganho. O `GastoSummaryCard` usa `text-primary-700` (neutro). Ganho deve ter diferenciacao emocional.

---

## 8. Checklist de Acessibilidade

| Item | Especificacao |
|------|--------------|
| Contraste | Todos os cards seguem tokens existentes (ja validados) |
| Screen reader | Cada card tem `aria-label` descritivo com contexto |
| Keyboard | Cards clicaveis acessiveis via Tab + Enter |
| Focus visible | Usar `focus-visible:ring-2 focus-visible:ring-primary-500` nos cards clicaveis |
| Texto responsivo | Valores em `tabular-nums` para alinhamento consistente |

---

## 9. Resumo de Arquivos

### Criar (3 arquivos)
| Arquivo | Tipo |
|---------|------|
| `components/dashboard/MeusGanhosCard.tsx` | Componente |
| `components/dashboard/ViagensConcludasCard.tsx` | Componente |
| `components/dashboard/ProximaViagemCard.tsx` | Componente |

### Modificar (2 arquivos)
| Arquivo | Mudanca |
|---------|---------|
| `app/(dashboard)/dashboard/actions.ts` | Adicionar `getMotoristaData()` + tipo `ProximaViagemItem` |
| `app/(dashboard)/dashboard/page.tsx` | Renderizacao condicional por role, data fetching otimizado |

### Sem alteracao
| Arquivo | Razao |
|---------|-------|
| `components/dashboard/ViagemAtivaCard.tsx` | Ja diferencia motorista/dono |
| `components/dashboard/GastoSummaryCard.tsx` | Permanece apenas no dashboard do dono |
| `components/dashboard/ViagemSummaryCard.tsx` | Permanece apenas no dashboard do dono |
| `components/dashboard/FechamentoSummaryCard.tsx` | Permanece apenas no dashboard do dono |

---

## 10. Impacto Visual por Role

### Motorista ve:
1. Viagem ativa (destaque amarelo, CTAs grandes)
2. Quanto ganhou no mes (verde, positivo)
3. Quantas viagens concluiu (neutro, informativo)
4. Proxima viagem agendada (azul, orientacao)

### Dono/Admin ve:
1. Todas as viagens ativas da frota (lista)
2. Quantidade de viagens em andamento (monitoramento)
3. Gastos totais do mes (controle financeiro)
4. Acertos pendentes com valor (cobranca)

**Principio:** Cada role ve a informacao que gera **acao** para seu contexto. Motorista age sobre viagens. Dono age sobre financas.
