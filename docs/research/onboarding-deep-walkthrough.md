# Deep Walkthrough Onboarding -- Especificacao Tecnica

> **Data:** 2026-03-30
> **Autor:** Uma (UX Design Expert)
> **Status:** Especificacao para implementacao
> **Supersede:** `onboarding-tutorial-plan.md` (Fase 1 -- spotlight-only)

---

## TL;DR

Redesenho completo do onboarding para um **walkthrough guiado multi-pagina** que ensina fazendo, nao apenas mostrando. O usuario e navegado para cada pagina, ve os campos do formulario destacados, e executa a acao real (ou pula). Maquina de estados persistida em `user_metadata` controla o progresso entre paginas. Dois fluxos: DONO (7 etapas, setup completo) e MOTORISTA (4 etapas, operacao diaria).

---

## 1. Problema com a Abordagem Atual

A implementacao atual (`onboarding-steps.ts` + `OnboardingTutorial.tsx`) usa driver.js para destacar itens da sidebar numa unica pagina. Limitacoes:

| Problema | Impacto |
|----------|---------|
| So mostra sidebar items | Usuario nao aprende a USAR o sistema |
| Nao navega entre paginas | Tutorial fica abstrato, desconectado das telas reais |
| Nao ensina a preencher formularios | 55+ precisa ver o formulario, nao apenas ouvir sobre ele |
| Sem estado entre paginas | Se usuario navega, perde o tutorial |
| Sem wait-for-action | Usuario nao pratica -- apenas clica "Proximo" |

**Decisao de design:** Substituir o spotlight tour por um walkthrough multi-pagina que navega o usuario pelas telas reais e espera ele completar cada acao (ou pular).

---

## 2. Maquina de Estados

### 2.1 Modelo

```
OnboardingState {
  flow: 'dono' | 'motorista'
  currentStep: number           // 0..N (0 = welcome)
  status: 'active' | 'completed' | 'skipped'
  createdEntities: {            // IDs criados durante o tutorial
    caminhaoId?: string
    motoristaId?: string
    vinculoId?: string
    viagemId?: string
  }
  skippedSteps: number[]        // passos que o usuario pulou
  startedAt: string             // ISO timestamp
  lastStepAt: string            // ISO timestamp do ultimo avanco
}
```

### 2.2 Transicoes

```
                    [Primeiro login]
                         |
                    WELCOME (step 0)
                    /            \
              "Comecar"      "Pular tudo"
                  |               |
             step 1            status: 'skipped'
                  |            onboarding_completed: true
                  |
            [Navega para pagina do step]
                  |
         [Mostra highlight na pagina]
                  |
            /           \
      "Completar"    "Pular passo"
      (submit form)  (adiciona ao skippedSteps)
           |              |
      [Salva entity ID]   |
           \             /
            next step
                |
           [Repete ate ultimo step]
                |
         CONCLUSAO (step final)
                |
         status: 'completed'
         onboarding_completed: true
```

### 2.3 Persistencia

**Onde armazenar:** `user_metadata` no Supabase Auth (mesmo pattern ja usado por `must_change_password` e `onboarding_completed`).

| Opcao | Pros | Contras | Decisao |
|-------|------|---------|---------|
| `user_metadata` | Ja existe pattern, persiste entre devices, sem migration | Limite ~16KB (suficiente), nao queryable | **ESCOLHIDO** |
| `localStorage` | Rapido, zero latencia | Perde entre devices, nao persiste em limpar cache | Rejeitado |
| Tabela Supabase | Queryable, analytics | Precisa migration, join extra | Rejeitado (futuro analytics pode usar) |
| URL params | Sem persistencia necessaria | Perde ao recarregar, URL poluida | Rejeitado |

**Campos em user_metadata:**

```typescript
interface UserMetadataOnboarding {
  onboarding_completed: boolean        // flag final (ja existe)
  onboarding_redo: boolean             // flag para refazer (ja existe)
  onboarding_state?: OnboardingState   // estado da maquina (NOVO)
}
```

**Server actions necessarias:**

```typescript
// Atualizar estado do onboarding (avanco de step, skip, etc.)
export async function atualizarOnboardingState(
  state: Partial<OnboardingState>
): Promise<void>

// Buscar estado atual
export async function getOnboardingState(): Promise<OnboardingState | null>
```

### 2.4 Reconciliacao entre Paginas

O fluxo multi-pagina funciona assim:

1. **Layout** (`app/(dashboard)/layout.tsx`) le `onboarding_state` do `user_metadata`
2. Se `status === 'active'`, passa `currentStep` e `flow` para o `<OnboardingOrchestrator>`
3. O orchestrator determina se a pagina atual e a pagina esperada para o step corrente
4. Se SIM: mostra o highlight/tooltip relevante para esta pagina
5. Se NAO: mostra um floating banner "Continuar tutorial" que navega para a pagina correta

---

## 3. Fluxo DONO -- 7 Etapas

### Visao geral

| Step | Pagina destino | Tipo | Acao esperada |
|------|---------------|------|---------------|
| 0 | /dashboard | fullscreen-overlay | Clicar "Comecar" |
| 1 | /caminhoes/cadastro | form-guided | Preencher e salvar caminhao |
| 2 | /motoristas/cadastro | form-guided | Preencher e salvar motorista |
| 3 | /vinculos/novo | form-guided | Vincular motorista ao caminhao |
| 4 | /viagens/nova | form-guided | Criar primeira viagem |
| 5 | /bi | page-highlight | Ver KPI cards |
| 6 | /dashboard | fullscreen-overlay | Conclusao |

### Step 0: Bem-vindo (Fullscreen Overlay)

**Pagina:** `/dashboard`
**Tipo:** Fullscreen overlay (nao usa driver.js -- componente custom)

**Layout do overlay:**

```
+--------------------------------------------------+
|                                                   |
|         [Logo FrotaViva -- 64px]                  |
|                                                   |
|   "Vamos configurar sua frota                     |
|    passo a passo"                                 |
|                                                   |
|   "Sao 5 passos rapidos. Voce pode               |
|    pular qualquer um."                            |
|                                                   |
|   [Icone caminhao] Cadastrar caminhao             |
|   [Icone pessoa]   Cadastrar motorista            |
|   [Icone link]     Vincular os dois               |
|   [Icone mapa]     Criar primeira viagem          |
|   [Icone grafico]  Ver o resultado                |
|                                                   |
|   +---------------------------+                   |
|   |       COMECAR             |  <- 56px height   |
|   +---------------------------+                   |
|                                                   |
|   Pular tutorial (link discreto)                  |
|                                                   |
+--------------------------------------------------+
```

**Texto -- regras para 55+:**
- Zero ingles ("Comecar", nunca "Start")
- Zero jargao tecnico
- Frases curtas, max 2 linhas
- Fonte titulo: 24px bold
- Fonte corpo: 18px
- Botao: 56px altura, full-width em mobile

**Acao "Comecar":**
1. Salva `onboarding_state.currentStep = 1`
2. Navega para `/caminhoes/cadastro`

**Acao "Pular tutorial":**
1. Salva `status: 'skipped'`, `onboarding_completed: true`
2. Fecha overlay

### Step 1: Cadastrar Primeiro Caminhao

**Pagina:** `/caminhoes/cadastro`
**Tipo:** Form-guided (driver.js highlights sequenciais)

**Sequencia de highlights na pagina:**

| Sub-step | Selector | Tooltip | Posicao |
|----------|----------|---------|---------|
| 1a | `h2` (titulo da pagina) | "Aqui voce cadastra caminhoes. Vamos preencher o primeiro juntos." | bottom |
| 1b | `input[name="placa"]` ou `[data-onboarding="placa"]` | "Digite a placa do caminhao. Exemplo: ABC1D23" | bottom |
| 1c | `[data-onboarding="marca-modelo"]` | "Escolha a marca e modelo. Comece a digitar que aparecem as opcoes." | bottom |
| 1d | `[data-onboarding="ano"]` | "Ano de fabricacao do caminhao." | bottom |
| 1e | `[data-onboarding="tipo-cegonha"]` | "Selecione o tipo da cegonha." | bottom |
| 1f | `button[type="submit"]` | "Quando preencher tudo, clique aqui para salvar." | top |

**Comportamento:**
- driver.js destaca cada campo sequencialmente com auto-advance ao clicar "Proximo"
- O ultimo tooltip aponta para o botao de salvar e diz "Preencha e salve, ou clique em Pular Passo"
- **Wait mode:** Apos mostrar todos os tooltips, o orchestrator espera por:
  - `form submit success` -> captura o `caminhaoId` criado, avanca para step 2
  - Botao "Pular Passo" do onboarding -> avanca para step 2 sem criar

**Botao flutuante no canto inferior:**
```
+-----------------------------------+
|  [<- Voltar]  Passo 1 de 5  [Pular passo ->]  |
+-----------------------------------+
```

**Deteccao de submit:** Interceptar o callback `onSubmit` do `CaminhaoForm`. O orchestrator injeta um wrapper que, alem de chamar `createCaminhao`, tambem notifica o onboarding state machine.

### Step 2: Cadastrar Primeiro Motorista

**Pagina:** `/motoristas/cadastro`
**Tipo:** Form-guided

**Sequencia de highlights:**

| Sub-step | Selector | Tooltip |
|----------|----------|---------|
| 2a | `h2` | "Agora vamos cadastrar seu primeiro motorista." |
| 2b | `[data-onboarding="nome"]` | "Nome completo do motorista." |
| 2c | `[data-onboarding="cpf"]` | "CPF do motorista. So numeros." |
| 2d | `[data-onboarding="cnh"]` | "Numero da CNH." |
| 2e | `[data-onboarding="percentual"]` | "Percentual do frete que o motorista recebe." |
| 2f | `[data-onboarding="criar-acesso"]` | "Marque aqui para o motorista poder acessar o sistema pelo celular." |
| 2g | `button[type="submit"]` | "Salve para cadastrar o motorista." |

**Wait mode:** Espera `submit success` (captura `motoristaId`) ou "Pular Passo".

### Step 3: Vincular Motorista ao Caminhao

**Pagina:** `/vinculos/novo`
**Tipo:** Form-guided

**Condicao especial:** Se o usuario pulou step 1 OU step 2, este passo mostra uma mensagem diferente:

```
"Para vincular, voce precisa ter ao menos um caminhao e um motorista cadastrado.
 Voce pode fazer isso depois. Vamos pular para o proximo passo."
[Auto-skip apos 3 segundos com barra de progresso]
```

Se ambos existem (criados no tutorial ou pre-existentes):

| Sub-step | Selector | Tooltip |
|----------|----------|---------|
| 3a | `h2` | "Vincule o motorista ao caminhao. Assim o sistema sabe quem dirige o que." |
| 3b | `[data-onboarding="motorista-select"]` | "Escolha o motorista." |
| 3c | `[data-onboarding="caminhao-select"]` | "Escolha o caminhao." |
| 3d | `button[type="submit"]` | "Salve para criar o vinculo." |

**Pre-selecao inteligente:** Se `createdEntities.motoristaId` e `createdEntities.caminhaoId` existem, pre-selecionar automaticamente nos selects.

### Step 4: Criar Primeira Viagem

**Pagina:** `/viagens/nova`
**Tipo:** Form-guided

| Sub-step | Selector | Tooltip |
|----------|----------|---------|
| 4a | `h2` | "Crie sua primeira viagem. Origem, destino e valor do frete." |
| 4b | `[data-onboarding="origem"]` | "De onde o caminhao sai. Comece a digitar a cidade." |
| 4c | `[data-onboarding="destino"]` | "Para onde vai. Comece a digitar." |
| 4d | `[data-onboarding="motorista"]` | "Qual motorista faz essa viagem." |
| 4e | `[data-onboarding="valor-frete"]` | "Valor total do frete combinado." |
| 4f | `button[type="submit"]` | "Salve para criar a viagem." |

### Step 5: Ver Resultado

**Pagina:** `/bi`
**Tipo:** Page-highlight (read-only, sem form)

| Sub-step | Selector | Tooltip |
|----------|----------|---------|
| 5a | `[data-onboarding="bi-kpis"]` | "Esses numeros mostram o resultado real da sua frota. Receita, gastos e margem." |
| 5b | `[data-onboarding="bi-motoristas"]` | "Veja o desempenho de cada motorista." |
| 5c | `[data-onboarding="bi-tendencia"]` | "Aqui voce acompanha a evolucao mes a mes." |

**Nota:** Se nao ha dados (usuario acabou de comecar), os KPIs mostrarao zeros. O tooltip reconhece isso:
"Ainda nao tem dados suficientes. Conforme suas viagens forem registradas, esses numeros vao sendo preenchidos."

### Step 6: Conclusao (Fullscreen Overlay)

**Pagina:** `/dashboard`
**Tipo:** Fullscreen overlay

**Layout:**

```
+--------------------------------------------------+
|                                                   |
|         [Icone confete / check verde]             |
|                                                   |
|   "Parabens! Sua frota esta                       |
|    configurada."                                  |
|                                                   |
|   [check] Caminhao cadastrado                     |
|   [check] Motorista cadastrado                    |
|   [check] Vinculo criado                          |
|   [check] Viagem registrada                       |
|   (itens pulados mostram [skip] em cinza)         |
|                                                   |
|   "Voce pode refazer o tutorial                   |
|    a qualquer momento em Meu Perfil."             |
|                                                   |
|   +---------------------------+                   |
|   |    COMECAR A USAR         |                   |
|   +---------------------------+                   |
|                                                   |
+--------------------------------------------------+
```

**Acao "Comecar a Usar":**
1. Salva `status: 'completed'`, `onboarding_completed: true`
2. Fecha overlay

---

## 4. Fluxo MOTORISTA -- 4 Etapas

### Visao geral

| Step | Pagina destino | Tipo | Acao esperada |
|------|---------------|------|---------------|
| 0 | /dashboard | fullscreen-overlay | Clicar "Comecar" |
| 1 | /viagens | page-highlight | Ver lista de viagens |
| 2 | /viagens/[id] | page-highlight | Ver detalhes de viagem ativa |
| 3 | /dashboard | fullscreen-overlay | Conclusao |

### Step 0: Bem-vindo

**Pagina:** `/dashboard`

```
+--------------------------------------------------+
|                                                   |
|   "Veja como usar o FrotaViva                     |
|    no dia a dia"                                  |
|                                                   |
|   "Seu patrao ja configurou a frota.              |
|    Voce so precisa registrar viagens,             |
|    abastecimentos e despesas."                    |
|                                                   |
|   +---------------------------+                   |
|   |       COMECAR             |                   |
|   +---------------------------+                   |
|                                                   |
|   Pular tutorial                                  |
|                                                   |
+--------------------------------------------------+
```

### Step 1: Ver Viagens

**Pagina:** `/viagens`
**Tipo:** Page-highlight

| Sub-step | Selector | Tooltip |
|----------|----------|---------|
| 1a | `[data-onboarding="viagens-lista"]` | "Aqui aparecem todas as suas viagens. As que estao em andamento ficam no topo." |
| 1b | `[data-onboarding="viagem-status"]` (primeira viagem, se existir) | "O status mostra se a viagem esta em andamento ou finalizada." |

Se nao tem viagens: tooltip unico
"Voce ainda nao tem viagens. Quando seu patrao criar uma, ela aparece aqui."
[Auto-avanca para step 2]

### Step 2: Detalhes da Viagem

**Pagina:** `/viagens/[id]` (viagem ativa mais recente, se existir)
**Tipo:** Page-highlight

| Sub-step | Selector | Tooltip |
|----------|----------|---------|
| 2a | `[data-onboarding="viagem-info"]` | "Aqui voce ve tudo sobre a viagem: origem, destino, km." |
| 2b | `[data-onboarding="btn-abastecimento"]` | "Toda vez que abastecer, registre aqui. Valor, litros e km do painel." |
| 2c | `[data-onboarding="btn-despesa"]` | "Pedagio, borracheiro, alimentacao -- registre todos os gastos da viagem." |

Se nao tem viagem ativa: pular step (auto-advance com mensagem "Quando tiver uma viagem ativa, voce encontra esses botoes na ficha da viagem.").

### Step 3: Conclusao

**Pagina:** `/dashboard`

```
+--------------------------------------------------+
|                                                   |
|   "Pronto! Bom trabalho na estrada."              |
|                                                   |
|   "Lembre: registre abastecimentos e              |
|    despesas durante cada viagem.                   |
|    Assim o acerto sai certinho."                  |
|                                                   |
|   "Pode refazer o tutorial em                     |
|    Meu Perfil."                                   |
|                                                   |
|   +---------------------------+                   |
|   |    COMECAR A USAR         |                   |
|   +---------------------------+                   |
|                                                   |
+--------------------------------------------------+
```

---

## 5. Logica de Skip e Resume

### 5.1 Skip Individual (Pular Passo)

Cada step do tipo `form-guided` tem um botao "Pular Passo" no floating bar inferior.

**Ao pular:**
1. Adiciona `currentStep` ao array `skippedSteps`
2. Avanca `currentStep` para o proximo
3. Navega para a pagina do proximo step
4. Se o proximo step depende de dados do step pulado (ex: step 3 precisa de motorista/caminhao), detecta e trata conforme descrito em cada step

### 5.2 Skip Total (Pular Tutorial)

Disponivel em:
- Step 0 (Welcome): link "Pular tutorial"
- Qualquer step: botao "Pular tudo" no floating bar

**Ao pular tudo:**
1. Salva `status: 'skipped'`, `onboarding_completed: true`
2. Navega para `/dashboard`
3. Nao mostra tela de conclusao

### 5.3 Resume (Retomar Tutorial)

**Cenario:** Usuario esta no step 3, fecha o navegador, volta depois.

**Comportamento:**
1. Layout le `onboarding_state` do `user_metadata`
2. Se `status === 'active'` e `currentStep > 0`:
   - Mostra floating banner no topo: "Voce tem um tutorial em andamento. [Continuar] [Cancelar]"
   - "Continuar" navega para a pagina do `currentStep`
   - "Cancelar" marca como `skipped`

**Cenario:** Usuario navega manualmente para outra pagina durante o tutorial.

**Comportamento:**
- O floating banner aparece (mesmo comportamento de resume)
- O onboarding NAO bloqueia navegacao -- usuario sempre pode usar o sistema normalmente

### 5.4 Redo (Refazer Tutorial)

**Pagina:** `/perfil`
**Componente existente:** `RefazerTutorialButton`

**Mudanca necessaria:**
- Alem de setar `onboarding_redo: true`, resetar `onboarding_state` para:
  ```json
  {
    "flow": "{role}",
    "currentStep": 0,
    "status": "active",
    "createdEntities": {},
    "skippedSteps": [],
    "startedAt": "2026-03-30T..."
  }
  ```
- Redirecionar para `/dashboard` (onde o Welcome overlay aparece)

---

## 6. Arquitetura de Componentes

### 6.1 Arvore de componentes

```
app/(dashboard)/layout.tsx
  |
  +-- <OnboardingOrchestrator>         # NOVO -- client component
        |
        +-- <OnboardingWelcomeOverlay>  # NOVO -- step 0 e step final
        |
        +-- <OnboardingFloatingBar>     # NOVO -- barra inferior com progresso
        |
        +-- <OnboardingPageHighlight>   # NOVO -- wrapper de driver.js por pagina
        |
        +-- <OnboardingResumeBanner>    # NOVO -- banner "Continuar tutorial"
```

### 6.2 Descricao dos componentes

#### `OnboardingOrchestrator` (client component)

**Responsabilidades:**
- Le o `onboardingState` passado como prop pelo layout (server-side)
- Determina qual componente renderizar baseado no `currentStep`
- Gerencia transicoes entre steps (chama server actions para persistir)
- Escuta eventos de "form submitted" via custom events no DOM
- Controla navegacao via `router.push()`

**Props:**
```typescript
interface OnboardingOrchestratorProps {
  initialState: OnboardingState | null
  role: 'dono' | 'motorista'
  currentPath: string // pathname atual para saber se estamos na pagina certa
}
```

**Custom Event para deteccao de form submit:**
```typescript
// Disparado pelos forms ao completar com sucesso
window.dispatchEvent(new CustomEvent('onboarding:entity-created', {
  detail: { type: 'caminhao', id: '123' }
}));
```

Os form components existentes (`CaminhaoForm`, `MotoristaForm`, `VinculoForm`, `ViagemForm`) precisam disparar esse evento apos submit bem-sucedido, **somente quando onboarding esta ativo**.

#### `OnboardingWelcomeOverlay` (client component)

**Responsabilidades:**
- Renderiza overlay fullscreen para steps Welcome e Conclusao
- Animacao fade-in (400ms)
- Acessivel: `role="dialog"`, `aria-modal="true"`, focus trap

**Props:**
```typescript
interface OnboardingWelcomeOverlayProps {
  type: 'welcome' | 'conclusion'
  flow: 'dono' | 'motorista'
  skippedSteps?: number[]
  createdEntities?: OnboardingState['createdEntities']
  onStart: () => void
  onSkip: () => void
}
```

#### `OnboardingFloatingBar` (client component)

**Responsabilidades:**
- Barra fixa no bottom da tela durante steps ativos (nao Welcome/Conclusao)
- Mostra: "Passo X de Y" + botao "Pular Passo" + botao "Pular Tudo"
- Z-index acima do conteudo, abaixo do driver.js overlay

**Layout:**
```
+----------------------------------------------------------+
| [<- Anterior]   Passo 2 de 5   [Pular Passo ->] [X]     |
+----------------------------------------------------------+
```

- Altura: 64px (desktop), 72px (mobile -- alvos maiores)
- Fonte: 16px
- Botoes: min 48px touch target
- `position: fixed; bottom: 0; left: 0; right: 0; z-index: 999;`

#### `OnboardingPageHighlight` (client component)

**Responsabilidades:**
- Wrapper que inicializa driver.js para os sub-steps da pagina atual
- Recebe array de `DriveStep[]` para a pagina corrente
- Ao completar todos os sub-steps, mostra o "wait mode" (espera form submit ou skip)

**Props:**
```typescript
interface OnboardingPageHighlightProps {
  steps: DriveStep[]
  onComplete: () => void   // todos sub-steps vistos
  onSkip: () => void       // usuario pulou
}
```

#### `OnboardingResumeBanner` (client component)

**Responsabilidades:**
- Banner no topo da pagina quando usuario esta fora da pagina esperada
- "Voce tem um tutorial em andamento. [Continuar] [Cancelar]"
- Dismissable, mas reaparece ao trocar de pagina

### 6.3 Estrutura de arquivos

```
components/
  onboarding/
    OnboardingOrchestrator.tsx        # NOVO
    OnboardingWelcomeOverlay.tsx       # NOVO
    OnboardingFloatingBar.tsx          # NOVO
    OnboardingPageHighlight.tsx        # NOVO
    OnboardingResumeBanner.tsx         # NOVO
    onboarding-steps.ts               # REFATORAR (steps por pagina)
    onboarding-flow-config.ts         # NOVO (definicao dos fluxos)
    onboarding.css                    # REFATORAR (estilos ampliados)
    OnboardingTutorial.tsx            # DEPRECAR (substituido pelo Orchestrator)
    RefazerTutorialButton.tsx         # ATUALIZAR (resetar state completo)

app/(dashboard)/
  onboarding/
    actions.ts                         # ATUALIZAR (novas server actions)
```

### 6.4 Configuracao de fluxos

```typescript
// onboarding-flow-config.ts

export interface OnboardingFlowStep {
  id: number
  type: 'fullscreen-overlay' | 'form-guided' | 'page-highlight'
  targetPath: string
  title: string
  description: string
  subSteps?: {
    selector: string
    tooltip: string
    position: 'top' | 'bottom' | 'left' | 'right'
  }[]
  entityType?: 'caminhao' | 'motorista' | 'vinculo' | 'viagem'
  dependsOn?: ('caminhao' | 'motorista')[]
  skipCondition?: string // ex: 'no-active-trip'
}

export const DONO_FLOW: OnboardingFlowStep[] = [
  {
    id: 0,
    type: 'fullscreen-overlay',
    targetPath: '/dashboard',
    title: 'Vamos configurar sua frota passo a passo',
    description: 'Sao 5 passos rapidos. Voce pode pular qualquer um.',
  },
  {
    id: 1,
    type: 'form-guided',
    targetPath: '/caminhoes/cadastro',
    title: 'Cadastrar primeiro caminhao',
    description: 'Preencha os dados do seu primeiro caminhao.',
    entityType: 'caminhao',
    subSteps: [
      { selector: '[data-onboarding="placa"]', tooltip: 'Digite a placa. Exemplo: ABC1D23', position: 'bottom' },
      { selector: '[data-onboarding="marca-modelo"]', tooltip: 'Escolha marca e modelo. Comece a digitar.', position: 'bottom' },
      { selector: '[data-onboarding="ano"]', tooltip: 'Ano de fabricacao.', position: 'bottom' },
      { selector: '[data-onboarding="tipo-cegonha"]', tooltip: 'Tipo da cegonha.', position: 'bottom' },
      { selector: 'button[type="submit"]', tooltip: 'Preencha e clique aqui para salvar.', position: 'top' },
    ],
  },
  {
    id: 2,
    type: 'form-guided',
    targetPath: '/motoristas/cadastro',
    title: 'Cadastrar primeiro motorista',
    description: 'Cadastre o motorista que trabalha com voce.',
    entityType: 'motorista',
    subSteps: [
      { selector: '[data-onboarding="nome"]', tooltip: 'Nome completo do motorista.', position: 'bottom' },
      { selector: '[data-onboarding="cpf"]', tooltip: 'CPF. So numeros.', position: 'bottom' },
      { selector: '[data-onboarding="cnh"]', tooltip: 'Numero da CNH.', position: 'bottom' },
      { selector: '[data-onboarding="percentual"]', tooltip: 'Percentual do frete que ele recebe.', position: 'bottom' },
      { selector: '[data-onboarding="criar-acesso"]', tooltip: 'Marque para ele acessar pelo celular.', position: 'bottom' },
      { selector: 'button[type="submit"]', tooltip: 'Salve para cadastrar.', position: 'top' },
    ],
  },
  {
    id: 3,
    type: 'form-guided',
    targetPath: '/vinculos/novo',
    title: 'Vincular motorista ao caminhao',
    description: 'Diga qual motorista dirige qual caminhao.',
    entityType: 'vinculo',
    dependsOn: ['caminhao', 'motorista'],
    subSteps: [
      { selector: '[data-onboarding="motorista-select"]', tooltip: 'Escolha o motorista.', position: 'bottom' },
      { selector: '[data-onboarding="caminhao-select"]', tooltip: 'Escolha o caminhao.', position: 'bottom' },
      { selector: 'button[type="submit"]', tooltip: 'Salve para criar o vinculo.', position: 'top' },
    ],
  },
  {
    id: 4,
    type: 'form-guided',
    targetPath: '/viagens/nova',
    title: 'Criar primeira viagem',
    description: 'Registre a primeira viagem da sua frota.',
    entityType: 'viagem',
    subSteps: [
      { selector: '[data-onboarding="origem"]', tooltip: 'De onde sai. Comece a digitar a cidade.', position: 'bottom' },
      { selector: '[data-onboarding="destino"]', tooltip: 'Para onde vai.', position: 'bottom' },
      { selector: '[data-onboarding="motorista"]', tooltip: 'Qual motorista faz essa viagem.', position: 'bottom' },
      { selector: '[data-onboarding="valor-frete"]', tooltip: 'Valor total do frete.', position: 'bottom' },
      { selector: 'button[type="submit"]', tooltip: 'Salve para criar a viagem.', position: 'top' },
    ],
  },
  {
    id: 5,
    type: 'page-highlight',
    targetPath: '/bi',
    title: 'Acompanhe seus resultados',
    description: 'Aqui voce ve o resumo de tudo.',
    subSteps: [
      { selector: '[data-onboarding="bi-kpis"]', tooltip: 'Receita, gastos e margem da frota. Conforme voce registra viagens, os numeros vao aparecendo.', position: 'bottom' },
      { selector: '[data-onboarding="bi-motoristas"]', tooltip: 'Desempenho de cada motorista.', position: 'bottom' },
      { selector: '[data-onboarding="bi-tendencia"]', tooltip: 'Evolucao mes a mes.', position: 'bottom' },
    ],
  },
  {
    id: 6,
    type: 'fullscreen-overlay',
    targetPath: '/dashboard',
    title: 'Parabens! Sua frota esta configurada.',
    description: 'Voce pode refazer o tutorial a qualquer momento em Meu Perfil.',
  },
];

export const MOTORISTA_FLOW: OnboardingFlowStep[] = [
  {
    id: 0,
    type: 'fullscreen-overlay',
    targetPath: '/dashboard',
    title: 'Veja como usar o FrotaViva no dia a dia',
    description: 'Seu patrao ja configurou a frota. Voce so precisa registrar viagens e gastos.',
  },
  {
    id: 1,
    type: 'page-highlight',
    targetPath: '/viagens',
    title: 'Suas viagens',
    description: 'Aqui aparecem todas as suas viagens.',
    subSteps: [
      { selector: '[data-onboarding="viagens-lista"]', tooltip: 'Viagens em andamento ficam no topo.', position: 'bottom' },
      { selector: '[data-onboarding="viagem-status"]', tooltip: 'O status mostra se esta em andamento ou finalizada.', position: 'bottom' },
    ],
  },
  {
    id: 2,
    type: 'page-highlight',
    targetPath: '/viagens', // dinamico: /viagens/[id] se existir viagem ativa
    title: 'Registre gastos na viagem',
    description: 'Abastecimentos, pedagios, tudo aqui.',
    skipCondition: 'no-active-trip',
    subSteps: [
      { selector: '[data-onboarding="viagem-info"]', tooltip: 'Origem, destino e km da viagem.', position: 'bottom' },
      { selector: '[data-onboarding="btn-abastecimento"]', tooltip: 'Registre cada abastecimento: valor, litros, km.', position: 'bottom' },
      { selector: '[data-onboarding="btn-despesa"]', tooltip: 'Pedagio, borracheiro, comida -- registre tudo.', position: 'bottom' },
    ],
  },
  {
    id: 3,
    type: 'fullscreen-overlay',
    targetPath: '/dashboard',
    title: 'Pronto! Bom trabalho na estrada.',
    description: 'Registre abastecimentos e despesas durante cada viagem. Pode refazer o tutorial em Meu Perfil.',
  },
];
```

---

## 7. Abordagem Tecnica Detalhada

### 7.1 Integracao com o Layout

**Mudanca em `app/(dashboard)/layout.tsx`:**

```typescript
// Substituir a renderizacao condicional atual:
// {showOnboarding && <OnboardingTutorial role={onboardingRole} />}

// Por:
{showOnboarding && (
  <OnboardingOrchestrator
    initialState={onboardingState}
    role={onboardingRole}
    currentPath={/* pathname */}
  />
)}
```

**Problema:** O layout e server component e nao tem acesso ao pathname diretamente. Solucao: o `OnboardingOrchestrator` e client component e usa `usePathname()` do Next.js.

### 7.2 Comunicacao entre Forms e Onboarding

**Abordagem: Custom DOM Events**

Os form components existentes disparam um `CustomEvent` apos submit bem-sucedido:

```typescript
// Em CaminhaoForm.tsx, apos onSubmit com success:
if (typeof window !== 'undefined') {
  window.dispatchEvent(new CustomEvent('onboarding:entity-created', {
    detail: { type: 'caminhao', id: result.data.id }
  }));
}
```

O `OnboardingOrchestrator` escuta esses eventos:

```typescript
useEffect(() => {
  function handleEntityCreated(e: CustomEvent) {
    const { type, id } = e.detail;
    // Atualizar createdEntities no state
    // Avancar para proximo step
  }
  window.addEventListener('onboarding:entity-created', handleEntityCreated);
  return () => window.removeEventListener('onboarding:entity-created', handleEntityCreated);
}, []);
```

**Vantagem:** Zero acoplamento entre forms e onboarding. Os forms funcionam normalmente sem onboarding. O evento so e emitido se o form submitou com sucesso, e so e escutado se o onboarding esta ativo.

### 7.3 Navegacao Programatica

O `OnboardingOrchestrator` usa `router.push()` para navegar entre steps:

```typescript
function advanceToStep(nextStep: number) {
  const flow = role === 'dono' ? DONO_FLOW : MOTORISTA_FLOW;
  const step = flow[nextStep];
  if (!step) return;

  // Persistir estado primeiro
  atualizarOnboardingState({ currentStep: nextStep, lastStepAt: new Date().toISOString() });

  // Navegar
  router.push(step.targetPath);
}
```

### 7.4 driver.js por Pagina (Nao Global)

A instancia de driver.js e criada POR PAGINA pelo `OnboardingPageHighlight`, nao globalmente. Cada vez que o usuario chega numa pagina de step, uma nova instancia e criada com os sub-steps daquela pagina.

**Fluxo:**
1. Pagina carrega
2. `OnboardingOrchestrator` detecta que `currentPath === step.targetPath`
3. Renderiza `<OnboardingPageHighlight steps={step.subSteps} />`
4. `OnboardingPageHighlight` cria instancia driver.js e roda os sub-steps
5. Ao terminar sub-steps, o highlight "fica" no botao submit (wait mode)
6. Ao detectar entity-created event, avanca para proximo step

### 7.5 Tratamento Mobile

**Sidebar nao existe em mobile.** O walkthrough multi-pagina RESOLVE esse problema: ao inves de tentar abrir o hamburger e destacar links, o onboarding simplesmente navega direto para a pagina via `router.push()`. Sem necessidade de abrir drawer.

**Ajustes mobile:**
- Overlays fullscreen usam `100dvh` (dynamic viewport height)
- Floating bar: 72px altura (touch targets maiores)
- Tooltips: posicao `bottom` sempre, max-width `calc(100vw - 32px)`
- Botoes: `width: 100%` em telas < 640px

### 7.6 data-onboarding Attributes

Os form components precisam receber `data-onboarding` attributes nos campos relevantes. Isso requer mudancas pontuais em:

| Componente | Campos a marcar |
|-----------|----------------|
| `CaminhaoForm` | placa, marca-modelo, ano, tipo-cegonha |
| `MotoristaForm` | nome, cpf, cnh, percentual, criar-acesso |
| `VinculoForm` | motorista-select, caminhao-select |
| `ViagemForm` | origem, destino, motorista, valor-frete |
| `BiKpiCards` | bi-kpis |
| `BiMargemMotoristas` | bi-motoristas |
| `BiTendenciaMensal` | bi-tendencia |

**Impacto:** Adicionar `data-onboarding="X"` e uma mudanca de 1 linha por campo, sem efeito funcional.

### 7.7 Server Actions Atualizadas

```typescript
// app/(dashboard)/onboarding/actions.ts

'use server';

import { createClient } from '@/lib/supabase/server';
import type { OnboardingState } from '@/types/onboarding';

export async function completarOnboarding(): Promise<void> {
  const supabase = await createClient();
  await supabase.auth.updateUser({
    data: {
      onboarding_completed: true,
      onboarding_redo: false,
      onboarding_state: null, // limpar state
    },
  });
}

export async function atualizarOnboardingState(
  partial: Partial<OnboardingState>
): Promise<void> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const currentState = user?.user_metadata?.onboarding_state ?? {};
  await supabase.auth.updateUser({
    data: {
      onboarding_state: { ...currentState, ...partial, lastStepAt: new Date().toISOString() },
    },
  });
}

export async function iniciarOnboarding(
  flow: 'dono' | 'motorista'
): Promise<void> {
  const supabase = await createClient();
  const now = new Date().toISOString();
  await supabase.auth.updateUser({
    data: {
      onboarding_state: {
        flow,
        currentStep: 0,
        status: 'active',
        createdEntities: {},
        skippedSteps: [],
        startedAt: now,
        lastStepAt: now,
      },
    },
  });
}

export async function resetarOnboarding(): Promise<void> {
  const supabase = await createClient();
  await supabase.auth.updateUser({
    data: {
      onboarding_completed: false,
      onboarding_redo: true,
      onboarding_state: null,
    },
  });
}
```

---

## 8. Acessibilidade (WCAG 2.1 AA)

### 8.1 Requisitos

| Requisito | Implementacao |
|-----------|---------------|
| Focus trap em overlays | `role="dialog"`, `aria-modal="true"`, focus trap com `focus-trap` lib ou manual |
| Keyboard navigation | Todos os botoes focaveis, Enter/Space para ativar, Escape para fechar overlay |
| Screen reader | `aria-live="polite"` em mudancas de step, `aria-label` em todos os botoes |
| Contraste | Overlay escuro 60% com texto branco: ratio >= 4.5:1 |
| Reducao de movimento | `prefers-reduced-motion: reduce` desabilita animacoes |
| Touch targets | Min 48x48px em todos os elementos interativos (ja padrao do projeto) |
| Font size | Min 16px corpo, 20px titulos (respeita zoom do navegador) |

### 8.2 Escape Hatches

- **Escape key:** Fecha overlay ou skipa step atual
- **Click fora do overlay:** Nao fecha (previne cliques acidentais para 55+)
- **Tab navigation:** Funciona normalmente dentro de overlays e tooltips

---

## 9. CSS -- Estilos do Walkthrough

```css
/* onboarding.css -- deep walkthrough styles */

/* ---- Fullscreen Overlays ---- */
.onboarding-overlay {
  position: fixed;
  inset: 0;
  z-index: 10000;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(0, 0, 0, 0.75);
  animation: onboarding-fade-in 400ms ease-out;
}

.onboarding-overlay-card {
  background: var(--color-surface-card, #fff);
  color: var(--color-text-primary, #1a1a2e);
  border-radius: 16px;
  padding: 40px 32px;
  max-width: 480px;
  width: calc(100% - 32px);
  text-align: center;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
}

.onboarding-overlay-title {
  font-size: 24px;
  font-weight: 800;
  line-height: 1.3;
  margin-bottom: 12px;
}

.onboarding-overlay-desc {
  font-size: 18px;
  line-height: 1.6;
  margin-bottom: 24px;
  color: var(--color-text-secondary, #555);
}

.onboarding-overlay-steps-list {
  list-style: none;
  padding: 0;
  margin: 0 0 32px;
  text-align: left;
}

.onboarding-overlay-steps-list li {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 10px 0;
  font-size: 16px;
  border-bottom: 1px solid var(--color-surface-border, #e5e7eb);
}

.onboarding-btn-primary {
  display: block;
  width: 100%;
  min-height: 56px;
  font-size: 18px;
  font-weight: 700;
  border: none;
  border-radius: 12px;
  cursor: pointer;
  background: var(--color-primary-600, #2563eb);
  color: #fff;
  transition: background 200ms;
}

.onboarding-btn-primary:hover {
  background: var(--color-primary-700, #1d4ed8);
}

.onboarding-btn-primary:focus-visible {
  outline: 3px solid var(--color-primary-400, #60a5fa);
  outline-offset: 2px;
}

.onboarding-skip-link {
  display: block;
  margin-top: 16px;
  font-size: 14px;
  color: var(--color-text-tertiary, #888);
  cursor: pointer;
  background: none;
  border: none;
  text-decoration: underline;
}

/* ---- Floating Bar ---- */
.onboarding-floating-bar {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  z-index: 9999;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 20px;
  background: var(--color-surface-card, #fff);
  border-top: 2px solid var(--color-primary-500, #3b82f6);
  box-shadow: 0 -4px 12px rgba(0, 0, 0, 0.1);
  min-height: 64px;
}

.onboarding-floating-bar-progress {
  font-size: 16px;
  font-weight: 600;
  color: var(--color-text-primary, #1a1a2e);
}

.onboarding-floating-bar button {
  min-height: 48px;
  min-width: 120px;
  font-size: 16px;
  font-weight: 600;
  border-radius: 8px;
  cursor: pointer;
}

/* ---- Resume Banner ---- */
.onboarding-resume-banner {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  z-index: 9998;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 16px;
  padding: 12px 20px;
  background: var(--color-primary-50, #eff6ff);
  border-bottom: 2px solid var(--color-primary-500, #3b82f6);
  font-size: 16px;
}

/* ---- Animations ---- */
@keyframes onboarding-fade-in {
  from { opacity: 0; }
  to { opacity: 1; }
}

/* ---- driver.js overrides ---- */
.frotaviva-onboarding.driver-popover {
  font-family: inherit;
  font-size: 16px;
  line-height: 1.6;
  max-width: 380px;
  border-radius: 12px;
  padding: 20px 24px;
}

.frotaviva-onboarding .driver-popover-title {
  font-size: 20px;
  font-weight: 700;
  margin-bottom: 8px;
}

.frotaviva-onboarding .driver-popover-description {
  font-size: 16px;
  color: var(--color-text-secondary);
}

.frotaviva-onboarding .driver-popover-footer button {
  min-height: 48px;
  min-width: 100px;
  font-size: 16px;
  font-weight: 600;
  border-radius: 8px;
}

.frotaviva-onboarding .driver-popover-progress-text {
  font-size: 14px;
}

/* ---- Dark mode ---- */
[data-theme="dark"] .onboarding-overlay {
  background: rgba(0, 0, 0, 0.85);
}

[data-theme="dark"] .onboarding-overlay-card {
  background: var(--color-surface-card);
  color: var(--color-text-primary);
}

[data-theme="dark"] .frotaviva-onboarding.driver-popover {
  background: var(--color-surface-card);
  color: var(--color-text-primary);
  border: 1px solid var(--color-surface-border);
}

/* ---- Reduced motion ---- */
@media (prefers-reduced-motion: reduce) {
  .onboarding-overlay {
    animation: none;
  }
  .frotaviva-onboarding.driver-popover {
    transition: none !important;
  }
}

/* ---- Mobile ---- */
@media (max-width: 640px) {
  .onboarding-overlay-card {
    padding: 32px 20px;
  }

  .onboarding-floating-bar {
    min-height: 72px;
    padding: 12px 16px;
    flex-wrap: wrap;
    gap: 8px;
  }

  .onboarding-floating-bar button {
    width: 100%;
  }

  .frotaviva-onboarding.driver-popover {
    max-width: calc(100vw - 32px);
    margin: 0 16px;
  }

  .frotaviva-onboarding .driver-popover-footer button {
    width: 100%;
  }
}
```

---

## 10. Estimativa de Esforco Revisada

| Story | Descricao | Pontos |
|-------|-----------|--------|
| **S1: State machine + Orchestrator** | OnboardingOrchestrator, server actions, onboarding state model, flow config, type definitions | 5 |
| **S2: Welcome/Conclusion overlays** | OnboardingWelcomeOverlay (welcome + conclusion modes), CSS, a11y (focus trap, aria) | 3 |
| **S3: Floating bar + Resume banner** | OnboardingFloatingBar, OnboardingResumeBanner, CSS | 3 |
| **S4: Form integration + data attributes** | data-onboarding attrs em 4 forms + 3 BI components, CustomEvent dispatch, OnboardingPageHighlight | 5 |
| **S5: Fluxo DONO completo** | 7 steps end-to-end, pre-selecao inteligente no step 3, smart skip | 5 |
| **S6: Fluxo MOTORISTA completo** | 4 steps end-to-end, viagem ativa detection, mobile-first | 3 |
| **S7: Refazer tutorial + testes** | Atualizar RefazerTutorialButton, testar ambos fluxos em desktop e mobile, deprecar OnboardingTutorial.tsx | 3 |

**Total:** 27 story points (vs. 18 da abordagem anterior)

**Justificativa do aumento:** O walkthrough multi-pagina e significativamente mais complexo que um spotlight tour single-page. A maquina de estados, persistencia, comunicacao via events, e o tratamento de dependencias entre steps (ex: vinculo depende de caminhao + motorista) adicionam complexidade real. O retorno e proporcional: usuarios aprendem fazendo, nao apenas vendo.

---

## 11. Riscos e Mitigacoes

| Risco | Probabilidade | Impacto | Mitigacao |
|-------|--------------|---------|-----------|
| driver.js nao encontra selector (elemento nao renderizou) | Media | Step falha silenciosamente | Retry com `MutationObserver` por 3s antes de skip automatico |
| Usuario navega rapido demais (router.push + hydration) | Media | Tooltip aparece antes do conteudo | `requestAnimationFrame` + delay 800ms antes de iniciar driver.js |
| user_metadata atinge limite de tamanho | Baixa | onboarding_state e ~500 bytes, bem abaixo de 16KB |
| Form muda (campo adicionado/removido) | Media | Selector nao encontra campo | Selectors via `data-onboarding` (estavel) em vez de `name`/`id` |
| Conflito z-index com modais existentes | Baixa | Overlay coberto por modal | z-index hierarquia: overlay 10000, driver.js 10001, floating bar 9999 |

---

## 12. Metricas de Sucesso (Atualizadas)

| Metrica | Baseline | Meta com deep walkthrough |
|---------|----------|--------------------------|
| Usuarios que cadastram 1+ caminhao em 24h | ~20% (estimado) | > 70% |
| Usuarios que completam o tutorial inteiro | ~50% (spotlight) | > 60% |
| Passo com maior abandono | Desconhecido | Identificar e otimizar |
| Chamados de suporte "como usar" | Baseline | -50% |
| Tempo medio ate primeira viagem criada | Desconhecido | < 15 min apos primeiro login |

---

## 13. Decisoes de Design Autonomas

[AUTO-DECISION] "Usar localStorage ou user_metadata para estado?" -> user_metadata (reason: persiste entre devices, pattern ja existente no projeto, motorista pode acessar de celulares diferentes)

[AUTO-DECISION] "Comunicacao forms-onboarding via props ou events?" -> CustomEvents no DOM (reason: zero acoplamento, forms funcionam independente do onboarding, facil de remover no futuro)

[AUTO-DECISION] "driver.js global ou por pagina?" -> Por pagina (reason: instancia global nao sobrevive a navegacao entre paginas no Next.js com App Router)

[AUTO-DECISION] "Bloquear navegacao durante tutorial?" -> Nao bloquear (reason: 55+ pode se sentir preso, frustrar. O resume banner e suficiente para reconectar)

[AUTO-DECISION] "Auto-advance para steps com dados vazios?" -> Sim, com mensagem e delay de 3s (reason: nao faz sentido mostrar BI vazio sem explicacao, ou vinculos sem caminhao/motorista)
