# Auditoria de UX e Design - FrotaViva

**Data:** 2026-04-12
**Auditora:** Uma (AIOX UX Design Expert)
**Escopo:** Audit de UX, hierarquia visual, consistência, 55+ compliance, dark mode, acessibilidade, comparação com referências Linear/Supabase/Vercel
**Profundidade:** Média (21 pontos)
**Método:** Leitura estática do código-fonte (sem execução). Path base: `apps/siga-bem/`.
**Referências DESIGN.md consultadas:** linear, supabase, vercel (princípios, não cópia literal)

## Resumo executivo

O FrotaViva tem fundações fortes: tokens semânticos em `globals.css`, tipografia base 16px+, áreas de toque 48px aplicadas com rigor nas CTAs principais, e uma arquitetura de informação coerente por role (dono, gestor, motorista). Mas o verniz esconde três classes de dívida técnica de UX que afetam diretamente o público 55+:

1. **Classes Tailwind quebradas silenciosamente** em componentes de navegação e ações destrutivas (a sidebar mobile, o hover de "Sair", o botão de remover comprovante). São "fantasmas" de um rename mal feito (`bg-red-600` virou `bg-alert-danger-bg` e ficou um `0` sobrando). Visualmente invisíveis pro dev, mas silenciosamente quebram affordance no produto real.
2. **Escape hatches de dark mode**: 231 ocorrências de cores nativas do Tailwind (`amber-*`, `slate-*`, `red-*`, `gray-*`) e 156 ocorrências de shades de `primary-*` que não existem na paleta (50, 200, 300, 400, 600, 800). O sistema de tokens existe mas não é rigorosamente adotado, o que gera inconsistência de dark mode em áreas isoladas (badges amarelas de "em andamento", borders em laranja).
3. **Vícios de modal e inconsistências mobile vs desktop** na mesma ação, violando a regra "sem popups". Exemplo canônico: excluir viagem usa confirm inline no mobile e modal fixed-inset-0 no desktop.

O quarto eixo de atenção é o **déficit de acentuação PT-BR** em strings visíveis: 84 ocorrências de palavras como "Saida", "Situacao", "Distancia", "manutencao", "Observacao", "Acao" que quebram a promessa de zero jargão e ferem o leitor 55+, que nota imediatamente texto "errado".

O tom geral é: um produto maduro que sofre de erosão pontual. Não precisa de redesign. Precisa de limpeza cirúrgica + 2 ou 3 consolidações de padrão.

---

## Metodologia de classificação

| Severidade | Critério |
|------------|----------|
| CRÍTICO | Quebra visual/funcional visível + afeta confiança do público 55+ ou impede ação primária |
| ALTO | Rompe consistência sistêmica, violação direta de regra de projeto, acessibilidade AA |
| MÉDIO | Atrito mensurável, desvio de princípio de design, inconsistência recorrente |
| BAIXO | Polimento, microinteração, oportunidade de alinhar com referência |

| Esforço | Impacto |
|---------|---------|
| S (até 2h) | S (local, 1 a 3 telas) |
| M (meia diária) | M (afeta feature inteira) |
| L (1 dia ou mais) | L (afeta toda a UI) |

---

# Achados classificados

## CRÍTICO

### 1. Classes Tailwind quebradas em navegação: `bg-alert-*-bg0` (o "0" zumbi)

**Arquivos:**
- `app/(dashboard)/layout.tsx:144` (badge de viagens ativas na sidebar desktop)
- `app/(dashboard)/layout.tsx:193` (hover do botão "Sair" desktop)
- `components/ui/MobileSidebar.tsx:148` (badge viagens ativas mobile)
- `components/ui/MobileSidebar.tsx:212` (hover botão "Sair" mobile)
- `components/gastos/ComprovantesUpload.tsx:340` (badge de remover comprovante)

**Problema:** Cinco locais usam classes como `bg-alert-warning-bg0` e `hover:bg-alert-danger-bg0/20`. O `0` final é artefato de um search/replace mal feito (provavelmente de `bg-red-600` ou `bg-amber-500` para token semântico, que deixou o "0" do número sobrando colado ao nome do token). Tailwind v4 não gera classe para `bg-alert-warning-bg0`. **Silenciosamente, essas superfícies não têm cor nenhuma.**

**Impacto:** A badge de "viagens em andamento" na sidebar (mobile e desktop) aparece com texto branco sobre fundo transparente, invisível em cima do `#1B3A4B` da sidebar. O botão "Sair" perde feedback de hover. O botão de remover comprovante fica sem destaque. Três afetam usuários todos os dias, em UI persistente. Um motorista 55+ olha pra sidebar e não vê que tem uma viagem aberta, a afordance primária some.

**Por que é CRÍTICO:** afeta navegação, é invisível pros devs (não quebra build, não gera warning), e atinge uma feature de alerta visual fundamental pro público alvo.

**Proposta:** Substituir por token correto:
```
bg-alert-warning-bg0      -> bg-warning (para badge sólida) ou bg-warning/20 (para pill suave)
hover:bg-alert-danger-bg0/20  -> hover:bg-alert-danger-bg (o token já existe em globals.css linhas 37, 117)
```
Fazer grep `bg-alert-.*-bg0` e substituir. Adicionar regra de lint que proíba o padrão `-bg0`.

**Esforço:** S | **Impacto:** M

---

### 2. Dark mode sem rigor: escape hatches de cores nativas em 30+ componentes

**Arquivos mais atingidos:**
- `components/fechamentos/ViagensPendentesAcerto.tsx:85` (`bg-amber-100 text-amber-800`)
- `components/viagens/ViagemList.tsx:147` (`border-amber-400`, `border-amber-800`)
- `components/viagens/ViagemList.tsx:198-204` (table thead com `bg-alert-warning-bg` sem par de texto dark)
- `components/motoristas/MotoristaList.tsx`, `components/motoristas/MotoristaForm.tsx`
- `components/caminhoes/CaminhaoForm.tsx`, `components/empresa/EmpresaForm.tsx`
- `components/abastecimento/AbastecimentoForm.tsx`
- `components/viagens/VeiculoForm.tsx`

**Problema:** 231 ocorrências (grep) de classes da paleta nativa Tailwind (`amber-100..800`, `red-200..700`, `slate-200..900`, `gray-100..900`). Essas classes NÃO trocam em dark mode, porque o override `.dark` em `globals.css` só redefine tokens semânticos (`--color-primary-*`, `--color-surface-*`, etc), não a paleta nativa.

**Impacto visível:** a badge "X viagens" no acerto de motorista (linha 85 de ViagensPendentesAcerto.tsx) aparece amarela clara (`bg-amber-100 text-amber-800`) em dark mode também, criando contraste gritante sobre o card escuro. A tabela de viagens em andamento tem thead em `bg-alert-warning-bg` (que vira escuro em dark) com `text-warning` (amarelo) e mantém um `border-amber-800` fixo, resultando num card com cores descoordenadas nos dois modos.

**Rationale:** Linear tem como princípio central "darkness as the native medium, where information density is managed through subtle gradations of white opacity rather than color variation". FrotaViva importa esse princípio só parcialmente: tem surfaces tokenizadas mas deixa accent colors escapar pro Tailwind bruto. O resultado é que dark mode parece "um light mode com fundo preto", não um design nativo.

**Proposta (fase 1, tático):** criar 3 novos tokens para os casos mais recorrentes e substituir em batch:
```
--color-badge-warning-bg / fg   (substitui amber-100/amber-800)
--color-badge-info-bg / fg      (substitui blue-100/blue-800)
--color-badge-neutral-bg / fg   (substitui slate-100/slate-700)
```
Definir em `@theme` e no bloco `.dark`. Fazer busca/substituição dirigida: priorizar `BiKpiCards.tsx`, `ViagensPendentesAcerto.tsx`, `ViagemList.tsx`, `FechamentoDetail.tsx`, `MotoristaList.tsx`.

**Proposta (fase 2, estratégico):** regra ESLint interna proibindo classes Tailwind brutas de paleta no diretório `components/` (permitir somente em `app/globals.css` e em ícones). Exceção: `white`, `black`, `transparent`.

**Esforço:** M (token design) + M (grep e substituir) = ~1 dia | **Impacto:** L (afeta consistência de toda a UI em dark mode)

---

### 3. Shades de `primary-*` não definidos geram classes vazias

**Arquivos (amostra):**
- `components/bi/BiKpiCards.tsx:100` (`border-primary-300/40`, `bg-primary-50/50`, `dark:border-primary-500/20`, `dark:bg-primary-900/10`)
- `components/bi/BiAlertas.tsx:34,184` (`dark:text-primary-400`)
- `components/bi/BiAlertas.tsx:102` (`text-primary-400`)
- `app/(dashboard)/fechamentos/page.tsx:126,149,154,160` (`text-primary-500`, `hover:bg-surface-muted`)

**Problema:** `app/globals.css` define apenas quatro shades de primary: 100, 500, 700, 900. Mas o código usa 50, 200, 300, 400, 600, 800 em 156 locais. Tailwind v4 não gera classe para cor indefinida, então `bg-primary-50/50` é CSS inexistente, silenciosamente ignorado. O card "Receita em Fretes" do BI (linha 100 do BiKpiCards) não tem o fundo claro azulado pretendido: ele tem fundo default (branco).

**Impacto:** O "KPI hero" do dono perde sua diferenciação visual pretendida. O card do "Lucro Bruto" (com background colorido de fato, via `bg-alert-success-bg`) fica visualmente mais forte que "Receita em Fretes", invertendo a hierarquia projetada. `text-primary-400` em BiAlertas some no dark mode (texto cinza claro sobre fundo cinza claro).

**Proposta:** decisão prévia entre duas opções:
- **Opção A (minimalista):** substituir todos os usos de shades ausentes pelos shades existentes (50→100, 200/300/400→500, 600/800→700). Esforço S, impacto S.
- **Opção B (completa):** adicionar a escala completa 50-900 em `@theme` e no bloco `.dark` do `globals.css`. Esforço M, impacto M. **Recomendo essa.** Seguir a convenção Tailwind. Mantém compatibilidade com código atual, previne erros futuros, dá granularidade pro dark mode.

Pitch de design: a paleta completa deve respeitar a logica de luminance ladder do Linear (dos 4 níveis de texto) e não ser apenas interpolação linear entre 100 e 900 existentes. Validar em 55+ com teste de contraste.

**Esforço:** M | **Impacto:** M

---

### 4. "Sem popups" violado: modal fixed-inset-0 pra confirmar exclusão de viagem

**Arquivo:** `components/viagens/ViagemList.tsx:514-540`

**Problema:** A confirmação de exclusão usa dois padrões diferentes:
- Mobile (linha 339-349): confirmação inline dentro do card, com botões "Confirmar" e "Cancelar" aparecendo no lugar do botão "Excluir". Correto, respeita a regra.
- Desktop (linha 514-540): `<div className="fixed inset-0 z-50 ... bg-black/40">` com card `max-w-sm` centrado. **Modal customizado clássico.**

A regra do projeto (`feedback_no_popups.md` do usuário) é "NUNCA modais customizados, usar inline ou página de detalhe".

**Impacto:** inconsistência mobile/desktop na mesma ação, viola regra explícita. No desktop, dono grande costuma trabalhar com monitor largo e o modal no centro é exatamente o overlay com backdrop escuro que o usuário reportou rejeitar.

**Proposta:** unificar no padrão inline do mobile. No desktop, quando clicar "Excluir", trocar o botão por uma barra de confirmação inline: `[Tem certeza? Não pode desfazer] [Confirmar] [Cancelar]`. Pode aparecer dentro da própria `<tr>` expandida ou numa row inserida logo abaixo, pintada de `bg-alert-danger-bg`. Mesma abordagem serve pra `components/gastos/ReceiptModal.tsx`, `components/motoristas/CredenciaisModal.tsx`, `components/usuarios/invite-modal.tsx`.

Wireframe:
```
+-------------------------------------------------------------+
| SP -> RJ | Carlos    | ABC-1234 | 12/04 14:00 |  R$ 5.000 |
| > Tem certeza que deseja excluir? Não pode desfazer.       |
|   [Confirmar Exclusão]  [Cancelar]                         |
+-------------------------------------------------------------+
```

**Esforço:** S (um componente) | **Impacto:** M (resolve padrão pra outras telas)

---

## ALTO

### 5. Strings sem acentuação PT-BR em texto visível ao usuário (84 ocorrências)

**Arquivos (amostra top):**
- `components/abastecimento/AbastecimentoForm.tsx` (15 ocorrências)
- `components/motoristas/MotoristaForm.tsx` (12)
- `components/caminhoes/CaminhaoForm.tsx` (7)
- `components/viagens/ViagemList.tsx` (2 — "Saida", "Situacao", "Caminhao", "Acoes", "Proxima")
- `components/viagens/ViagemForm.tsx` (labels "Data de Saida", "Distancia Estimada (km)", "KM na Saida")
- `components/fechamentos/FechamentoDetail.tsx` (2)

**Exemplos concretos encontrados:**
- `"Nao autenticado"`, `"comecar"`, `"Pais"`, `"Cadastro Tecnico"`, `"servico"`, `"Descricao"`, `"Saida"`
- `<th>Saida</th>` em ViagemList linha 202, linha 378
- Label `"Data de Saida *"` em ViagemForm linha 356
- `"Cadastrar Viagem"` correto, mas `"Distancia Estimada (km)"` errado

**Problema:** O público 55+ lê texto linearmente, não "escaneia", e palavras sem acento soam como "errado" (não como "internet speak"). A regra `feedback_ux_older_audience.md` é explícita: zero jargão, zero inglês, zero abreviação. Texto de título de coluna ou label de formulário tem peso alto: é o que o usuário vê antes de ler o valor.

**Hipótese de raiz do problema:** comentários em código usam sem acento pra evitar encoding issues, e o comentário virou string UI por copy-paste. Não tem processo de lint.

**Proposta:**
1. Auditar 100% das strings visíveis com grep dirigido: `"\b(Saida|Situacao|Acao|Proxima|Distancia|Observacao|Caminhao|comecar|Descricao|Cadastro Tecnico|servico)\b"` no diretório `components/` e `app/`.
2. Substituir para forma correta: Saída, Situação, Ação, Próxima, Distância, Observação, Caminhão, começar, Descrição, Cadastro Técnico, serviço.
3. Adicionar ESLint rule custom ou um script npm "check-ptbr" que rode no pre-commit com dicionário de 30-40 palavras críticas.
4. Revisar também comentários de JSDoc que possam aparecer como tooltips.

**Esforço:** M (grep + substituir + criar regra) | **Impacto:** M (afeta leitura de todo usuário, todos os dias)

---

### 6. Coluna de ações mobile vs desktop: padrões divergentes (inline todos vs OverflowMenu)

**Arquivo:** `components/viagens/ViagemList.tsx:315-362` (mobile) vs `416-466` (desktop)

**Problema:** Na versão mobile, o card de viagem expõe até 5 ações inline: `Ver`, `Editar`, `Acertar`, `Excluir`, `Invalidar`. Quando `viagem.status === 'planejada'`, todos os 5 aparecem de uma vez, 3 deles em vermelho (Excluir, Invalidar e o state de confirmação). Resultado: um motorista 55+ abre o card e vê 5 botões, 3 vermelhos, sem hierarquia clara. O `OverflowMenu` existe e é usado só no desktop.

**Além disso:** o botão `Invalidar` no mobile linha 356 tem a mesma cor do `Excluir` linha 348 — `text-danger hover:bg-alert-danger-bg`. Dois botões vermelhos do mesmo jeito com significados diferentes (excluir = deleta registro, invalidar = cancela viagem concluída). O 55+ não distingue.

**Impacto:** ruído visual, hierarquia perdida, risco de ação errada em ação destrutiva.

**Proposta:**
1. Primária (grande, azul): `Ver` ou `Abrir Viagem`.
2. Secundária (outline): `Editar`.
3. Especial quando `status === 'concluida'`: `Acertar` em verde.
4. Destrutivas (`Excluir`, `Invalidar`) vão pra um botão único `[Mais]` com OverflowMenu tanto no desktop quanto no mobile.
5. Dentro do overflow, cada item tem ícone + label + cor. Confirmação inline igual ao modelo proposto no ponto 4.

Wireframe mobile do card:
```
+-----------------------------------------+
| SP -> RJ              [Planejada]       |
| Carlos - ABC-1234                       |
| 12/04/2026 14:00                        |
|                                         |
| R$ 5.000,00                70%          |
|                                         |
| [Abrir Viagem]  [Editar]    [...]       |
+-----------------------------------------+
```

**Esforço:** M | **Impacto:** M

---

### 7. Hierarquia quebrada do BI Hero KPI: Lucro "ganha" visualmente da Receita

**Arquivo:** `components/bi/BiKpiCards.tsx:47-124`

**Problema:** A intenção declarada no comentário do arquivo é "profit-first layout" com Lucro Bruto como card 1 e Receita como card 3 "neutra". Mas na prática:
- Card 1 (Lucro) tem background colorido (`bg-alert-success-bg` ou `bg-alert-danger-bg`), border colorido, texto colorido grande.
- Card 3 (Receita) tentou `bg-primary-50/50 border-primary-300/40` — shades que não existem (ver ponto 3). Logo: fundo branco, sem destaque.
- Card 4 (Custos) usa `text-text-muted` e `tabular-nums text-primary-500`, perdendo o mesmo peso visual.

O resultado é que pro 55+, "receita" parece secundária e "custos" parece terciária, enquanto "lucro" rouba toda a atenção. Mas Receita é o número que o dono acha PRIMEIRO ao tentar entender performance ("quanto eu faturei esse mês"). Margem e Lucro são métricas derivadas.

**Rationale:** Linear e Supabase usam "luminance ladder" pra hierarquia, não explosão de cor. O card mais importante usa contraste mais alto (peso, tamanho), não a cor mais saturada. Stripe dá receita em destaque com tipografia pesada, não com background colorido.

**Proposta:**
1. Remover background colorido do Card 1 (Lucro) e usar apenas uma tarja esquerda (`border-l-4 border-l-success/danger`) + número grande.
2. Card 3 (Receita) vira o visualmente mais destacado: maior número em tamanho (text-4xl), peso máximo, texto em `text-primary-900`, com um detalhe sutil (uppercase label + nota de período abaixo).
3. Manter os 4 cards com altura igual e grid simétrico. Usar tipografia pra hierarquia, não cor.
4. Adicionar delta vs período anterior nos 4 cards (ex: +12% vs mês passado, -4% vs mês passado) — isso é o que Linear/Supabase fazem no "Metrics" deles.

Ganho pro 55+: menos explosão de cor, mais legibilidade, o dono identifica receita num piscar de olhos.

**Esforço:** M | **Impacto:** M

---

### 8. Tooltip via atributo `title=""` no gráfico de tendência mensal

**Arquivo:** `components/bi/BiTendenciaMensal.tsx:55`

**Problema:** O gráfico de barras usa `title={valor}` pra mostrar tooltip. Mas:
1. `title` nativo do HTML só aparece em desktop com mouse hover, **não funciona em touch/mobile**.
2. O tempo pra aparecer é ~700ms (controlado pelo sistema operacional), inaceitável pra 55+.
3. É lido por screen readers de forma inconsistente.
4. No mobile, o gráfico tem um "fallback list" (linha 66-80) mas no desktop não tem texto de valor associado a cada barra além do número em cima.

**Impacto:** O 55+ no desktop vê as barras e tem dificuldade de ler qual é o mês exato de cada barra se elas ficarem apertadas. No mobile, tem o fallback list (bom). A tentativa de acessibilidade via `title` não resolve.

**Proposta:**
1. Remover o `title` e substituir por label visual permanente embaixo da barra (já existe linha 57-59), mas tornar o label obrigatório a aparecer em 100% do largura (hoje pode ficar truncado se tiver 6 barras apertadas).
2. Em desktop, se mais de 6 barras, tornar o label rotacionado 45° ou abreviado ("abr" no lugar de "Abril 2026").
3. Usar o `InfoTooltip` customizado (existe em `components/ui/InfoTooltip.tsx`) se quiser tooltip real: funciona em touch, tem timing controlado, é acessível.

**Esforço:** S | **Impacto:** S

---

### 9. Onboarding bar usa `createPortal` fixo no topo + `pt-24` pra empurrar conteúdo

**Arquivos:**
- `components/onboarding/OnboardingBar.tsx:70-154`
- `app/(dashboard)/layout.tsx:226` (linha `main` com `${showOnboarding && onboardingStep > 0 ? 'pt-24' : ''}`)

**Problema:** O onboarding é um barra fixa no topo via React portal (`createPortal(content, document.body)`). Quando ativo, o layout aplica `pt-24` no `<main>` pra compensar. Dois problemas:
1. É uma "popup fixa" persistente, parente de modal (viola filosofia "sem popup"). A régua usada no projeto distingue "popup de confirmação" (proibido) de "banner de sistema persistente" (aceitável), mas o onboarding usa portal pra escapar do fluxo de documento e render em cima de tudo com `z-index: 99998`. Isso é "modal persistente", não banner.
2. O `pt-24` acoplado ao layout é cola. Se o onboarding mudar de altura (responsivo), quebra.

**Impacto:** um usuário que ativar "refazer tutorial" na configuração volta pro tutorial e perde contexto do conteúdo abaixo (o conteúdo salta por causa do `pt-24`). Dark mode do onboarding tem hardcoded `bg-[#1B3A4B]` e `bg-green-500`, ignorando tokens.

**Proposta:**
1. Tornar o `OnboardingBar` um banner não-portal: renderizado como primeiro filho do `<main>`, `sticky top-0`. Pula o portal + z-index war.
2. Removido o `pt-24` da main.
3. Usar tokens: `bg-primary-900` (navy) e `bg-success` (verde), pra respeitar dark mode.

**Esforço:** S | **Impacto:** M

---

### 10. Acessibilidade insuficiente: aria-label baixa cobertura

**Números:** `aria-label|role|aria-live` aparece em 43 arquivos de componentes totais. O projeto tem ~60 componentes. Metade não tem aria ou role.

**Arquivos problemáticos (amostra):**
- `components/fechamentos/FechamentoList.tsx` — tabela sem `<caption>` ou `role="table"`, botão "Detalhes" sem `aria-label` (apesar de ter texto visível, falta `aria-describedby` linkando à linha).
- `components/viagens/ViagemList.tsx` — pagination buttons linha 482-498 só têm texto "Anterior"/"Próxima", sem `aria-label="Página anterior"`.
- `components/bi/*` — gráficos CSS sem `role="img"` + `aria-label` descrevendo o valor.
- `components/ui/MobileSidebar.tsx` — hamburger tem `aria-label` (bom, linha 61). Mas o overlay de fundo ao abrir não tem `aria-hidden`.
- Badges de status (nos cards) — `inline-block rounded-full ... {status_label}` sem nenhum `role`, e o color-coding é a única marca visual. Screen reader lê "Em andamento" mas perde o significado da cor.

**Impacto:** baixa conformidade WCAG 2.1 AA, dificulta uso por leitores de tela (importante pro 55+ com baixa visão), também afeta automação de testes E2E que usam query por role.

**Proposta:**
1. Checklist de acessibilidade por arquivo: tabelas com role, botões com aria-label claro, gráficos CSS como `role="img"` e descrição textual, live regions pra notificações de sucesso/erro.
2. Adicionar regra ESLint `jsx-a11y/*` e rodar no projeto.
3. Priorizar 5 arquivos críticos: `FechamentoList`, `ViagemList`, `BiKpiCards`, `BiTendenciaMensal`, `MobileSidebar`.

**Esforço:** M | **Impacto:** M

---

### 11. Multi-empresa switch: checkbox "fake" e dropdown como popover

**Arquivo:** `components/empresa/EmpresaSwitcher.tsx` (todo)

**Problema:** O `EmpresaSwitcher` expõe uma UI complexa na sidebar com:
1. Dropdown que abre com `useState(open)` e fecha via `click outside` (linha 62-72), pattern de popover manual.
2. Lista com checkboxes "multi-select".
3. Estado optimistic (`optimisticActiveId`, `checkedIds: Set`, `multiMode`).
4. Reset via `window.location.href = pathname` (linha 91).

Em cima da sidebar navy escura, o dropdown abre em cima dos links de navegação e fica alto z-index. Mas o estado optimistic + `window.location.href` faz com que trocar empresa tenha feedback lento ("pisca a tela inteira"). O 55+ não entende o dropdown — "por que é checkbox se eu só quero trocar?".

**Sub-problema:** dono com 3 empresas não usa multi-empresa no dia-a-dia, usa single. Mas o UI força ele a ver checkboxes.

**Proposta:**
1. Separar 2 UIs:
   - Single-switch (caso 90%): dropdown simples de radio group, sem checkbox, sem estado optimistic complexo.
   - Multi-select (caso 10%): botão `[Ver várias empresas]` dedicado que abre PÁGINA `/empresas/multi-selecionar` (não dropdown).
2. No dropdown single, usar `<details>` nativo ou um `listbox` Radix — melhora a11y e reduz custom code.
3. Trocar `window.location.href` por `router.refresh()` pra feedback instantâneo.

Pitch: Supabase tem exatamente esse problema de multi-project e resolveu separando "project switcher" (dropdown simples) de "workspace management" (página dedicada).

**Esforço:** M | **Impacto:** M

---

## MÉDIO

### 12. Formulário de viagem: 10 campos sem agrupamento visual

**Arquivo:** `components/viagens/ViagemForm.tsx:267-475`

**Problema:** O form é um grid `md:grid-cols-2` com 10 campos em sequência (motorista, caminhão, origem, destino, data_saida, data_chegada, valor, percentual, km_estimado, km_saida). Nenhum agrupamento visual, nenhum heading de seção. O motorista 55+ rola uma parede de campos.

A recomendação do projeto é "formulário reduzido pra preview+confirmar" (já planejado pro acerto). Mas o form de viagem não tem isso.

**Proposta:** agrupar em 3 fieldsets:
- **Quem e onde** (motorista, caminhão, origem, destino)
- **Quando** (data_saida, data_chegada_prevista)
- **Dinheiro e distância** (valor, percentual readonly, km_estimado, km_saida)

Usar `<fieldset>` com `<legend>` estilizado (grande, bold, text-primary-700). Cada seção fica claramente delimitada. Acessibilidade melhora naturalmente via `<fieldset>`.

**Esforço:** S | **Impacto:** S

---

### 13. Tabela de fechamentos: ausência de totalizador e ordenação visível

**Arquivo:** `components/fechamentos/FechamentoList.tsx:61-127`

**Problema:** A tabela tem 8 colunas (motorista, período, tipo, viagens, gastos, saldo, situação, ações) mas:
1. Sem totalizador no footer (total de "Saldo" do período filtrado, total de "Viagens", etc).
2. Sem sort visível. `text-left` nos headers mas não é sortable.
3. Sem indicador de "X de Y resultados" diretamente na tabela.
4. `<tr>` com `hover:bg-surface-muted` mas sem indicar que a linha é clicável pra ir no detail (a única forma de abrir é clicar no botão "Detalhes" à direita).

**Impacto:** o dono abre "Acertos" pra ver quanto tem pra pagar no total, e precisa somar na calculadora. O período de sort é implícito (created_at desc, imagino).

**Proposta:**
1. Adicionar `<tfoot>` com totais do período filtrado.
2. Tornar a linha inteira clicável (linkada ao detail), o botão "Detalhes" vira redundante e pode sair.
3. Headers sortáveis (simples: texto vira botão com setinha indicando ordem).
4. Seletor de ordenação no topo: `[Mais recentes] [Maior saldo] [Menor saldo]` — ação de 1 clique.

Referência: Linear tem totalizador no "Issues" board, Supabase no dashboard de queries.

**Esforço:** M | **Impacto:** M

---

### 14. Empty states: mensagens curtas sem orientação

**Arquivos:**
- `app/(dashboard)/fechamentos/page.tsx:125-137`
- `components/viagens/ViagemList.tsx:265-274`
- `components/bi/BiBreakdownCategorias.tsx:22`
- `components/dashboard/ViagemAtivaCard.tsx:18-29`

**Problema:** empty states como `"Nenhuma viagem por aqui."` + CTA. Mas não explicam o "porquê" nem o "e agora". Pro 55+ que nunca usou o sistema, cair num empty state é confuso.

**Proposta:** formato estruturado pra todos os empty states:
```
[icone grande, 64x64]
Título: "Ainda não tem viagens aqui"
Subtítulo (1 linha explicativa): "Quando o motorista sair pra entregar, a viagem aparece nessa lista."
CTA primária: "Registrar Primeira Viagem"
CTA secundária (opcional): "Aprender a usar o sistema" (abre tutorial)
```

Aplicar em pelo menos 4 telas. Fazer componente reusável `<EmptyState icon title description primary secondary>`.

**Esforço:** S | **Impacto:** M

---

### 15. Ícones SVG inline repetidos sem registry

**Arquivos:** qualquer tela. Exemplos:
- Ícone de "+" (plus) repetido em `viagens/page.tsx:95`, `fechamentos/page.tsx:95,132`, `ViagemList.tsx`, `ViagemAtivaCard.tsx:77` (variantes inline)
- Ícone de seta inline em `BackButton`, `EmpresaSwitcher`, `OnboardingBar`, `viagens/ViagemForm.tsx`

**Problema:** SVGs são escritos inline em JSX, copiados entre arquivos. Isso gera:
1. Inconsistência de stroke-width (alguns 2, outros implícito).
2. Inconsistência de tamanho (h-4, h-5, h-6 misturados sem sistema).
3. Bundle maior, sem dedup.
4. Trocar um ícone exige grep global.

**Proposta:** criar `components/ui/icons.tsx` com componentes nomeados (`<IconPlus/>`, `<IconChevronDown/>`, `<IconWarning/>`, `<IconCheck/>`, etc). Size via prop (`size=16|20|24`). Stroke consistente.

Como o AIOX já pede `app/components/ui/icons/icon-map.ts` como fonte única, isso alinha com padrão de framework.

**Esforço:** M | **Impacto:** M

---

### 16. Badge de status com cor como única marca

**Arquivos:**
- `types/viagem.ts` (provável — `VIAGEM_STATUS_COLORS`)
- `types/fechamento.ts` (`FECHAMENTO_STATUS_COLORS`)

**Problema:** badges de status usam apenas cor de fundo + texto pra comunicar status. Daltônico não distingue verde/vermelho. Baixa visão (comum em 55+) não distingue sutilezas de tom. Screen reader lê o texto mas perde a nuance.

**Proposta:** cada status ganha um ícone dedicado + cor (redundância). Exemplo:
- "Planejada" + ícone calendário azul
- "Em andamento" + ícone caminhão laranja
- "Concluída" + ícone check verde
- "Cancelada" + ícone X vermelho

Badge vira `<span><icon/> Label</span>`. Acessibilidade + clareza pro 55+.

**Esforço:** S | **Impacto:** M

---

### 17. Container max-width inconsistente: `max-w-6xl` vs `max-w-7xl` vs `w-full`

**Arquivos:**
- `app/(dashboard)/fechamentos/page.tsx:74,86` — `max-w-6xl`
- `app/(dashboard)/viagens/page.tsx:65` — `max-w-6xl`
- `app/(dashboard)/bi/page.tsx:291` — `max-w-7xl`
- `app/(dashboard)/dashboard/page.tsx:129` — `<div>` sem max-w

**Problema:** Desktop em monitor grande, a largura do conteúdo muda em cada tela, criando "pulo" visual na navegação. Dashboard usa full width, BI 7xl, Viagens 6xl, Fechamentos 6xl. Motorista 55+ nota o pulo.

**Proposta:** padronizar no layout `(dashboard)/layout.tsx` com `max-w-7xl mx-auto` no `<main>` ou num wrapper dedicado. Remover todos os `max-w-*` das pages individuais. Permitir overrides intencionais via prop de layout.

**Esforço:** S | **Impacto:** S

---

### 18. Paginação: pattern "Anterior/Próxima" sem salto pra página específica

**Arquivos:**
- `components/viagens/ViagemList.tsx:475-503`
- `app/(dashboard)/fechamentos/page.tsx:144-166`

**Problema:** pagination é sempre "Anterior | página X de Y | Próxima". Pro 55+ que precisa ir da página 1 até 8, isso é 7 cliques sequenciais com delay de servidor em cada. Sem salto direto.

**Proposta:** padrão simples com números visíveis:
```
[Anterior] [1] [2] [3] ... [8] [Próxima]
```
Páginas visíveis: 1, penúltima, última, atual-1, atual, atual+1 (com ellipsis no meio). Components simples.

Alternativa: substituir paginação por "carregar mais" (infinite scroll com botão). Mais alinhado com mobile/55+ que não entende paginação clássica.

**Esforço:** S | **Impacto:** S

---

## BAIXO

### 19. `observacao` label com espaço extra e sem `<br/>` ou `sr-only`

**Arquivo:** `components/viagens/ViagemForm.tsx:487`

```jsx
<label htmlFor="observacao" ...>
  Observação        </label>
```

Tem 8 espaços em branco antes do `</label>`. Provavelmente não causa bug visual mas é sinal de copy-paste ou erro de encoding. Encontrei por acaso.

**Proposta:** limpar o whitespace. Baixo impacto, sinal de falta de lint.

**Esforço:** S | **Impacto:** S

---

### 20. Cursor autocomplete (`CidadeAutocomplete`) sem keyboard navigation completa

**Arquivo:** `components/ui/CidadeAutocomplete.tsx` (verificado por referência)

**Problema:** autocompletes customizados tipicamente têm bugs de tab/esc/arrow. Sem fazer leitura completa, só pelo padrão do projeto (todos os popovers usam manual `useState`), provável que faltam:
- Arrow up/down pra navegar lista
- Enter pra selecionar
- Esc pra fechar
- Tab sair do campo sem selecionar
- aria-activedescendant

**Proposta:** usar `Combobox` do Radix UI ou Headless UI. Código se reduz, a11y fica correta.

**Esforço:** M | **Impacto:** S (afeta formulários, mas autocomplete é só bônus)

---

### 21. Toggle de tema acessível mas sem preferência salva explicitamente visível

**Arquivo:** `components/ui/ThemeToggle.tsx` (referenciado em layout.tsx:221)

**Problema:** Tema toggle existe. Mas a regra do projeto é "dark mode rigor, tokens obrigatórios". Uma validação visual do toggle (três modos: Claro / Escuro / Sistema) ajuda o 55+ que esquece que configurou sistema pra dark e não entende porque "às vezes" o site fica escuro.

**Proposta:** toggle virar `<select>` com 3 opções (light / dark / system) ou um grupo de 3 botões. Hoje é provavelmente ícone-só-binário.

**Esforço:** S | **Impacto:** S

---

# Recomendações estratégicas (não priorizadas numericamente)

## R1. Criar um "design system log" interno

Um arquivo `docs/design-system.md` que documenta decisões de design ativas, proibições (`bg-alert-*-bg0`, `amber-100`, strings sem acento) e o mapa de tokens. Versionado. Revisado a cada story que toca UI.

## R2. Lint de UI como quality gate

ESLint plugin custom ou regras existentes:
- `jsx-a11y/*` pra acessibilidade
- Custom: proibir `className` contendo `\bamber-|\bslate-|\bgray-|\bred-` fora de `globals.css`
- Custom: proibir strings sem acento do dicionário crítico

Roda no pre-commit. Quebra o build se violar.

## R3. Adotar Radix UI (ou Headless UI) pras primitivas complexas

Especificamente: `Combobox`, `Select`, `Dialog` (pra quando tiver que ser modal mesmo), `Popover` (pra tooltips ricos), `DropdownMenu` (pro OverflowMenu). O projeto hoje tem todos esses "on-rolls" via `useState + clickOutside`. Migrar reduz código, melhora a11y de graça, e alinha com stack moderno de React 19 + Next 16.

## R4. Component library interna mínima

Cards repetem estrutura (border + bg + padding + header + body). Criar `<Card>`, `<CardHeader>`, `<CardBody>` como abstração. Mesmo pros inputs: `<Field label error>` wrapper que padroniza label + erro + hint.

## R5. Regression visual (Percy/Chromatic)

FrotaViva está em produção com Lighthouse 98. Dark mode tem dívida técnica acumulada (pontos 2 e 3). Sem visual regression, cada commit pode quebrar um card em dark mode e ninguém percebe. Percy no CI resolve isso.

---

# Roadmap sugerido (ordem de execução)

**Sprint 1 (1 semana, mata o fogo):**
1. Ponto 1 — `bg-alert-*-bg0` (S, crítico, quick win)
2. Ponto 5 — acentuação PT-BR (M, alto visual)
3. Ponto 19 — limpar whitespace observacao (S, trivial)
4. Ponto 9 — OnboardingBar não-portal (S)

**Sprint 2 (1 semana, consolidação):**
5. Ponto 3 — escala primary-* completa (M)
6. Ponto 4 — modal fixed-inset-0 viagens (S)
7. Ponto 6 — ações mobile vs desktop viagens (M)
8. Ponto 7 — BI Hero KPI hierarquia (M)

**Sprint 3 (retrabalho profundo):**
9. Ponto 2 — tokens de badge + substituição (L)
10. Ponto 10 — acessibilidade aria/role (M)
11. Ponto 11 — empresa switcher (M)
12. Pontos 12-17 — consolidações de padrão (M cada)

**Em paralelo (sempre-on):**
- R2 — lint como quality gate
- R5 — regression visual

---

# Considerações finais

FrotaViva é um produto live, com métricas boas (Lighthouse 98), arquitetura sensata, e um time pequeno. Os problemas encontrados são característicos de produto em crescimento: dívida pontual que não bloqueia, mas corrói lentamente. A recomendação não é redesign mas **higienização metodica + rigor de sistema**.

O público 55+ é exigente em formas não óbvias: eles notam "Saida" sem acento mais do que notariam um botão em cor errada. Notam quando uma sidebar "some" mas adaptam em silêncio. Notam quando a resposta demora 1 segundo a mais. Os 21 pontos listados aqui são, em agregado, o que diferencia "software que funciona" de "software que o meu pai consegue usar sem me ligar".

Nenhuma das mudanças propostas exige redesign da identidade visual do FrotaViva. Todas respeitam a paleta navy `#1B3A4B` + verde `#2D6A4F` + warm surfaces. O esforço total estimado é ~2 sprints de um dev frontend + meia sprint pra QA visual.

---

*Auditoria gerada por Uma (AIOX UX Design Expert), sem execução de código, sem modificações no codebase.*
