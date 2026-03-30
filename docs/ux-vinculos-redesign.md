# UX Specification: Redesign da Pagina de Vinculos

**Data:** 2026-03-30
**Autora:** Uma (UX Design Expert)
**Status:** Proposta
**Publico-alvo:** Donos de frota, 55+, baixa familiaridade digital

---

## 1. Analise do Estado Atual

### 1.1 Arquivos Envolvidos

| Arquivo | Funcao |
|---------|--------|
| `app/(dashboard)/vinculos/page.tsx` | Pagina principal — busca dados, renderiza header + VinculoList |
| `components/vinculos/VinculoList.tsx` | Componente client — agrupa vinculos ativos por caminhao, lista inativos |
| `app/(dashboard)/vinculos/actions.ts` | Server actions — CRUD de vinculos, queries com filtros |
| `app/(dashboard)/vinculos/historico/page.tsx` | Pagina de historico — reutiliza VinculoList |
| `components/vinculos/VincularCaminhaoInlineForm.tsx` | Form inline usado na pagina de detalhe do motorista |
| `components/vinculos/VincularMotoristaInlineForm.tsx` | Form inline usado na pagina de detalhe do caminhao |
| `types/motorista-caminhao.ts` | Tipos TypeScript: VinculoListItem, options, etc. |

### 1.2 Problemas Identificados

1. **Layout tabular nao comunica status visual** — O dono precisa LER cada linha para entender quem esta vinculado a que. Nao ha indicacao visual imediata de "tudo bem" vs "precisa de atencao".

2. **Caminhoes sem motorista sao invisiveis** — A listagem atual so mostra vinculos que EXISTEM. Se um caminhao nao tem nenhum vinculo ativo, ele simplesmente nao aparece. O dono nao sabe que tem um caminhao parado sem motorista.

3. **Motoristas sem caminhao tambem sao invisiveis** — Mesmo problema. Um motorista ativo sem vinculo nao aparece nesta pagina.

4. **Hierarquia visual fraca** — Header com dois botoes (Historico + Novo Vinculo) lado a lado sem diferenciacao clara de prioridade. O botao "Novo Vinculo" pode nem ser necessario se a criacao inline for suficiente.

5. **Historico como pagina separada** — Navegar para outra pagina para ver vinculos encerrados quebra o fluxo mental. O historico deveria ser uma secao colapsavel na mesma pagina.

6. **Botao "Encerrar" muito discreto** — Texto pequeno (text-sm), min-h de 40px (abaixo do padrao 48px para 55+). A acao e destrutiva e precisa de confirmacao.

7. **Sem contador resumo** — O dono nao vê de relance: "5 caminhoes com motorista, 2 sem motorista".

### 1.3 O Que Funciona Bem

- Agrupamento por caminhao ja existe (logica de `groupedActive` no VinculoList)
- Badge de "N motoristas ativos" para caminhoes com multiplos vinculos
- Data "Desde DD/MM/YYYY" ja formatada em PT-BR
- Layout responsivo com cards mobile + tabela desktop para inativos
- Inline forms ja permitem vincular a partir das paginas de detalhe

---

## 2. Proposta de Layout

### 2.1 Estrutura Geral da Pagina

```
+----------------------------------------------------------+
|  VINCULOS DA FROTA                                       |
|  Visao geral de motoristas e caminhoes vinculados        |
+----------------------------------------------------------+
|                                                          |
|  [N] Vinculados    [N] Sem Motorista    [N] Historico    |
|  (contador verde)  (contador vermelho)  (contador cinza) |
|                                                          |
+----------------------------------------------------------+
|                                                          |
|  SECAO 1: CAMINHOES COM MOTORISTA                        |
|  (borda esquerda verde, fundo neutro)                    |
|                                                          |
|  +-------------+  +-------------+  +-------------+      |
|  | CARD        |  | CARD        |  | CARD        |      |
|  | ABC-1234    |  | DEF-5678    |  | GHI-9012    |      |
|  | Scania R450 |  | Volvo FH540 |  | MB Actros   |      |
|  |             |  |             |  |             |      |
|  | [avatar]    |  | [avatar]    |  | [avatar]    |      |
|  | Joao Silva  |  | Maria Santos|  | 2 motoristas|      |
|  | Desde 15/01 |  | Desde 03/02 |  | badge info  |      |
|  |             |  |             |  |             |      |
|  | [Encerrar]  |  | [Encerrar]  |  | [Encerrar]  |      |
|  +-------------+  +-------------+  +-------------+      |
|                                                          |
+----------------------------------------------------------+
|                                                          |
|  SECAO 2: CAMINHOES SEM MOTORISTA (!)                    |
|  (borda esquerda vermelha, fundo aviso sutil)            |
|                                                          |
|  +--------------------+  +--------------------+          |
|  | CARD ALERTA        |  | CARD ALERTA        |          |
|  | JKL-3456           |  | MNO-7890           |          |
|  | DAF XF             |  | Iveco Stralis      |          |
|  |                    |  |                    |          |
|  | Sem motorista      |  | Sem motorista      |          |
|  |                    |  |                    |          |
|  | [Vincular Agora]   |  | [Vincular Agora]   |          |
|  +--------------------+  +--------------------+          |
|                                                          |
+----------------------------------------------------------+
|                                                          |
|  SECAO 3: HISTORICO DE VINCULOS (colapsado)              |
|  [v] Mostrar historico (N registros)                     |
|                                                          |
|  (quando expandido: lista cronologica simples)           |
|                                                          |
+----------------------------------------------------------+
```

### 2.2 Layout Responsivo

- **Mobile (< 640px):** Cards em coluna unica, 100% largura. Secoes empilhadas verticalmente.
- **Tablet (640px - 1024px):** Grid de 2 colunas para cards.
- **Desktop (> 1024px):** Grid de 3 colunas para cards. Maximo `max-w-5xl` (mantendo padrao existente).

---

## 3. Especificacao do Componente Card

### 3.1 VinculoCard (Caminhao com Motorista)

```
+-----------------------------------------------+
|  [icone caminhao]  ABC-1234                    |  <-- header
|                    Scania R450                 |
+-----------------------------------------------+
|                                                |
|  [icone pessoa]  Joao da Silva                 |  <-- motorista
|                  Desde 15/01/2026              |
|                                                |
+-----------------------------------------------+
|            [Encerrar Vinculo]                  |  <-- acao
+-----------------------------------------------+
```

**Variante: Multiplos motoristas**

```
+-----------------------------------------------+
|  [icone caminhao]  DEF-5678           [2]     |  <-- badge
|                    Volvo FH540                 |
+-----------------------------------------------+
|                                                |
|  [icone pessoa]  Joao da Silva                 |
|                  Desde 15/01/2026              |
|                  [Encerrar]                    |
|  -------------------------------------------- |
|  [icone pessoa]  Maria Santos                  |
|                  Desde 20/02/2026              |
|                  [Encerrar]                    |
|                                                |
+-----------------------------------------------+
```

#### Especificacao Visual

| Propriedade | Valor |
|-------------|-------|
| Container | `rounded-lg border-l-4 border border-surface-border bg-surface-card shadow-sm` |
| Borda esquerda (com motorista) | `border-l-success` (verde) |
| Borda esquerda (sem motorista) | `border-l-danger` (vermelho) |
| Padding header | `px-4 py-3` (mobile) / `px-5 py-4` (desktop) |
| Padding conteudo | `px-4 py-3` |
| Titulo caminhao (placa) | `text-lg font-bold text-primary-900 tabular-nums` |
| Subtitulo (modelo) | `text-base text-primary-500` |
| Nome motorista | `text-base font-medium text-primary-900` |
| Data "Desde" | `text-base text-primary-700` |
| Badge multiplos | `rounded-full bg-primary-500/10 text-primary-700 px-3 py-1 text-sm font-semibold` |
| Icone caminhao | SVG truck, `h-6 w-6 text-primary-500` |
| Icone pessoa | SVG user circle, `h-5 w-5 text-primary-400` |
| Botao Encerrar | `min-h-[48px] text-base font-medium text-danger hover:bg-alert-danger-bg rounded-lg px-4 py-3` |

### 3.2 CaminhaoSemMotoristaCard (Alerta)

```
+-----------------------------------------------+
|  [icone caminhao]  JKL-3456                    |
|                    DAF XF                      |
+-----------------------------------------------+
|                                                |
|  [icone alerta]  Sem motorista vinculado       |
|                                                |
+-----------------------------------------------+
|          [Vincular Motorista]                  |
+-----------------------------------------------+
```

#### Especificacao Visual

| Propriedade | Valor |
|-------------|-------|
| Container | `rounded-lg border-l-4 border-l-danger border border-danger/20 bg-alert-danger-bg/30 shadow-sm` |
| Texto alerta | `text-base font-medium text-danger` |
| Icone alerta | SVG exclamation-circle, `h-5 w-5 text-danger` |
| Botao Vincular | `min-h-[48px] w-full text-base font-semibold bg-primary-700 text-white rounded-lg px-4 py-3 hover:bg-primary-800` |

---

## 4. Mapeamento de Cores e Status

### 4.1 Status Visuais

| Estado | Borda Esquerda | Fundo | Icone | Significado para o Dono |
|--------|---------------|-------|-------|------------------------|
| Caminhao com motorista | `border-l-success` | `bg-surface-card` | Caminhao verde | "Tudo certo, caminhao operacional" |
| Caminhao sem motorista | `border-l-danger` | `bg-alert-danger-bg/30` | Alerta vermelho | "Precisa de atencao! Caminhao parado" |
| Multiplos motoristas | Badge informativo | `bg-surface-card` | Badge numerico | "Caminhao com revezamento" |
| Vinculo encerrado | `border-l-surface-border` | `bg-surface-muted/50` | Cinza | "Historico, nao precisa de acao" |

### 4.2 Tokens Utilizados (existentes no projeto)

Todos os tokens abaixo ja estao em uso no projeto, garantindo consistencia:

- `text-success` / `bg-alert-success-bg` — usado em badges "Ativo" e status cards
- `text-danger` / `bg-alert-danger-bg` — usado em mensagens de erro e botao "Encerrar"
- `text-warning` / `bg-alert-warning-bg` — usado em badges de aviso (multiplos motoristas)
- `text-primary-900` / `text-primary-700` / `text-primary-500` — hierarquia textual padrao
- `bg-surface-card` / `border-surface-border` / `bg-surface-muted` — containers padrao
- `rounded-card` — border-radius padrao para cards (usado em dashboard)

---

## 5. Contadores de Resumo (Summary Bar)

### 5.1 Especificacao

Barra de resumo posicionada entre o header e as secoes de cards.

```
+----------------------------------------------------------+
|  [N] Vinculados        [N] Sem Motorista     [N] Encerrados
|  (verde)               (vermelho)            (cinza)
+----------------------------------------------------------+
```

| Propriedade | Valor |
|-------------|-------|
| Container | `flex items-center gap-4 flex-wrap` (mobile: `grid grid-cols-3`) |
| Item | `flex items-center gap-2 rounded-lg border border-surface-border bg-surface-card px-4 py-3 flex-1 min-w-[140px]` |
| Numero (vinculados) | `text-2xl font-bold text-success tabular-nums` |
| Numero (sem motorista) | `text-2xl font-bold text-danger tabular-nums` |
| Numero (encerrados) | `text-2xl font-bold text-primary-500 tabular-nums` |
| Label | `text-base text-primary-700` |

### 5.2 Logica

- **Vinculados:** Count de caminhoes distintos com pelo menos 1 vinculo ativo
- **Sem Motorista:** Count de caminhoes ativos da empresa que NAO tem nenhum vinculo ativo
- **Encerrados:** Count de vinculos com `ativo = false`

**IMPORTANTE:** Para mostrar "Caminhoes sem Motorista", a query precisa cruzar a tabela `caminhao` (ativos) com `motorista_caminhao` (vinculos ativos). Isso requer uma nova server action ou modificacao da `listVinculos`.

---

## 6. Padroes de Interacao

### 6.1 Encerrar Vinculo

**Fluxo atual:** Click no botao -> server action encerra imediatamente.

**Fluxo proposto:** Click no botao -> **confirmacao inline** dentro do card -> server action.

```
Estado normal:
  [Encerrar Vinculo]

Apos click:
  "Encerrar vinculo de Joao com ABC-1234?"
  [Confirmar]  [Cancelar]
```

**Justificativa:** Para o publico 55+, acoes destrutivas sem confirmacao geram ansiedade. A confirmacao deve ser inline (dentro do card), nao um modal, para manter o contexto visual.

| Propriedade | Valor |
|-------------|-------|
| Container confirmacao | `rounded-lg border border-warning/30 bg-alert-warning-bg p-3 mt-2` |
| Texto confirmacao | `text-base text-primary-900` |
| Botao confirmar | `min-h-[48px] bg-danger text-white rounded-lg px-4 py-3 text-base font-semibold` |
| Botao cancelar | `min-h-[48px] border border-surface-border rounded-lg px-4 py-3 text-base font-medium` |

### 6.2 Vincular Motorista (Card sem motorista)

**Fluxo:** Click em "Vincular Motorista" -> expande form inline dentro do card (similar ao `VincularMotoristaInlineForm` existente) -> selecionar motorista no dropdown -> confirmar.

O form inline ja existe como componente (`VincularMotoristaInlineForm.tsx`). Reutilizar o mesmo padrao visual, adaptado ao formato card.

### 6.3 Historico Colapsavel

**Fluxo:** Click em "Mostrar Historico (N)" -> secao expande com animacao suave -> lista de vinculos encerrados em formato simplificado.

| Propriedade | Valor |
|-------------|-------|
| Trigger | `<button>` com `min-h-[48px]`, icone chevron rotativo |
| Animacao | CSS `transition-all duration-200` + `max-height` ou `<details>/<summary>` nativo |
| Estado colapsado | Apenas o botao trigger visivel |
| Estado expandido | Lista cronologica: "Joao Silva - ABC-1234 (15/01 a 20/03/2026)" |

### 6.4 Navegacao por Teclado

- Todos os cards e botoes devem ser acessiveis via Tab
- `role="region"` com `aria-label` descritivo em cada secao
- Botoes de acao com `aria-describedby` referenciando o caminhao/motorista
- Secao de historico usa `aria-expanded` no trigger

---

## 7. Comportamento Responsivo

### 7.1 Mobile (< 640px)

```
Contadores: grid 3 colunas, numeros menores (text-xl)
Cards: 1 coluna, full width
  - Placa grande (text-lg)
  - Motorista abaixo
  - Botao full width na parte inferior
Historico: accordion nativo, items empilhados
```

### 7.2 Tablet (640px - 1024px)

```
Contadores: flex row, items maiores
Cards: grid 2 colunas (sm:grid-cols-2)
  - Mesmo layout do mobile mas lado a lado
Historico: lista com 2 colunas
```

### 7.3 Desktop (> 1024px)

```
Contadores: flex row, max-w-5xl
Cards: grid 3 colunas (lg:grid-cols-3)
  - Cards com mais breathing room
Historico: tabela (reutilizar padrao existente de inativos)
```

### 7.4 Touch Targets

TODOS os elementos interativos: `min-h-[48px]` e `min-w-[48px]`.
O botao "Encerrar" atual tem `min-h-[40px]` — precisa ser corrigido para `min-h-[48px]`.

---

## 8. Dados Necessarios (Backend)

### 8.1 Nova Server Action Necessaria

A pagina redesenhada precisa de dados que a `listVinculos` atual nao fornece:

```typescript
// Nova action: getDashboardVinculos
export async function getDashboardVinculos(): Promise<{
  caminhoesCamMotorista: CaminhaoComMotorista[];  // Caminhoes com vinculos ativos
  caminhoesSemMotorista: CaminhaoSemMotorista[];  // Caminhoes sem nenhum vinculo ativo
  vinculosEncerrados: VinculoListItem[];           // Historico
  contadores: {
    totalVinculados: number;
    totalSemMotorista: number;
    totalEncerrados: number;
  };
  error: string | null;
}>
```

**Novos tipos necessarios:**

```typescript
interface CaminhaoComMotorista {
  caminhao_id: string;
  caminhao_placa: string;
  caminhao_modelo: string;
  motoristas: {
    vinculo_id: string;
    motorista_nome: string;
    motorista_cpf: string;
    data_inicio: string;
    observacao: string | null;
  }[];
}

interface CaminhaoSemMotorista {
  caminhao_id: string;
  caminhao_placa: string;
  caminhao_modelo: string;
}
```

### 8.2 Query para Caminhoes sem Motorista

```sql
-- Caminhoes ativos que NAO tem vinculo ativo
SELECT c.id, c.placa, c.modelo
FROM caminhao c
WHERE c.ativo = true
  AND c.empresa_id = :empresa_id
  AND NOT EXISTS (
    SELECT 1 FROM motorista_caminhao mc
    WHERE mc.caminhao_id = c.id AND mc.ativo = true
  )
ORDER BY c.placa;
```

No Supabase, isso pode ser feito com duas queries paralelas ou usando um RPC function.

---

## 9. Notas de Implementacao

### 9.1 Componentes a Criar

| Componente | Tipo | Descricao |
|-----------|------|-----------|
| `VinculoDashboard` | Client | Container principal, substitui VinculoList |
| `VinculoCard` | Client | Card de caminhao com motorista(s) |
| `CaminhaoSemMotoristaCard` | Client | Card de alerta para caminhao sem vinculo |
| `VinculoSummaryBar` | Server | Contadores de resumo |
| `VinculoHistoricoSection` | Client | Secao colapsavel de historico |

### 9.2 Componentes a Modificar

| Componente | Mudanca |
|-----------|---------|
| `app/(dashboard)/vinculos/page.tsx` | Trocar `VinculoList` por `VinculoDashboard`, chamar nova action |
| `app/(dashboard)/vinculos/actions.ts` | Adicionar `getDashboardVinculos` action |
| `types/motorista-caminhao.ts` | Adicionar novos tipos |

### 9.3 Componentes a Descontinuar

| Componente | Motivo |
|-----------|--------|
| `app/(dashboard)/vinculos/historico/page.tsx` | Historico sera integrado na pagina principal como secao colapsavel |

### 9.4 Reutilizacao

- **VincularMotoristaInlineForm:** Reutilizar dentro do `CaminhaoSemMotoristaCard` para acao "Vincular Motorista"
- **formatDate():** Mover para `lib/utils/date.ts` se ainda nao existir (atualmente duplicada em VinculoList e MotoristaDetailPage)
- **Padrao de card com borda esquerda:** Seguir o padrao visual de `MotoristasStatusCard` e `CaminhoesStatusCard` do dashboard

### 9.5 Acessibilidade (WCAG 2.1 AA)

| Criterio | Implementacao |
|----------|--------------|
| 1.3.1 Info and Relationships | `role="region"` + `aria-label` em cada secao |
| 1.4.3 Contrast (Minimum) | Todos os textos usam tokens semanticos ja validados |
| 1.4.11 Non-text Contrast | Bordas coloridas com contraste >= 3:1 |
| 2.1.1 Keyboard | Tab navigation para todos cards e botoes |
| 2.4.6 Headings and Labels | H2 para titulo, H3 para secoes, labels descritivos |
| 2.5.5 Target Size | min-h-[48px] em todos os botoes e areas tocaveis |
| 4.1.2 Name, Role, Value | aria-expanded no historico, aria-describedby nos botoes |

### 9.6 Prioridade de Implementacao

1. **Nova server action** `getDashboardVinculos` — base de dados necessaria
2. **VinculoSummaryBar** — contadores (alto impacto visual, baixo esforco)
3. **VinculoCard** — card principal com motorista(s) e acao encerrar
4. **CaminhaoSemMotoristaCard** — card de alerta com acao vincular
5. **VinculoHistoricoSection** — secao colapsavel substituindo pagina separada
6. **VinculoDashboard** — container que orquestra tudo
7. **Integracao na page.tsx** — troca de componente

### 9.7 Regras de Linguagem (Zero Ingles)

| Termo Proibido | Usar |
|----------------|------|
| Assignment | Vinculo |
| Driver | Motorista |
| Truck | Caminhao |
| Active | Ativo |
| Inactive | Encerrado |
| Delete | Encerrar |
| History | Historico |
| Dashboard | Visao Geral |
| Link/Unlink | Vincular/Encerrar |
| Warning | Atencao |
| Confirm | Confirmar |

---

## 10. Decisoes Automaticas

[AUTO-DECISION] Remover pagina separada de historico? -> Sim, integrar como secao colapsavel (razao: evita navegacao desnecessaria, publico 55+ perde contexto ao mudar de pagina)

[AUTO-DECISION] Mostrar motoristas sem caminhao? -> Nao nesta versao (razao: a pagina e centrada em caminhoes como ativo principal da frota. Motoristas sem caminhao sao gerenciados na pagina de motoristas. Adicionar aqui aumentaria complexidade cognitiva)

[AUTO-DECISION] Usar modal para confirmacao de encerramento? -> Nao, usar confirmacao inline (razao: modais desorientam publico 55+, confirmacao inline mantém contexto visual do card)

[AUTO-DECISION] Grid vs Flexbox para cards? -> CSS Grid com `grid-cols-1 sm:grid-cols-2 lg:grid-cols-3` (razao: alinhamento consistente, gap uniforme, padrao usado no dashboard)

[AUTO-DECISION] Botao "Novo Vinculo" no header? -> Remover (razao: a acao de vincular agora esta contextualizada nos cards de "Sem Motorista". O fluxo principal de criacao ja acontece inline nas paginas de detalhe de motorista/caminhao. Botao generico no header e redundante)

[AUTO-DECISION] Botao "Historico" no header? -> Substituir por trigger de secao colapsavel inline (razao: historico agora e secao da mesma pagina)
