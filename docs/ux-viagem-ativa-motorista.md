# UX: Acesso Rapido a Viagem Ativa do Motorista

**Autora:** Uma (UX Design Expert)
**Data:** 2026-03-29
**Status:** Recomendacao Final

---

## 1. Problema

O motorista cegonheiro (40-60 anos, baixa familiaridade digital, usando celular na estrada) precisa acessar sua viagem ativa para registrar gastos, abastecimentos ou conferir detalhes da rota. O fluxo atual exige:

1. Abrir menu (mobile) ou clicar "Viagens" no sidebar
2. Encontrar a viagem com status "Em Andamento" na lista (que mistura todas as viagens)
3. Clicar para abrir

**Friccao medida:** 3 taps/cliques minimos, leitura de lista, identificacao visual do status. Para um motorista parado num posto de combustivel, isso e lento demais.

---

## 2. Contexto Tecnico Atual

### Dashboard (`/dashboard`)
- Mostra 3 summary cards: Viagens (contagem em_andamento), Gastos (total mes), Fechamentos
- O `ViagemSummaryCard` mostra apenas o **numero** de viagens em andamento (ex: "2")
- Nao ha link direto para a viagem ativa
- Ja existe `getViagensEmAndamento()` no actions.ts (retorna count)

### Listagem (`/viagens`)
- Lista todas as viagens sem separacao por status
- Tem filtros mas nenhum pre-aplicado
- Cards mobile sao genericos, sem destaque para viagem ativa

### Detalhe (`/viagens/[id]`)
- Pagina completa com acoes contextuais (Registrar Despesa, Abastecimento)
- Botoes de acao so aparecem quando `status === 'em_andamento'`

### Sidebar/Layout
- Links textuais sem icones: Inicio, Empresa, Viagens, Gastos, etc.
- Mobile usa drawer (hamburger)

---

## 3. Avaliacao das Opcoes

### Criterios de Avaliacao
| Criterio | Descricao |
|----------|-----------|
| Facilidade 60+ | Quao intuitivo e para publico com baixa familiaridade digital |
| Velocidade | Quantos taps/cliques ate chegar na viagem ativa |
| Complexidade | Esforco de implementacao (1=trivial, 5=complexo) |
| Mobile-first | Quao bem funciona em tela 360px com dedo gordo |

---

### Opcao A: Card de Viagem Ativa no Dashboard

**Descricao:** Na tela Inicio, substituir ou complementar o `ViagemSummaryCard` com um card expandido que mostra dados da viagem ativa e um botao grande para acessar.

| Criterio | Nota | Justificativa |
|----------|------|---------------|
| Facilidade 60+ | 5/5 | Informacao na tela inicial, sem navegacao extra |
| Velocidade | 5/5 | 1 tap (abrir app + ver card + 1 tap no botao) |
| Complexidade | 2/5 | Precisa criar query que retorna a viagem ativa (nao so count), novo componente |
| Mobile-first | 5/5 | Card grande, botao de toque facil |

**Pontos fortes:**
- Motorista abre o app e ja ve sua viagem
- Sem aprendizado cognitivo ("onde clico?")
- Estado vazio claro: "Nenhuma viagem em andamento"

**Pontos fracos:**
- Se tiver 2+ viagens ativas (raro para motorista, possivel para dono), precisa decidir qual mostrar
- Ocupa espaco visual no dashboard

---

### Opcao B: Viagem Ativa no Topo da Listagem

**Descricao:** Na pagina `/viagens`, a viagem em_andamento sempre aparece em secao separada no topo, com destaque visual.

| Criterio | Nota | Justificativa |
|----------|------|---------------|
| Facilidade 60+ | 3/5 | Precisa ir ate Viagens primeiro |
| Velocidade | 3/5 | 2 taps: menu + viagens (a viagem ja esta no topo) |
| Complexidade | 1/5 | Reordenar array no `ViagemList`, adicionar secao |
| Mobile-first | 4/5 | Funciona bem, mas exige navegacao previa |

**Pontos fortes:**
- Implementacao simples (sort + secao destacada)
- Consistente com padrao de lista existente

**Pontos fracos:**
- Motorista precisa saber que deve ir em "Viagens"
- Nao resolve o problema de forma direta

---

### Opcao C: Botao Flutuante / Atalho no Sidebar

**Descricao:** Icone de caminhao ou botao flutuante (FAB) que leva direto para a viagem ativa.

| Criterio | Nota | Justificativa |
|----------|------|---------------|
| Facilidade 60+ | 3/5 | FAB pode confundir publico 60+ (nao e padrao obvio) |
| Velocidade | 5/5 | 1 tap de qualquer tela |
| Complexidade | 3/5 | Precisa estado global (viagem ativa ID), componente flutuante, logica condicional |
| Mobile-first | 3/5 | FAB pode cobrir conteudo, sidebar mobile ja e drawer |

**Pontos fortes:**
- Acesso de qualquer pagina
- Sempre visivel

**Pontos fracos:**
- FAB nao e intuitivo para publico 60+ (padrao mais jovem/tech)
- Sidebar ja e compacta, adicionar item dinamico pode confundir
- Precisa resolver: "o que aparece quando nao tem viagem ativa?"

---

### Opcao D: Redirect Automatico

**Descricao:** Ao acessar `/viagens`, se tem viagem ativa, redireciona direto para `/viagens/[id]`.

| Criterio | Nota | Justificativa |
|----------|------|---------------|
| Facilidade 60+ | 4/5 | Automatico, sem decisao do usuario |
| Velocidade | 4/5 | 1 tap em "Viagens" e ja cai no detalhe |
| Complexidade | 2/5 | Server-side redirect simples |
| Mobile-first | 4/5 | Funciona identico em qualquer tela |

**Pontos fortes:**
- Zero decisao do motorista
- Implementacao server-side limpa

**Pontos fracos:**
- Dono/admin que quer ver a lista fica frustrado (precisa "Ver todas as viagens")
- Se tem 2+ viagens ativas, qual redirecionar?
- Quebra expectativa de "cliquei em Viagens e quero ver viagens"
- Confuso quando nao tem viagem ativa (lista normal aparece sem explicacao)

---

### Opcao E: Combinacao (Recomendada)

**Descricao:** Card no Dashboard + viagem ativa no topo da lista + link contextual no sidebar (somente quando ha viagem ativa).

| Criterio | Nota | Justificativa |
|----------|------|---------------|
| Facilidade 60+ | 5/5 | Multiplos caminhos, todos obvios |
| Velocidade | 5/5 | 1 tap pelo dashboard, 2 taps pela lista |
| Complexidade | 3/5 | 3 pontos de mudanca, mas cada um e simples |
| Mobile-first | 5/5 | Card touch-friendly, lista reorganizada, sidebar contextual |

**Pontos fortes:**
- Motorista encontra a viagem de qualquer ponto de entrada
- Graceful degradation: se nao tem viagem ativa, tudo continua funcionando normal
- Dono/admin tambem se beneficiam (card mostra visao geral, lista organizada)

**Pontos fracos:**
- Mais pontos de implementacao (mas nenhum complexo individualmente)

---

## 4. Quadro Comparativo Final

| Opcao | Facilidade 60+ | Velocidade | Complexidade | Mobile-first | TOTAL |
|-------|:-:|:-:|:-:|:-:|:-:|
| A - Card Dashboard | 5 | 5 | 2 | 5 | **17** |
| B - Topo da Lista | 3 | 3 | 1 | 4 | **11** |
| C - FAB/Sidebar | 3 | 5 | 3 | 3 | **14** |
| D - Redirect | 4 | 4 | 2 | 4 | **14** |
| **E - Combinacao** | **5** | **5** | **3** | **5** | **18** |

---

## 5. RECOMENDACAO FINAL: Opcao E (Combinacao) com Priorizacao

Implementar em 3 fases, priorizando o impacto imediato para o motorista:

### Fase 1 (PRIORIDADE ALTA) - Card de Viagem Ativa no Dashboard

Este e o item de maior impacto. Sozinho ja resolve 80% do problema.

#### Mockup Textual - Dashboard com Viagem Ativa

```
+--------------------------------------------------+
| Inicio                                            |
| Bem-vindo, joao@email.com                         |
|                                                   |
| +----------------------------------------------+ |
| |  VIAGEM EM ANDAMENTO                         | |
| |                                               | |
| |  Sao Paulo  -->  Curitiba                     | |
| |  Caminhao: ABC-1234 - Volvo FH               | |
| |  Saida: 28/03/2026 08:00                      | |
| |                                               | |
| |  +------------------------------------------+ | |
| |  |        IR PARA VIAGEM                    | | |
| |  +------------------------------------------+ | |
| |                                               | |
| |  [+ Registrar Despesa]  [+ Abastecimento]    | |
| +----------------------------------------------+ |
|                                                   |
| +-------------+ +-------------+ +-------------+  |
| | Viagens     | | Gastos      | | Acertos     |  |
| | 2 em viagem | | R$ 3.450    | | 1 pendente  |  |
| +-------------+ +-------------+ +-------------+  |
+--------------------------------------------------+
```

#### Mockup - Sem Viagem Ativa

```
+--------------------------------------------------+
| Inicio                                            |
| Bem-vindo, joao@email.com                         |
|                                                   |
| +----------------------------------------------+ |
| |  Nenhuma viagem em andamento                  | |
| |  Quando voce iniciar uma viagem,              | |
| |  ela aparecera aqui.                          | |
| +----------------------------------------------+ |
|                                                   |
| +-------------+ +-------------+ +-------------+  |
| | Viagens     | | Gastos      | | Acertos     |  |
| | 0 em viagem | | R$ 0        | | 0 pendente  |  |
| +-------------+ +-------------+ +-------------+  |
+--------------------------------------------------+
```

#### Mockup - Multiplas Viagens Ativas (visao dono)

```
+--------------------------------------------------+
| Inicio                                            |
| Bem-vindo, dono@empresa.com                       |
|                                                   |
| +----------------------------------------------+ |
| |  3 VIAGENS EM ANDAMENTO                      | |
| |                                               | |
| |  Sao Paulo --> Curitiba  (Joao - ABC-1234)   | |
| |  [Ver Viagem]                                 | |
| |                                               | |
| |  Campinas --> Belo Horizonte  (Pedro - XYZ)   | |
| |  [Ver Viagem]                                 | |
| |                                               | |
| |  +------------------------------------------+ | |
| |  |       VER TODAS AS VIAGENS               | | |
| |  +------------------------------------------+ | |
| +----------------------------------------------+ |
+--------------------------------------------------+
```

#### Especificacoes do Card

| Aspecto | Especificacao |
|---------|---------------|
| Posicao | Primeiro elemento, antes dos summary cards |
| Cor de fundo | `bg-amber-50` (light) / equivalente dark mode |
| Borda | `border-amber-300` com `border-l-4` (borda esquerda grossa para destaque) |
| Titulo | "VIAGEM EM ANDAMENTO" em `text-sm font-bold uppercase tracking-wide text-amber-800` |
| Rota | `text-xl font-bold text-primary-900` com seta unicode entre origem e destino |
| Botao principal | `bg-primary-700 text-white rounded-lg px-6 py-4 text-lg font-bold w-full min-h-[56px]` |
| Botoes secundarios | `border border-surface-border rounded-lg px-4 py-3 text-base min-h-[48px]` |
| Estado vazio | `bg-surface-card border-dashed border-surface-border` com texto suave |
| Para motorista | Mostra 1 viagem (a dele) + botoes de acao diretos |
| Para dono/admin | Mostra lista compacta de todas viagens ativas + link "Ver Todas" |

#### Acessibilidade
| Item | Especificacao |
|------|---------------|
| Contraste | Texto amber-800 sobre amber-50 = ratio 7.2:1 (AAA) |
| Touch target | Todos botoes min 48px (botao principal 56px) |
| Screen reader | `aria-label="Viagem em andamento de Sao Paulo para Curitiba"` no card |
| Hierarquia | Card usa `role="region"` com `aria-labelledby` |
| Foco | Tab order natural, botao principal recebe foco primeiro |

---

### Fase 2 (PRIORIDADE MEDIA) - Viagem Ativa no Topo da Lista

#### Modificacao no ViagemList

Na listagem `/viagens`, separar viagens `em_andamento` numa secao destacada antes da lista geral.

```
+--------------------------------------------------+
| Viagens                                           |
| Gerencie as viagens da sua frota.  [Nova Viagem]  |
|                                                   |
| +----------------------------------------------+ |
| |  EM ANDAMENTO                                 | |
| |  +------------------------------------------+ | |
| |  | Sao Paulo --> Curitiba                    | | |
| |  | Joao - ABC-1234                           | | |
| |  | 28/03/2026 08:00                          | | |
| |  | R$ 15.000,00                    [Ver] [Ed]| | |
| |  +------------------------------------------+ | |
| +----------------------------------------------+ |
|                                                   |
| [Filtros: Status | Motorista | Data | Busca]      |
|                                                   |
| +------------------------------------------+      |
| | Campinas --> Santos         Planejada     |      |
| | Maria - DEF-5678                          |      |
| +------------------------------------------+      |
| | Rio --> Brasilia            Concluida     |      |
| | Joao - ABC-1234                           |      |
| +------------------------------------------+      |
+--------------------------------------------------+
```

#### Especificacoes
- Secao "EM ANDAMENTO" com `bg-amber-50 border border-amber-200 rounded-lg p-4 mb-6`
- Cards internos mantêm design existente mas com borda `border-l-4 border-amber-400`
- Viagens `em_andamento` sao **removidas** da lista geral (evitar duplicata)
- Se nao tem viagem ativa, secao nao aparece

---

### Fase 3 (PRIORIDADE BAIXA) - Indicador no Sidebar

#### Descricao
Adicionar um badge numerico ao lado do link "Viagens" no sidebar quando ha viagens em andamento.

```
Desktop sidebar:
+----------------------------+
|  Inicio                    |
|  Empresa                   |
|  Viagens  [2]              |  <-- badge amber
|  Gastos                    |
|  Acerto de Contas          |
+----------------------------+
```

#### Especificacoes
- Badge: `bg-amber-500 text-white text-xs font-bold rounded-full px-2 py-0.5 ml-auto`
- Mostra contagem de viagens em_andamento
- Se 0, badge nao aparece
- Aplicar tanto no sidebar desktop quanto no MobileSidebar

---

## 6. Componentes a Criar/Modificar

### Novos Componentes

| Componente | Path | Descricao |
|------------|------|-----------|
| `ViagemAtivaCard` | `components/dashboard/ViagemAtivaCard.tsx` | Card destacado da viagem ativa para o dashboard |

### Componentes a Modificar

| Componente | Path | Mudanca |
|------------|------|---------|
| Dashboard page | `app/(dashboard)/dashboard/page.tsx` | Adicionar `ViagemAtivaCard` acima dos summary cards |
| Dashboard actions | `app/(dashboard)/dashboard/actions.ts` | Nova query `getViagemAtiva()` que retorna dados da viagem (nao so count) |
| ViagemList | `components/viagens/ViagemList.tsx` | Separar viagens em_andamento no topo com secao destacada |
| Layout sidebar | `app/(dashboard)/layout.tsx` | Adicionar badge de contagem em "Viagens" |
| MobileSidebar | `components/ui/MobileSidebar.tsx` | Adicionar badge de contagem em "Viagens" |

### Nova Server Action

```typescript
// Em app/(dashboard)/viagens/actions.ts ou dashboard/actions.ts

export async function getViagemAtiva(): Promise<{
  data: Array<{
    id: string;
    origem: string;
    destino: string;
    motorista_nome: string;
    caminhao_placa: string;
    caminhao_modelo: string;
    data_saida: string;
    km_saida: number | null;
  }> | null;
  error: string | null;
}> {
  // Query viagens com status 'em_andamento'
  // Para motorista: filtra pelo motorista_id dele
  // Para dono/admin: retorna todas da empresa
  // Ordena por data_saida ASC (mais antiga primeiro)
  // Limite: 5 (para o card do dashboard)
}
```

---

## 7. Decisoes de Design

### [AUTO-DECISION] Cor do destaque da viagem ativa
**Pergunta:** Qual cor usar para destacar a viagem ativa?
**Decisao:** Amber/amarelo (`amber-50`, `amber-300`, `amber-800`)
**Razao:** Amarelo comunica "em andamento/atencao" universalmente. Verde seria confuso com "concluida". Azul nao tem urgencia suficiente. O sistema ja usa amber em estimativas de custo com dados insuficientes, criando consistencia semantica.

### [AUTO-DECISION] Quantas viagens mostrar no card do dashboard?
**Pergunta:** Se dono tem 10 viagens ativas, mostrar todas?
**Decisao:** Motorista ve 1 (a dele). Dono/admin ve ate 3 + link "Ver todas".
**Razao:** Motorista tipicamente tem 1 viagem ativa. Dono pode ter varias, mas o dashboard nao deve virar lista. 3 e suficiente para visao geral.

### [AUTO-DECISION] Botoes de acao direta no card?
**Pergunta:** Incluir "Registrar Despesa" e "Abastecimento" direto no card?
**Decisao:** Sim, para motorista. Nao para dono (que ve lista compacta).
**Razao:** O motorista parado no posto quer registrar rapido. Cada tap a menos e critico. Botoes secundarios no card eliminam mais 1-2 taps do fluxo.

### [AUTO-DECISION] Redirect automatico (Opcao D)?
**Pergunta:** Implementar redirect em /viagens?
**Decisao:** Nao implementar.
**Razao:** Quebra modelo mental do usuario ("cliquei em Viagens, quero ver viagens"). O card no dashboard ja resolve o problema de velocidade sem confundir a navegacao.

---

## 8. Impacto Esperado

| Metrica | Antes | Depois (Fase 1) |
|---------|-------|-----------------|
| Taps ate viagem ativa (mobile) | 3-4 | 1 |
| Carga cognitiva | Alta (encontrar na lista) | Baixa (card obvio) |
| Tempo ate registrar despesa | ~15-20s | ~5s |
| Acesso errado (tela errada) | Frequente | Eliminado |

---

## 9. Proximos Passos

1. **Criar story** para Fase 1 (Card no Dashboard) - pode ser implementada isoladamente
2. **Criar story** para Fase 2 (Topo da Lista) - complementar, pode ser no mesmo sprint
3. Fase 3 (Badge sidebar) pode ser feita junto com a Fase 1 como bonus

**Estimativa total:** Fase 1 = ~4h | Fase 2 = ~2h | Fase 3 = ~1h
