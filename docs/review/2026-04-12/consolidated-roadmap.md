# Roadmap Consolidado FrotaViva - Pos Auditoria Multi-Agente

**Data:** 2026-04-12
**Consolidador:** Bob (AIOX PM Strategist)
**Inputs:** 5 auditorias paralelas (@architect, @data-engineer, @ux-design-expert, @analyst, @qa)
**Total de achados brutos:** 109 (25 arq + 25 db + 21 ux + 22 comp + 25 qa - 9 em execucao pelo @devops = ~100 unicos)
**Produto:** FrotaViva, SaaS vertical de gestao de frotas para cegonheiros brasileiros
**Status:** pre-launch, deploy live em https://siga-bem-rosy.vercel.app, aguardando piloto real

> **ADDENDUM 2026-04-14:** Auditoria complementar executada por 3 agentes paralelos (cyber-chief + data-engineer + devops) encontrou 29 achados novos. Dos 29, 24 sao genuinamente novos (nao cobertos pelo roadmap original) e 5 sao extensoes de itens existentes. Alem disso, usuario solicitou novo Epic L (Relatorios + Chamada) para faze-lo caber pre-piloto. Ver secao [Addendum 2026-04-14](#addendum-2026-04-14) logo apos o resumo executivo.

---

## Indice

1. [Resumo Executivo](#resumo-executivo)
2. [Top 10 Acoes Priorizadas](#top-10-acoes-priorizadas)
3. [BLOCO FIRE em Execucao pelo DevOps](#bloco-fire-em-execucao-pelo-devops)
4. [Epics Consolidados](#epics-consolidados)
   - [Epic A - Seguranca e Integridade](#epic-a-seguranca-e-integridade-de-dados-em-execucao-pelo-devops)
   - [Epic B - Refatoracao Arquitetural](#epic-b-refatoracao-arquitetural-multi-empresa)
   - [Epic C - Rigor Dark Mode e Design System](#epic-c-rigor-dark-mode-e-design-system)
   - [Epic D - Padronizacao de Fluxos Destrutivos](#epic-d-padronizacao-de-fluxos-destrutivos)
   - [Epic E - Acertos de Conta v2](#epic-e-acertos-de-conta-v2-avulso-periodo-auto-form-reduzido)
   - [Epic F - Cobertura de Testes e CI/CD](#epic-f-cobertura-de-testes-e-cicd)
   - [Epic G - Compliance PT-BR e Acessibilidade](#epic-g-compliance-pt-br-e-acessibilidade)
   - [Epic H - Observability e Audit Trail](#epic-h-observability-e-audit-trail)
   - [Epic I - Go-To-Market e Posicionamento](#epic-i-go-to-market-e-posicionamento)
   - [Epic J - Diferenciacao Competitiva](#epic-j-diferenciacao-competitiva-do-nicho)
5. [Matriz Impacto x Esforco](#matriz-impacto-x-esforco-consolidada)
6. [Dependencias Entre Epics](#dependencias-entre-epics)
7. [Sequenciamento em Sprints](#sequenciamento-em-sprints-6-semanas-pre-piloto)
8. [Tabela Resumo de Todos os Itens](#tabela-resumo-de-todos-os-itens-consolidados)
9. [Riscos e Trade-offs](#riscos-e-trade-offs)
10. [Proximos Passos](#proximos-passos-recomendados)
11. [Addendum 2026-04-14](#addendum-2026-04-14)

---

## Resumo Executivo

O FrotaViva e um produto live, tecnicamente maduro (Lighthouse 98, 24 migrations, Sentry, CI/CD) e estrategicamente posicionado num oceano azul real (nenhum concorrente faz SaaS operacional verticalizado para cegonheiro autonomo). As 5 auditorias paralelas revelaram 109 achados brutos que, apos deduplicacao, se consolidam em 10 epics tematicos e ~60 itens acionaveis.

**Os achados se agrupam em tres narrativas dominantes:**

1. **Seguranca de dados** (foco do @devops no BLOCO FIRE): JWT service_role commitado, policies duplicadas de storage cross-tenant, TOCTOU no multi-empresa, fn_calcular_fechamento bypassando validacao de empresa. Tudo ja em execucao.
2. **Divida tecnica acumulada no multi-empresa**: duplicacao massiva actions.ts vs multi-actions.ts (~4.450 linhas gemelas), naming mentiroso, dead code, tipos placeholder, 62 `as unknown as` para contornar tipos nao gerados. Mesmo tema atinge BI, UX (cores quebradas) e QA (zero teste em multi).
3. **Prontidao para piloto real**: CI quebrado desde 31/03, zero testes em server actions financeiras, upload sem validacao server-side, classes Tailwind zumbi em navegacao, regra "sem popups" violada em 6 lugares, 84 strings sem acentuacao PT-BR.

**Narrativa competitiva adicional** (fora do tecnico): o FrotaViva esta reposicionado errado. O concorrente real nao e a Cobli, e o Excel. O messaging "mais barato que Cobli" nao converte; "acabou planilha" converte. SINACEG (1.300 empresas, Feira anual, Revista Cegonheiro) e o canal de distribuicao perfeito e totalmente inexplorado. ANTT Resolucao 6068/2025 criou janela de compliance RNTRC que nenhum concorrente atende.

**Timeline para piloto real:** 4-6 semanas. Sprint 1 ja comeca com o BLOCO FIRE em paralelo (DevOps). Sprints 2-4 consolidam Epic B (arquitetura), Epic C (design system), Epic F (testes minimos) e Epic D (fluxos destrutivos). Sprint 5 entrega Epic E (acertos v2, decisao ja tomada). Sprint 6 fecha com Epic G (PT-BR) e Epic H (observability minima). Epics I e J sao pos-piloto (60+ dias em producao).

**Recomendacao estrategica central:** nao tentar fazer tudo antes do piloto. Usar o piloto como filtro de realidade. Os 10 P1 listados abaixo sao o minimo inegociavel para o tio do Guilherme testar o produto com 1-2 cegonhas sem risco de prejuizo financeiro. Todo o resto e melhoria continua.

---

## Top 10 Acoes Priorizadas

Cinco pontos de seguranca ja estao em execucao pelo @devops (listados em [BLOCO FIRE](#bloco-fire-em-execucao-pelo-devops)). O top 10 abaixo lista o que o time PRECISA executar alem do FIRE.

| # | Acao | Epic | Prioridade | Impacto/Esforco | Origem |
|---|------|------|------------|-----------------|--------|
| 1 | Consertar CI (working-directory, rodar jest) e adicionar branch protection em main | F | P1 | L/S | @qa #1 |
| 2 | Corrigir typecheck (2 erros VeiculoForm) + lint (9 erros) + pre-commit hook | F | P1 | L/S | @qa #2 |
| 3 | Gerar tipos Supabase e consolidar tipos Usuario duplicados | B | P1 | L/M | @arch #4, @db #8 |
| 4 | Acentuacao PT-BR em 84 strings visiveis (+ lint rule custom) | G | P1 | M/M | @ux #5 |
| 5 | Testes de integracao para RLS (suite minima com supabase local) | F | P1 | L/L | @arch #15, @qa #18 |
| 6 | Testes de fechamentos (logica de dinheiro, zero cobertura hoje) | F | P1 | L/L | @qa #5 |
| 7 | Sentry.captureException em server actions criticas + logger estruturado | H | P1 | L/M | @qa #7 |
| 8 | Padronizar fluxos destrutivos inline (eliminar modal fixed-inset-0) | D | P1 | M/S | @ux #4 |
| 9 | Unificar actions.ts vs multi-actions.ts via camada de repositorio | B | P1 | L/L | @arch #1, @arch #8 |
| 10 | Epic E - Acertos v2 (avulso + periodo auto + form reduzido) | E | P1 | L/M | @db #12 + decisao do usuario |

---

## BLOCO FIRE em Execucao pelo DevOps

Estes itens ja estao sendo executados em paralelo pelo @devops. NAO entram no roadmap como trabalho novo. Ficam listados aqui para contexto e para garantir que nenhum outro item dependa deles sem ter ciencia.

| Item FIRE | Origem | Bloqueia |
|-----------|--------|----------|
| Rotacionar service_role JWT + limpar historico git | @db #1 | Nada adicional |
| Consertar CI (working-directory, jest, branch protection) | @qa #1 | Item #1 do Top 10 depende (na verdade e o mesmo item) |
| Migration consolidada: storage policies cross-tenant | @db #6 | Nada |
| Migration: fn_calcular_fechamento validar empresa_id | @db #9 | Nada |
| Migration: UNIQUE INDEX fechamento_item(referencia_id) WHERE tipo='viagem' | @db #7, @qa #10 | Epic E (acertos avulsos) precisa alterar esse index |
| Validacao server-side de upload (file.size, content-type) | @qa #3 | Nada |
| Revalidacao TOCTOU em queryMultiEmpresa | @db #2, @qa #6 | Nada |
| Fix classes Tailwind zumbi bg-alert-*-bg0 (5 locais) | @ux #1 | Nada |
| Stash/commit do diff pendente de fechamentos (pagos-only) | @arch #9 | Epic E precisa rebase |

**Observacao:** o item "consertar CI" aparece no FIRE e no Top 10 porque e intersecao. E a mesma acao; listei duas vezes apenas para indicar que o item #1 do roadmap ja esta sendo trabalhado e nao gera esforco novo para o time de dev.

---

## Epics Consolidados

Os 10 epics abaixo agrupam os ~60 itens deduplicados em temas executaveis. Cada epic tem objetivo, escopo, esforco total, impacto esperado, dependencias, sprint sugerido e itens ordenados por prioridade.

---

### Epic A - Seguranca e Integridade de Dados (EM EXECUCAO PELO DEVOPS)

**Objetivo:** fechar vetores de vazamento cross-tenant, rotacionar credenciais, garantir integridade financeira minima para piloto real.
**Status:** 100% no BLOCO FIRE. Ver secao acima. Epic A existe apenas como placeholder de rastreamento.
**Itens:** 9 (todos em execucao pelo @devops, nao convertiveis em story pelo @po)
**Sprint sugerido:** Sprint 1 (em andamento agora)
**Impacto total:** L (bloqueador absoluto)
**Esforco total:** M (trabalho concentrado 3-5 dias do @devops)
**Risco:** rotacao de JWT pode causar downtime se nao coordenada com Vercel env. Mitigacao: devops ja ciente.

---

### Epic B - Refatoracao Arquitetural Multi-Empresa

**Objetivo:** eliminar a rachadura estrutural criada pelo multi-empresa (duplicacao actions.ts vs multi-actions.ts) e estabelecer camada de repositorio unica por dominio. Gerar tipos Supabase reais. Eliminar dead code e naming mentiroso.

**Escopo:** refactor mecanico nao-funcional. Zero mudanca de comportamento para o usuario final. Alto impacto na manutenibilidade, reduz drift silencioso entre modo single e multi, prepara terreno para Copilot e novas features.

**Itens (ordem de execucao sugerida):**

| Prio | Item | Impacto/Esforco | Origem |
|------|------|-----------------|--------|
| P1 | Gerar tipos Supabase (`npx supabase gen types`) e consolidar Usuario duplicado | L/M | @arch #4, @db #8 |
| P1 | Deletar dead code em `empresa/switch-actions.ts` | M/S | @arch #3 |
| P1 | Renomear `multi-actions.ts` para `multi-queries.ts` (ou mover para `lib/queries/`) | M/S | @arch #2 |
| P1 | Criar camada de repositorio unica em `lib/repositories/` por dominio (bi, fechamentos, viagens, dashboard) | L/L | @arch #1, @db #4 |
| P2 | Unificar branching `if (isMultiEmpresa)` em helper `fetchXxx()` dedicado | L/L | @arch #8 |
| P2 | Quebrar `bi/actions.ts` (2069 linhas) por dominio funcional (filters, kpis, margem, etc) | M/M | @arch #5 |
| P2 | Quebrar `fechamentos/actions.ts` (802 linhas) por responsabilidade | M/M | @arch #5 |
| P2 | Substituir 62 `as unknown as` por utility `singleRelation<T>()` | M/M | @arch #6 |
| P2 | Padronizar contratos de erro: `ReadResult<T>` e `MutationResult<T>` | M/M | @arch #7 |
| P3 | Remover `'use server'` de `lib/auth/get-user-role.ts` (query helper) | S/S | @arch #18 |
| P3 | Matcher do middleware inverso (proteger tudo, whitelist publicas) | M/S | @arch #20 |
| P3 | Eliminar getUser() duplicado no layout do dashboard | S/S | @arch #13 |

**Esforco total:** XL (3-4 semanas de 1 dev focado)
**Impacto:** L (reduz ~40% da superficie de actions, elimina classe inteira de bugs por divergencia silenciosa, habilita Copilot e novas features)
**Risco:** refactor sem testes e arriscado. DEPENDE de Epic F (testes minimos) ser concluido primeiro, pelo menos os de RLS e de fechamentos. Mitigar com feature flags ou merge gradual dominio por dominio.
**Dependencias:** Epic F (testes minimos de RLS e fechamentos precisam estar no ar antes)
**Sprint sugerido:** P1 em Sprint 2-3, P2 em Sprint 4-5, P3 em Sprint 6 ou backlog pos-piloto

---

### Epic C - Rigor Dark Mode e Design System

**Objetivo:** eliminar escape hatches de cores nativas do Tailwind, completar paleta primary-* em todos os shades usados, e estabelecer lint rule que previna regressao. Dark mode coerente em todas as telas.

**Escopo:** tematizacao. Zero mudanca funcional. Alto impacto em consistencia visual para o publico 55+ e em dark mode especificamente (que esta quebrado em varias badges e cards de BI).

**Itens:**

| Prio | Item | Impacto/Esforco | Origem |
|------|------|-----------------|--------|
| P1 | Adicionar escala completa primary-50 a 900 em `globals.css` (light + dark) | M/M | @ux #3 |
| P1 | Criar tokens `--color-badge-warning-bg/fg`, `-info-bg/fg`, `-neutral-bg/fg` | M/M | @ux #2 (parte 1) |
| P1 | Substituir 231 classes Tailwind nativas (amber-*, slate-*, red-*, gray-*) por tokens em 30+ componentes | L/M | @ux #2 (parte 2) |
| P1 | Lint rule ESLint custom: bloqueia `className` contendo `\b(amber\|slate\|gray\|red)-[0-9]+` fora de `globals.css` | M/S | @ux R2 |
| P2 | Refatorar BI Hero KPI (Card 1 Lucro vs Card 3 Receita): usar tipografia para hierarquia, nao cor | M/M | @ux #7 |
| P2 | Criar icon registry `components/ui/icons.tsx` (IconPlus, IconWarning, etc) para dedup dos SVG inlines | M/M | @ux #15 |
| P2 | Badge de status com icone + cor (redundancia para daltonico/baixa visao) | M/S | @ux #16 |
| P2 | Container `max-w-*` padronizado em `(dashboard)/layout.tsx` | S/S | @ux #17 |
| P2 | themeColor responsivo light/dark no viewport export | S/S | @arch #16 |
| P3 | OnboardingBar nao-portal (sticky top-0 dentro do main) | M/S | @ux #9 |
| P3 | Empty states estruturados (icon + titulo + subtitulo + CTA) reusaveis | M/S | @ux #14 |
| P3 | Tooltip via `<InfoTooltip/>` no BI Tendencia Mensal (remover `title=""` nativo) | S/S | @ux #8 |

**Esforco total:** L (2 semanas de 1 dev frontend)
**Impacto:** L (todo dark mode coerente, reducao drastica de "erosao visual" que afeta confianca do publico 55+)
**Risco:** substituicao mecanica de 231 classes pode quebrar algum estilo nao previsto. Mitigar com visual regression via Percy ou screenshots manuais de cada pagina antes/depois.
**Dependencias:** nenhuma. Pode rodar em paralelo com Epic B e F.
**Sprint sugerido:** P1 em Sprint 2, P2 em Sprint 3-4, P3 em Sprint 5+

---

### Epic D - Padronizacao de Fluxos Destrutivos

**Objetivo:** unificar padrao inline para todas as confirmacoes destrutivas, eliminar modais customizados `fixed-inset-0`, padronizar comportamento mobile e desktop na mesma acao.

**Escopo:** UX de 6 componentes especificos + regra arquitetural para novos componentes. Toca acoes de exclusao, invalidacao, trocas criticas.

**Itens:**

| Prio | Item | Impacto/Esforco | Origem |
|------|------|-----------------|--------|
| P1 | Excluir viagem: unificar padrao inline mobile e desktop (remover modal fixed-inset-0) | M/S | @ux #4 |
| P1 | Acoes mobile vs desktop em ViagemList: padronizar via OverflowMenu (`[...]`) em ambos | M/M | @ux #6 |
| P1 | ReceiptModal, CredenciaisModal, invite-modal: converter para inline ou pagina de detalhe | M/M | @ux #4 (extensao) |
| P2 | EmpresaSwitcher: separar single-switch (radio group) de multi-select (pagina dedicada `/empresas/multi-selecionar`) | M/M | @ux #11 |
| P2 | Tabela de fechamentos: linha inteira clicavel, tfoot com totalizadores, sort visivel | M/M | @ux #13 |
| P2 | Paginacao com numeros visiveis e salto direto (substituir Anterior/Proxima simples) | S/S | @ux #18 |
| P3 | ViagemForm: agrupar 10 campos em 3 fieldsets com legend | S/S | @ux #12 |
| P3 | CidadeAutocomplete: usar Radix Combobox para keyboard nav + a11y completa | S/M | @ux #20 |
| P3 | ThemeToggle com 3 modos (light/dark/system) explicitos | S/S | @ux #21 |

**Esforco total:** L (1.5 semanas)
**Impacto:** M (alinha com regra do usuario "sem popups", reduz atrito para publico 55+)
**Risco:** baixo. Mudancas sao locais por componente.
**Dependencias:** Epic C (tokens e icon registry precisam existir para renderizar bem os novos componentes inline).
**Sprint sugerido:** P1 em Sprint 3, P2 em Sprint 4, P3 em Sprint 5+

---

### Epic E - Acertos de Conta v2 (Avulso, Periodo Auto, Form Reduzido)

**Objetivo:** entregar a decisao ja tomada pelo usuario de ter acertos individuais (tipo `avulso` em fechamento_item) + pre-preenchimento automatico de periodo + form reduzido a preview+confirmar. Feature funcional, nao refactor.

**Escopo:** schema change + nova UX + novo fluxo. Principal feature funcional do pre-piloto. Decisao ja tomada, nao precisa mais elicitation.

**Itens:**

| Prio | Item | Impacto/Esforco | Origem |
|------|------|-----------------|--------|
| P1 | Migration: criar tipo ENUM `fechamento_item_tipo` com `avulso`, alterar CHECK, permitir `referencia_id` NULL para `avulso` | L/M | @db #12 |
| P1 | Ajustar UNIQUE INDEX uq_fi_viagem_unica para `WHERE tipo = 'viagem'` (compativel com avulso) | L/S | @db #7 (extensao) |
| P1 | Server action `criarAcertoAvulso(motorista_id, valor, descricao)` com validacao Zod | L/M | decisao do usuario |
| P1 | UX: novo form de acerto avulso reduzido a preview + confirmar (1 passo) | L/M | decisao do usuario |
| P1 | UX: "acertar todas pendentes de motorista" pre-preenche periodo automatico (data mais antiga a mais recente) | L/M | decisao do usuario |
| P2 | Suportar `valor` negativo em `fechamento_item` para acertos tipo "desconto" (ajustar CHECK + UX) | M/S | @db #12 (extensao) |
| P2 | Historico: audit trail do fluxo de acerto avulso (depende Epic H ou tabela dedicada) | M/S | cruzamento com @db #5 |

**Esforco total:** L (1 semana)
**Impacto:** L (feature principal que o usuario esta esperando para pre-launch, tocam a regra de negocio mais delicada do produto: dinheiro do motorista)
**Risco:** sem testes adequados, bug nessa area pode gerar pagamento em dobro ou em valor errado. **NAO PODE ser feita sem Epic F minimo (testes de fechamentos).**
**Dependencias:** Epic F (testes de fechamentos) + BLOCO FIRE (UNIQUE INDEX ja executado)
**Sprint sugerido:** Sprint 5 (apos testes de fechamento estarem no ar)

---

### Epic F - Cobertura de Testes e CI/CD

**Objetivo:** sair do estado "CI quebrado + zero teste em server actions" para um baseline minimo defensavel antes de piloto real. Pre-commit hook, quality gates ativos, testes de integracao de RLS, testes de fechamentos (dinheiro), Sentry com source maps.

**Escopo:** infraestrutura de teste + suite minima de integracao + hooks locais. E o epic mais critico para prevenir bug financeiro em producao.

**Itens:**

| Prio | Item | Impacto/Esforco | Origem |
|------|------|-----------------|--------|
| P1 | Consertar CI (remover `working-directory: apps/siga-bem`, adicionar `npm test`, habilitar branch protection) | L/S | @qa #1 |
| P1 | Corrigir 2 erros typecheck (VeiculoForm) + 9 lint errors (EmpresaSwitcher, GastoForm, GastoTable, etc) | L/S | @qa #2 |
| P1 | Pre-commit hook (husky): `typecheck && lint && test` | L/S | @qa #2 (extensao) |
| P1 | Suite de integracao RLS (supabase start local): cross-tenant negativo para viagem/gasto/fechamento/motorista/caminhao | L/L | @arch #15, @qa #18 |
| P1 | Testes de integracao para fechamentos: transicoes de status, overlap de periodo, divisao por percentual, edge cases aberto/fechado/pago | L/L | @qa #5 |
| P1 | Teste para `calcular_fechamento_total` + `aggregateKpis` (pure functions, facil) | M/S | @arch #15 |
| P1 | Snapshot test dos retornos de `getViagensPendentesAcerto` | M/S | @arch #15 |
| P2 | Sentry com `release: VERCEL_GIT_COMMIT_SHA` + source maps upload | L/M | @qa #13 |
| P2 | Suite E2E minima Playwright: login > criar viagem > concluir > fechar | L/L | @qa #17 |
| P2 | `@axe-core/cli` ou `axe-playwright` rodando em rotas publicas | M/M | @qa #12 |
| P2 | Test de manifesto PWA (parseable + campos obrigatorios) | S/S | @qa #20 |
| P3 | k6 ou artillery load test baseline (5 donos + 15 motoristas) | M/M | @qa #8 |
| P3 | Suite de performance: `Sentry.startSpan` manual em pontos quentes | M/M | @qa #15 |
| P3 | Visual regression (Percy/Chromatic) | M/L | @ux R5 |

**Esforco total:** XL (2 semanas concentradas)
**Impacto:** L (bloqueador absoluto para piloto real. Sem isso nao da para refatorar Epic B com seguranca, nao da para testar Epic E sem medo)
**Risco:** setup de supabase local para testes de RLS pode dar trabalho inicial. Mitigar com docker-compose dedicado.
**Dependencias:** BLOCO FIRE item CI. Depois disso, nada mais.
**Sprint sugerido:** P1 em Sprint 2 (junto com o FIRE), P2 em Sprint 4, P3 em Sprint 6+

---

### Epic G - Compliance PT-BR e Acessibilidade

**Objetivo:** eliminar strings sem acentuacao PT-BR em todos os textos visiveis, implementar lint custom para prevenir regressao, e cobrir acessibilidade minima (aria-label, role, landmarks) em 5 componentes criticos. Aderencia total a regra "publico 55+, zero jargao".

**Escopo:** higienizacao textual e acessibilidade basica. Alto impacto emocional no publico 55+ que le texto linearmente e "sente" palavras sem acento como erro.

**Itens:**

| Prio | Item | Impacto/Esforco | Origem |
|------|------|-----------------|--------|
| P1 | Auditar + substituir 84 strings sem acento (Saida, Situacao, Distancia, etc) em components/ e app/ | M/M | @ux #5 |
| P1 | Script `npm run check-ptbr` com dicionario de 30-40 palavras criticas, rodando em pre-commit | M/S | @ux #5 |
| P1 | Limpar whitespace na label observacao em ViagemForm | S/S | @ux #19 |
| P1 | Acessibilidade basica em 5 arquivos criticos: FechamentoList, ViagemList, BiKpiCards, BiTendenciaMensal, MobileSidebar | M/M | @ux #10 |
| P2 | Instalar `eslint-plugin-jsx-a11y` e rodar em todo `components/` | M/M | @ux R2 |
| P2 | Gerar todos componentes criticos com `role`, `aria-label`, `aria-live` padronizados | M/M | @ux #10 (extensao) |
| P3 | Documentar fluxo LGPD de anonimizacao de motorista (aparece no audit_log tambem) | S/S | @db #25 |

**Esforco total:** M (5-7 dias)
**Impacto:** M (publico 55+ sente isso diretamente. Alto impacto percebido, baixo custo)
**Risco:** baixo. Substituicao de strings e atomica.
**Dependencias:** nenhuma.
**Sprint sugerido:** P1 em Sprint 2-3 (paralelo a Epic C), P2 em Sprint 5, P3 backlog

---

### Epic H - Observability e Audit Trail

**Objetivo:** sair do estado "erros silenciosos em server actions, zero rastreio de mudancas criticas" para observabilidade minima operacional. Sentry capturando erros nas actions, logger estruturado, audit_log cobrindo fluxos de dinheiro e permissoes.

**Escopo:** infraestrutura de monitoramento + tabela audit_log + triggers. Permite operar o piloto com visibilidade real de falhas.

**Itens:**

| Prio | Item | Impacto/Esforco | Origem |
|------|------|-----------------|--------|
| P1 | Criar `lib/observability/logger.ts` com `logError(context, error)` chamando Sentry.captureException com tags (empresa_id, usuario_id, action) | L/M | @qa #7 |
| P1 | Instrumentar catch de todas actions criticas de fechamentos, viagens, gastos | L/M | @qa #7 (extensao) |
| P1 | Validacao central de env vars com Zod em `lib/env.ts`, chamado de `instrumentation.ts` | M/S | @arch #19 |
| P2 | Migration: criar tabela `audit_log` (empresa_id, usuario_id, tabela, registro_id, acao, valor_antes, valor_depois, ip, user_agent) + RLS append-only | M/L | @db #5 |
| P2 | Triggers PL/pgSQL para `fechamento.status`, `usuario_empresa.ativo/role`, `motorista.percentual_pagamento`, `empresa.plano_tipo` | M/M | @db #5 (extensao) |
| P2 | UI de audit log na pagina de configuracoes (dono/admin ve historico da empresa) | M/M | @db #5 (extensao) |
| P2 | Doc de arquitetura: `docs/architecture/auth-flow.md` explicando por que `getSession()` em middleware e ok | S/S | @arch #10 |
| P3 | fn_get_user_role e fn_get_empresa_id unificadas (usar apenas usuario_empresa como fonte) | M/M | @db #16 |
| P3 | Migrar para `getUser()` no middleware se o overhead for aceitavel (alternativa a manter `getSession()` + doc) | M/S | @db #15, @qa #8 |
| P3 | Corrigir timezone em queries com timestamps (append `-03:00` ou criar utility toBrtRange) | M/M | @db #18, @db #19 |
| P3 | Sentry disableLogger deprecation warning (migrar para API atual) | S/S | @arch #11 |

**Esforco total:** L (1.5 semanas)
**Impacto:** L (observability e bloqueador para operar piloto com visibilidade. Audit log e requisito LGPD + prepara story "Gestor Fase 2" do backlog)
**Risco:** medio. Triggers de audit podem gerar latencia se nao forem bem indexados. Mitigar com indice `(empresa_id, created_at DESC)`.
**Dependencias:** BLOCO FIRE (rotacao de service_role deve ja estar concluida antes de mexer em logger central).
**Sprint sugerido:** P1 em Sprint 3, P2 em Sprint 4-5, P3 pos-piloto

---

### Epic I - Go-To-Market e Posicionamento

**Objetivo:** reposicionar FrotaViva no messaging correto (substitui planilha, nao "mais barato que Cobli"), estabelecer parceria SINACEG como canal de distribuicao principal, criar modulo RNTRC como feature killer unica no mercado.

**Escopo:** estrategia comercial + copy + modulo novo (compliance RNTRC) + presenca em eventos. E o epic que transforma produto tecnico em negocio viavel.

**Itens:**

| Prio | Item | Impacto/Esforco | Origem |
|------|------|-----------------|--------|
| P1 | Reposicionamento copy: remover "mais barato que X", trocar por "acabou planilha", "RNTRC em dia", "benchmark do setor" | L/S | @analyst INS-03, INS-22 |
| P1 | Dominio frotaviva.com.br + marca INPI (higiene legal) | S/S | @analyst INS-21 |
| P2 | Landing pages verticalizadas por ICP: "FrotaViva para cegonheiro autonomo", "para transportadora 0km" | L/S | @analyst INS-02 |
| P2 | Parceria SINACEG: reuniao comercial + material + plano "Associado SINACEG" com desconto | L/M | @analyst INS-01 |
| P2 | Presenca Feira dos Cegonheiros 2026 (estande com calculadora de benchmark publica) | L/M | @analyst INS-01, INS-08 |
| P2 | Modulo RNTRC em dia: tela de status de RNTRC por veiculo, vencimentos, 3 seguros obrigatorios, alertas 60/30/7 dias | L/M | @analyst INS-04 |
| P2 | Revisao freemium: 2 veiculos (nao 3) + gates de feature (benchmarking, alertas, multi-empresa, Copilot sao premium) | L/M | @analyst INS-07 |
| P2 | Plano anual com 20% off em billing + copy | M/S | @analyst INS-16 |
| P3 | Campanha Instagram + WhatsApp + grupos SINACEG (social media manager + budget mini) | M/M | @analyst INS-13 |
| P3 | Calculadoras publicas SEO: `/calc/frete-cegonha`, `/calc/acerto-viagem`, `/calc/km-litro` | M/M | @analyst INS-14 |
| P3 | Campanha benchmarking: pagina publica `/benchmark` + posts semanais "voce esta acima ou abaixo?" | M/M | @analyst INS-08 |
| P3 | Importador de planilhas Excel (lead magnet "acabou planilha") | M/M | @analyst INS-03 (extensao) |

**Esforco total:** XL (6-8 semanas, mas espalhado pos-piloto)
**Impacto:** L (estrategico, diferencia FrotaViva do Excel e posiciona no oceano azul real)
**Risco:** alto em dependencia de terceiros (SINACEG pode nao topar, Feira e em data fixa). Mitigar com fallback de aquisicao direta via Instagram e Google Ads.
**Dependencias:** produto estavel pos-piloto (Epics A-F concluidos). Marketing so faz sentido apos sprint 5-6.
**Sprint sugerido:** P1 em Sprint 2 (copy e dominio sao baratos), P2 em Sprint 6 (pos-piloto), P3 pos-launch

---

### Epic J - Diferenciacao Competitiva do Nicho

**Objetivo:** entregar features que sao unicas no mercado vertical de cegonheiro e que o publico pede (ficha de cegonha, calculadora de frete, vistoria digital, P&L por viagem). Transformar FrotaViva de "app de gestao" em "o unico app feito para cegonheiro".

**Escopo:** features novas, nao refactor. Cada item e uma story ou epic funcional proprio.

**Itens:**

| Prio | Item | Impacto/Esforco | Origem |
|------|------|-----------------|--------|
| P2 | Ficha de caminhao cegonha: campo `configuracao_cegonha` (posicoes, tipo_carreta, restricao_0km, altura, peso max por posicao) | L/S | @analyst INS-05 |
| P2 | Calculadora de frete cegonha: inputs origem/destino/N veiculos/tipo/FIPE, output preco sugerido baseado em tabela ANTT + historico | L/M | @analyst INS-06 |
| P2 | Dashboard P&L por viagem: tela `/viagens/[id]/resumo` com Receita, Custos diretos/indiretos, Lucro liquido, margem, comparativo | L/M | @analyst INS-12 |
| P2 | Link de rastreador BYOD por caminhao (campo "link do rastreador" abre em nova aba) | L/S | @analyst INS-11 |
| P3 | Vistoria digital de entrega: fotos obrigatorias (4 angulos), anotador de avaria, assinatura cliente via QR, PDF de recibo | L/M | @analyst INS-09 |
| P3 | Integracao API readonly Cobli/Omnilink para puxar km automatico | L/M | @analyst INS-11 (extensao) |
| P3 | Campo "numero CT-e" vinculavel a viagem + integracao futura com emissores populares (Bsoft, SYGMA) | L/S | @analyst INS-10 |
| P3 | Expansao ICP seminovo: copy "para quem transporta usados tambem" | M/S | @analyst INS-19 |
| P3 | Sensor de anomalia k-anonymity guard (min 5 empresas no benchmark setor) | M/S | @db #21 |

**Esforco total:** XL (espalhado ao longo de 3-6 meses pos-piloto)
**Impacto:** L (diferenciacao competitiva real, justifica pricing e hook de vendas)
**Risco:** alto de scope creep. Cada item pode virar mini-projeto. Mitigar com timeboxing rigido por item.
**Dependencias:** Epics A-H concluidos. Epic J e 100% pos-piloto.
**Sprint sugerido:** pos-piloto (60-180 dias)

---

## Matriz Impacto x Esforco Consolidada

Metrica: primeiro letra e impacto (S/M/L), segunda e esforco (S/M/L). Ideal: LS (alto impacto, baixo esforco). Evitar: SL (baixo impacto, alto esforco).

### Quadrante Alto Impacto / Baixo Esforco (fazer primeiro)

| Item | Epic | Classificacao |
|------|------|---------------|
| Consertar CI | F | LS |
| Fix typecheck + lint + pre-commit hook | F | LS |
| Deletar dead code switch-actions.ts | B | MS |
| Renomear multi-actions.ts | B | MS |
| Excluir viagem inline (sem modal) | D | MS |
| Dominio + marca INPI | I | MS |
| Reposicionamento copy "acabou planilha" | I | LS |
| Validacao central env vars com Zod | H | MS |
| Matcher middleware inverso | B | MS |
| Limpeza whitespace observacao | G | SS |

### Quadrante Alto Impacto / Esforco Medio-Alto (fazer em seguida)

| Item | Epic | Classificacao |
|------|------|---------------|
| Gerar tipos Supabase + consolidar Usuario | B | LM |
| Camada de repositorio unica (refactor multi-empresa) | B | LL |
| Suite RLS + fechamentos (testes integracao) | F | LL |
| Sentry em server actions + logger | H | LM |
| Acentuacao PT-BR 84 strings + lint custom | G | MM |
| Tokens de badge + substituicao 231 classes | C | LM |
| Escala primary-50 a 900 completa | C | MM |
| Epic E inteiro (acertos avulsos) | E | LM |
| Audit log + triggers | H | ML |
| Sentry release tracking + source maps | F | LM |

### Quadrante Baixo Impacto / Qualquer Esforco (backlog)

| Item | Epic | Classificacao |
|------|------|---------------|
| Scripts inline para next/script (SW) | (arch #17) | SS |
| tsconfig ES2017 para ES2022 | (arch #22) | SS |
| Comentario com em-dash em multi-empresa | (qa #21) | SS |
| Number() || 0 em varios lugares | (qa #22) | SS |
| lighthouse-*.json no gitignore | (arch #21, qa #9) | SS |
| ThemeToggle 3 modos | D | SS |
| Pagination com numeros visiveis | D | SS |
| Container max-w padronizado | C | SS |

---

## Dependencias Entre Epics

```
BLOCO FIRE (em execucao @devops)
    |
    +--> Epic F (testes + CI)
    |       |
    |       +--> Epic B (refactor arquitetural, precisa de testes antes)
    |       +--> Epic E (acertos v2, precisa de testes de fechamento)
    |       +--> Epic H (observability, precisa de CI para validar)
    |
    +--> Epic C (design system, independente)
    |       |
    |       +--> Epic D (fluxos destrutivos, precisa de tokens e icons)
    |
    +--> Epic G (PT-BR + a11y, independente mas paralelo a C)
    |
    +--> Epic I (GTM, precisa produto estavel = apos Epic F)
            |
            +--> Epic J (diferenciacao, apos piloto real)
```

**Caminho critico:** FIRE -> Epic F -> Epic B -> Epic E. Este e o backbone tecnico para o piloto real.

**Caminhos paralelos:**
- Epic C -> Epic D (visual + UX destrutiva)
- Epic G (PT-BR) roda independente
- Epic H (observability) depende so do FIRE para comecar

**Epics pos-piloto:** I, J (podem comecar so apos piloto validado)

---

## Sequenciamento em Sprints (6 semanas pre-piloto)

Premissa: 1 dev full-time + 0.5 dev para UX/design + devops em paralelo. Piloto real com tio do Guilherme comeca Sprint 7 (semana 7).

### Sprint 1 (semana 1 - ja em andamento)

- **DevOps:** 100% BLOCO FIRE (rotacao JWT, CI, storage policies, fn_calcular_fechamento, UNIQUE INDEX, upload validation, TOCTOU multi-empresa, fix classes zumbi, stash diff)
- **Dev frontend:** backlog housekeeping (lighthouse gitignore, tsconfig ES2022, next/script SW)
- **PM:** finalizar este roadmap, entregar para @po converter em stories

### Sprint 2 (semana 2)

- **Dev:** Epic F P1 (consertar CI real, corrigir typecheck + lint, pre-commit hook, iniciar suite RLS)
- **Dev:** Epic B P1 (gerar tipos Supabase, consolidar Usuario, deletar dead code, renomear multi-actions)
- **UX/Design:** Epic C P1 (tokens primary-50 a 900 + tokens badge)
- **UX/Design:** Epic G P1 (auditoria de 84 strings sem acento, script check-ptbr)

### Sprint 3 (semana 3)

- **Dev:** Epic F P1 continuacao (testes RLS + testes fechamentos)
- **Dev:** Epic B P1 (iniciar camada de repositorio - comecar por fechamentos que e area mais sensivel)
- **UX/Design:** Epic C P1 (substituir 231 classes Tailwind, lint rule ESLint custom)
- **UX/Design:** Epic D P1 (unificar exclusao inline de viagem + outros modais em um comp reusavel)
- **Dev:** Epic H P1 (logger estruturado + Sentry.captureException em actions criticas, env vars com Zod)

### Sprint 4 (semana 4)

- **Dev:** Epic B P2 (unificar branching multi-empresa em helper, quebrar bi/actions.ts por dominio)
- **Dev:** Epic F P2 (Sentry release + source maps, Playwright E2E minimo)
- **UX/Design:** Epic D P1-P2 (OverflowMenu mobile + desktop, EmpresaSwitcher separado single vs multi)
- **UX/Design:** Epic C P2 (refatorar BI Hero KPI, icon registry)
- **Dev:** Epic H P2 (migration audit_log + triggers PL/pgSQL)

### Sprint 5 (semana 5)

- **Dev:** Epic E 100% (acertos avulsos: migration enum, server action, form reduzido, periodo auto)
- **Dev:** Epic B P2 (as unknown as -> utility, contratos de erro padronizados)
- **UX/Design:** Epic C P3 (OnboardingBar, empty states, badges com icone)
- **UX/Design:** Epic G P2 (jsx-a11y lint + aria em 5 componentes criticos)

### Sprint 6 (semana 6 - congelamento pre-piloto)

- **Dev:** smoke test completo via checklist manual de QA (30 itens do @qa)
- **Dev:** correcao de bugs encontrados no smoke
- **UX/Design:** pequenos polimentos visuais
- **DevOps:** garantir Sentry esta capturando, audit_log funciona, CI esta verde ha 1 semana
- **PM:** kick-off do piloto real com tio do Guilherme, definir meta de metricas (1-2 cegonhas, 1 motorista real, 2 semanas de teste)

### Sprint 7+ (piloto real comeca)

- Operacao em producao com frota real
- Monitorar Sentry + audit_log para pegar incidentes
- Iterar em cima de feedback real, nao teorico
- Epics I, J comecam apos 2 semanas de piloto estavel

---

## Tabela Resumo de Todos os Itens Consolidados

Legenda P0/P1/P2/P3:
- **P0:** em execucao pelo @devops (BLOCO FIRE)
- **P1:** pre-piloto, bloqueante
- **P2:** primeiros 60 dias pos-piloto
- **P3:** backlog estrategico 90+ dias

| # | Item | Epic | Prio | Impacto/Esforco | Origem |
|---|------|------|------|-----------------|--------|
| 1 | Rotacionar service_role JWT + limpar historico git | A | P0 | L/M | @db #1 |
| 2 | Consertar CI (working-directory, jest, branch protection) | A/F | P0 | L/S | @qa #1 |
| 3 | Migration storage policies cross-tenant consolidada | A | P0 | L/S | @db #6 |
| 4 | Migration fn_calcular_fechamento validar empresa_id | A | P0 | L/S | @db #9 |
| 5 | Migration UNIQUE INDEX fechamento_item viagem | A | P0 | L/S | @db #7, @qa #10 |
| 6 | Validacao server-side de upload (file.size, content-type) | A | P0 | M/S | @qa #3 |
| 7 | Revalidacao TOCTOU em queryMultiEmpresa | A | P0 | M/S | @db #2, @qa #6 |
| 8 | Fix classes Tailwind zumbi bg-alert-*-bg0 (5 locais) | A | P0 | M/S | @ux #1 |
| 9 | Stash/commit diff pendente fechamentos (pagos-only) | A | P0 | - | @arch #9 |
| 10 | Corrigir 2 erros typecheck VeiculoForm + 9 lint errors | F | P1 | L/S | @qa #2 |
| 11 | Pre-commit hook (husky) com typecheck + lint + test | F | P1 | L/S | @qa #2 |
| 12 | Gerar tipos Supabase + consolidar Usuario | B | P1 | L/M | @arch #4, @db #8 |
| 13 | Deletar dead code empresa/switch-actions.ts | B | P1 | M/S | @arch #3 |
| 14 | Renomear multi-actions.ts para multi-queries.ts | B | P1 | M/S | @arch #2 |
| 15 | Camada de repositorio unica (bi, fechamentos, viagens, dashboard) | B | P1 | L/L | @arch #1, @db #4 |
| 16 | Suite integracao RLS (supabase local + cross-tenant negativos) | F | P1 | L/L | @arch #15, @qa #18 |
| 17 | Testes integracao fechamentos (dinheiro, status, overlap, percentuais) | F | P1 | L/L | @qa #5 |
| 18 | Teste puro de calcular_fechamento_total + aggregateKpis | F | P1 | M/S | @arch #15 |
| 19 | Snapshot test de getViagensPendentesAcerto | F | P1 | M/S | @arch #15 |
| 20 | Lib logger estruturado + Sentry.captureException em actions criticas | H | P1 | L/M | @qa #7 |
| 21 | Validacao central env vars Zod em lib/env.ts | H | P1 | M/S | @arch #19 |
| 22 | Escala completa primary-50 a 900 em globals.css | C | P1 | M/M | @ux #3 |
| 23 | Tokens badge warning/info/neutral + substituir 231 classes | C | P1 | L/M | @ux #2 |
| 24 | Lint rule ESLint custom bloqueando cores Tailwind nativas | C | P1 | M/S | @ux R2 |
| 25 | Excluir viagem inline unificado mobile + desktop | D | P1 | M/S | @ux #4 |
| 26 | Acoes ViagemList via OverflowMenu mobile + desktop | D | P1 | M/M | @ux #6 |
| 27 | Converter ReceiptModal, CredenciaisModal, invite-modal para inline | D | P1 | M/M | @ux #4 (ext) |
| 28 | Auditar + substituir 84 strings sem acentuacao PT-BR | G | P1 | M/M | @ux #5 |
| 29 | Script check-ptbr com dicionario em pre-commit | G | P1 | M/S | @ux #5 (ext) |
| 30 | Limpar whitespace label observacao ViagemForm | G | P1 | S/S | @ux #19 |
| 31 | Acessibilidade basica em 5 arquivos criticos | G | P1 | M/M | @ux #10 |
| 32 | Matcher middleware inverso (whitelist publicas) | B | P1 | M/S | @arch #20 |
| 33 | Remover getUser() duplicado no dashboard layout | B | P1 | S/S | @arch #13 |
| 34 | Migration enum fechamento_item_tipo + avulso + ref_id nullable | E | P1 | L/M | @db #12 |
| 35 | Ajustar UNIQUE INDEX uq_fi_viagem_unica para compatibilidade avulso | E | P1 | L/S | @db #7 (ext) |
| 36 | Server action criarAcertoAvulso com Zod | E | P1 | L/M | decisao usuario |
| 37 | UX novo form acerto avulso reduzido a preview + confirmar | E | P1 | L/M | decisao usuario |
| 38 | UX acertar todas pendentes com periodo automatico pre-preenchido | E | P1 | L/M | decisao usuario |
| 39 | Reposicionamento copy "acabou planilha", remover "mais barato que X" | I | P1 | L/S | @analyst INS-03, INS-22 |
| 40 | Dominio frotaviva.com.br + abertura de processo INPI | I | P1 | S/S | @analyst INS-21 |
| 41 | Unificar branching if (isMultiEmpresa) em helper fetchXxx | B | P2 | L/L | @arch #8 |
| 42 | Quebrar bi/actions.ts por dominio funcional | B | P2 | M/M | @arch #5 |
| 43 | Quebrar fechamentos/actions.ts por responsabilidade | B | P2 | M/M | @arch #5 |
| 44 | Substituir 62 as unknown as por singleRelation utility | B | P2 | M/M | @arch #6 |
| 45 | Padronizar contratos de erro ReadResult vs MutationResult | B | P2 | M/M | @arch #7 |
| 46 | Refatorar BI Hero KPI com tipografia para hierarquia | C | P2 | M/M | @ux #7 |
| 47 | Icon registry components/ui/icons.tsx | C | P2 | M/M | @ux #15 |
| 48 | Badges de status com icone + cor (redundancia a11y) | C | P2 | M/S | @ux #16 |
| 49 | Container max-w padronizado em (dashboard)/layout | C | P2 | S/S | @ux #17 |
| 50 | themeColor responsivo light/dark no viewport export | C | P2 | S/S | @arch #16 |
| 51 | EmpresaSwitcher separar single-switch vs multi-select | D | P2 | M/M | @ux #11 |
| 52 | Tabela fechamentos linha clicavel + tfoot totalizador + sort | D | P2 | M/M | @ux #13 |
| 53 | Paginacao com numeros visiveis e salto direto | D | P2 | S/S | @ux #18 |
| 54 | Sentry release VERCEL_GIT_COMMIT_SHA + source maps upload | F | P2 | L/M | @qa #13 |
| 55 | E2E Playwright minimo (login > viagem > fechar) | F | P2 | L/L | @qa #17 |
| 56 | axe-core/cli em rotas publicas | F | P2 | M/M | @qa #12 |
| 57 | Test de manifesto PWA parseable | F | P2 | S/S | @qa #20 |
| 58 | Migration audit_log + RLS append-only | H | P2 | M/L | @db #5 |
| 59 | Triggers PL/pgSQL para fechamento, usuario_empresa, motorista, empresa | H | P2 | M/M | @db #5 (ext) |
| 60 | UI de audit log na pagina de configuracoes | H | P2 | M/M | @db #5 (ext) |
| 61 | Doc arquitetura auth-flow.md | H | P2 | S/S | @arch #10 |
| 62 | ESLint plugin jsx-a11y em components/ | G | P2 | M/M | @ux R2 |
| 63 | aria-label, role, aria-live em componentes criticos | G | P2 | M/M | @ux #10 (ext) |
| 64 | Landing pages verticalizadas por ICP | I | P2 | L/S | @analyst INS-02 |
| 65 | Parceria SINACEG + presenca Feira 2026 | I | P2 | L/M | @analyst INS-01 |
| 66 | Modulo RNTRC em dia (status + vencimentos + seguros) | I | P2 | L/M | @analyst INS-04 |
| 67 | Revisar freemium (2 veiculos + feature gates) | I | P2 | L/M | @analyst INS-07 |
| 68 | Plano anual 20% off em billing + copy | I | P2 | M/S | @analyst INS-16 |
| 69 | Ficha de caminhao cegonha (posicoes, tipo, restricoes) | J | P2 | L/S | @analyst INS-05 |
| 70 | Calculadora de frete cegonha com FIPE + tabela ANTT | J | P2 | L/M | @analyst INS-06 |
| 71 | Dashboard P&L por viagem | J | P2 | L/M | @analyst INS-12 |
| 72 | Link rastreador BYOD por caminhao | J | P2 | L/S | @analyst INS-11 |
| 73 | Valor negativo em fechamento_item (descontos avulsos) | E | P2 | M/S | @db #12 (ext) |
| 74 | Historico de acerto avulso (cruzamento Epic H) | E | P2 | M/S | @db #5 cross |
| 75 | Remover 'use server' de get-user-role.ts | B | P3 | S/S | @arch #18 |
| 76 | OnboardingBar nao-portal (sticky top-0) | C | P3 | M/S | @ux #9 |
| 77 | Empty states estruturados reusaveis | C | P3 | M/S | @ux #14 |
| 78 | InfoTooltip customizado no BI Tendencia Mensal | C | P3 | S/S | @ux #8 |
| 79 | ViagemForm com fieldsets + legend | D | P3 | S/S | @ux #12 |
| 80 | Radix Combobox no CidadeAutocomplete | D | P3 | S/M | @ux #20 |
| 81 | ThemeToggle com 3 modos (light/dark/system) | D | P3 | S/S | @ux #21 |
| 82 | k6/artillery load test baseline | F | P3 | M/M | @qa #8 |
| 83 | Sentry.startSpan em pontos quentes | F | P3 | M/M | @qa #15 |
| 84 | Visual regression (Percy/Chromatic) | F | P3 | M/L | @ux R5 |
| 85 | fn_get_user_role unificar com fn_get_empresa_id | H | P3 | M/M | @db #16 |
| 86 | Migrar middleware para getUser() se aceitavel | H | P3 | M/S | @db #15 |
| 87 | Fix timezone queries timestamps (toBrtRange utility) | H | P3 | M/M | @db #18, @db #19 |
| 88 | Sentry disableLogger deprecation warning | H | P3 | S/S | @arch #11 |
| 89 | fn_refresh_benchmarking com k-anonymity guard | J | P3 | M/S | @db #21 |
| 90 | Campanha Instagram + WhatsApp + SINACEG grupos | I | P3 | M/M | @analyst INS-13 |
| 91 | Calculadoras publicas SEO | I | P3 | M/M | @analyst INS-14 |
| 92 | Pagina publica /benchmark + posts semanais | I | P3 | M/M | @analyst INS-08 |
| 93 | Importador de planilhas Excel (lead magnet) | I | P3 | M/M | @analyst INS-03 (ext) |
| 94 | Vistoria digital de entrega (fotos + avaria + PDF) | J | P3 | L/M | @analyst INS-09 |
| 95 | Integracao API readonly Cobli/Omnilink | J | P3 | L/M | @analyst INS-11 (ext) |
| 96 | Campo numero CT-e vinculavel a viagem | J | P3 | L/S | @analyst INS-10 |
| 97 | Expansao ICP seminovo (copy) | J | P3 | M/S | @analyst INS-19 |
| 98 | Doc fluxo LGPD anonimizacao motorista | G | P3 | S/S | @db #25 |
| 99 | Comentario em-dash em multi-empresa.ts | G | P3 | S/S | @qa #21 |
| 100 | Number() || 0 em varios lugares | B | P3 | S/S | @qa #22 |

**Total:** 100 itens consolidados (109 brutos - 9 duplicados entre auditorias).

---

## Riscos e Trade-offs

### Risco 1: Refactor arquitetural sem testes

**Contexto:** Epic B (unificacao actions vs multi-actions) mexe em ~4.450 linhas de codigo critico. Sem testes adequados (Epic F), qualquer refactor pode introduzir regressao financeira silenciosa no calculo de fechamentos, KPIs do BI ou agregacoes multi-empresa.

**Trade-off:** fazer Epic B antes de Epic F e 3x mais rapido mas 10x mais arriscado. Fazer Epic F antes adiciona 1 semana ao cronograma mas blinda o refactor.

**Recomendacao:** Epic F P1 (RLS + fechamentos) DEVE sair antes de Epic B P1 (camada de repositorio). Mesmo que isso signifique postpor Epic B parcialmente para Sprint 3. Nao ceder a pressao de "ja comecar a refatorar".

### Risco 2: Piloto com bugs financeiros e fatal para o publico 55+

**Contexto:** O publico alvo (donos de cegonha 40-60 anos, baixa familiaridade com tech) tem tolerancia zero a erro em dinheiro. Um fechamento errado e o fim da confianca no produto.

**Trade-off:** adiar piloto real para ter cobertura de testes completa (Epic F 100%) vs piloto com cobertura minima e rollback rapido (Sentry + audit log + tio como beta tester).

**Recomendacao:** combinar Epic F P1 (RLS + fechamentos) + Epic H P1 (Sentry em actions) + Epic E (acertos v2) antes do piloto. Nao precisa de Epic F P2-P3 (E2E, load test). O piloto com 1-2 cegonhas valida mais do que qualquer teste automatizado.

### Risco 3: Divida tecnica de UX e invisivel ate usuario reclamar

**Contexto:** 231 classes Tailwind quebradas em dark mode, 156 primary-* inexistentes, classes zumbi em navegacao. Dev nao percebe (nao quebra build). Usuario 55+ percebe e reclama.

**Trade-off:** priorizar fix visual (Epic C) vs priorizar refactor estrutural (Epic B). Epic C e mais percebido pelo usuario; Epic B e mais importante para manutencao futura.

**Recomendacao:** rodar Epic C e Epic B em paralelo. Sao domains disjuntos (CSS vs server actions). Um dev frontend cuida de C + G + D, outro dev cuida de B + F + H.

### Risco 4: SINACEG pode nao topar parceria

**Contexto:** Epic I P2 depende de reuniao comercial com SINACEG. E um canal concentrado mas politico. Se nao rolar, o plano GTM perde o canal principal.

**Trade-off:** apostar tudo no SINACEG vs diversificar aquisicao para Instagram/WhatsApp/Google Ads.

**Recomendacao:** tratar SINACEG como nice-to-have, nao must-have. Epic I P3 (Instagram + SEO + calculadoras publicas) deve virar P2 se SINACEG nao responder em 30 dias pos-piloto.

### Risco 5: Scope creep em Epic J pode virar distracao

**Contexto:** Epic J tem 9 features novas, cada uma virando potencial mini-projeto. Tentacao de comecar ficha de cegonha ou calculadora de frete antes do piloto pode atrasar tudo.

**Trade-off:** entregar mais features = mais diferenciacao competitiva vs focar em qualidade = piloto mais bem sucedido.

**Recomendacao:** congelamento estrito de Epic J ate Sprint 7 pos-piloto. Nenhuma feature nova pre-launch alem do Epic E (acertos avulsos, que ja esta decidido). Sem excecoes.

### Risco 6: SAM real menor que briefing original sugere

**Contexto:** @analyst recalculou TAM como ~R$2M/ano (5.000 cegonhas x R$35 x 12), nao os R$12-24M do briefing original. Mercado e pequeno em valores absolutos.

**Trade-off:** perseguir adjacencia seminovo (3x-5x maior) vs manter foco estrito no nicho cegonheiro.

**Recomendacao:** manter foco no nicho por 12-18 meses ate saturar. Adjacencia seminovo e Epic J P3, nao prioridade imediata. O SAM pequeno e compensado pelo LTV alto e pela falta de concorrencia direta.

---

## Proximos Passos Recomendados

1. **Agora (hoje):**
   - Guilherme valida o roadmap e decide sobre os 6 riscos listados acima
   - Decide se aceita as priorizacoes P1/P2/P3 ou se quer reclassificar algo
   - Aprova o sequenciamento de 6 sprints pre-piloto

2. **Esta semana:**
   - @po converte os ~40 itens P1 em stories formais em `docs/stories/active/`
   - @po organiza por Epic + Sprint (A-J, S1-S6)
   - @sm faz a primeira sprint planning real baseada no roadmap

3. **Proxima semana (Sprint 2 oficialmente):**
   - Dev focal comeca Epic F P1 (CI + testes de fechamentos em paralelo ao FIRE do @devops)
   - UX focal comeca Epic C P1 (tokens) + Epic G P1 (PT-BR)
   - PM monitora execucao do FIRE e garante que Epic F nao comeca antes do CI estar no ar

4. **Semana 7 (piloto):**
   - Kick-off com o tio do Guilherme
   - 1-2 cegonhas reais em operacao
   - Sentry + audit log + manual QA checklist rodando diariamente
   - Feedback loop semanal: bugs criticos entram no topo do backlog

5. **Pos-piloto (60 dias):**
   - Retrospectiva do piloto: o que funcionou, o que quebrou, o que precisa Epic D-F-H mais profundo
   - Epic I P2 comeca (parceria SINACEG, modulo RNTRC, landing pages)
   - Epic J P2 prioriza features pedidas no piloto real, nao teoricas

6. **Pos-launch (120 dias):**
   - Epic I P3 (aquisicao escalavel)
   - Epic J P3 (features avancadas)
   - Avaliacao de expansao ICP para seminovo

---

**Fim do roadmap consolidado original.**

*Gerado por Bob (AIOX PM Strategist) apos leitura integral dos 5 audits paralelos. Zero itens inventados, 100% rastreavel aos audits de origem. Sem implementacao, sem stories formais (trabalho do @po), sem commit.*

---

## Addendum 2026-04-14

**Auditoria complementar executada por 3 agentes paralelos em 2026-04-14:**
- `cyber-chief` — Auditoria multi-tenant + IDOR (foco server actions, storage, RPCs, cache)
- `aiox-data-engineer` — Deep dive RLS + RPCs + triggers + views
- `aiox-devops` — Infra + secrets + headers + CI + LGPD

**Motivacao:** usuario solicitou 3 agentes para avaliar superficie de ataque multi-tenant antes de criar novo Epic L (Relatorios + Chamada). Objetivo paralelo: garantir que dono da Empresa A nao consiga ler/escrever dado da Empresa B.

**Resultado:** 29 achados, dos quais 2 CRITICAL sao parcialmente resolvidos pelo FIRE Block:
- C1 (bucket comprovantes) — DROP feito em commit `bb843da`, recriacao MANUAL no Supabase Dashboard (policies corretas confirmadas: `bucket_id = 'comprovantes' AND (storage.foldername(name))[1] = fn_get_empresa_id()::text`). **Drift git vs dashboard ativo** — migration nao foi commitada.
- C2 (queryMultiEmpresa) — TOCTOU fixado em commit `8186d1c`. Admin client continua em uso (14 callers em 5 paginas). **Footgun estrutural persiste.**

Os 27 achados restantes + Epic L sao catalogados abaixo.

---

### Diff: 29 achados vs roadmap original

| Categoria | Total | Ja no roadmap | Novos | Extensao |
|-----------|-------|---------------|-------|----------|
| CRITICAL | 2 | 2 (drift em #3, parcial em #7) | 0 | 0 |
| HIGH | 9 | 0 | 5 | 4 |
| MEDIUM | 12 | 0 | 11 | 1 |
| LOW | 6 | 0 | 6 | 0 |
| Gaps teste | 1 | 0 | 0 | 1 (#16) |

---

### Novos itens — Epic A (Seguranca, estende BLOCO FIRE)

| # | Item | Prio | Impacto/Esforco | Origem |
|----|------|------|-----------------|--------|
| 101 | Codificar migration `chamadas_and_comprovantes_storage_policies.sql` para fechar drift git vs dashboard | P0 | M/S | C1 cyber-chief |
| 102 | Fix view `view_viagens_ativas` para `WITH (security_invoker = true)` — vaza cross-tenant hoje | P0 | L/S | H1 data-engineer |
| 103 | Helper `assertOwnership(table, id, empresaId)` + `.eq('empresa_id')` defesa-em-profundidade em todas mutations de viagens/fechamentos/motoristas (14 actions) | P1 | L/M | H2 cyber-chief |
| 104 | Validar ownership de `motorista_id` e `caminhao_id` em `updateViagem` e `createFechamento` (cross-tenant data poisoning) | P1 | L/S | H3 cyber-chief, M1 cyber-chief |
| 105 | Policy `combustivel_preco` com role check (motorista nao deve INSERT/UPDATE/DELETE precos de combustivel da empresa) | P1 | M/S | H4 data-engineer |
| 106 | Remover policy aberta `auth.uid() IS NOT NULL` em `empresa` INSERT; criar RPC `fn_create_empresa_with_owner` SECURITY DEFINER transacional | P1 | M/M | H5 data-engineer |
| 107 | `WITH CHECK` explicito em policies de `gasto` (`empresa_id = fn_get_empresa_id() AND motorista_id = fn_get_motorista_id()`) | P1 | M/S | M5 data-engineer |
| 108 | Trigger BEFORE INSERT/UPDATE em `usuario` validando `motorista.empresa_id = NEW.empresa_id` (FK cross-tenant) | P2 | M/S | M6 data-engineer |

---

### Novos itens — Epic B (Refactor Multi-Empresa)

| # | Item | Prio | Impacto/Esforco | Origem |
|----|------|------|-----------------|--------|
| 109 | Eliminar admin client em `queryMultiEmpresa` — refatorar para client autenticado + `fn_get_query_empresas()` (ver architecture-audit.md:143). Footgun: 14 callers dependem de `.eq('empresa_id', eid)` manual | P1 | L/M | C2 cyber-chief, architecture-audit interno |

---

### Extensoes a itens existentes — Epic F, H, I

| # original | Item original | Extensao 2026-04-14 | Origem |
|-------|---------------|---------------------|--------|
| #16 | Suite integracao RLS cross-tenant negativo | Expandir escopo: INSERT/UPDATE/DELETE (nao so SELECT), RPCs `fn_calcular_fechamento`/`fn_switch_empresa`, Storage cross-tenant, role motorista em todas tabelas, 8 tabelas nao cobertas (`combustivel_preco`, `alerta_dispensado`, `viagem_veiculo`, `foto_comprovante`, `fechamento_item`, `categoria_gasto`, `usuario`, `benchmarking_setor`) | cyber-chief, data-engineer |
| #20 | Lib logger estruturado + Sentry.captureException | Adicionar `beforeSend` com scrub de CPF/CNPJ/email/telefone via `mascarar-cpf` em `event.extra`, `event.request.data`, `event.exception.values[].value`. Redact de UUIDs em breadcrumbs (`motoristaId`, `gastoId`, `viagemId`, `fechamentoId`) — hoje vao literais para tag Sentry | H6, H9 devops + cyber-chief |
| #21 | Validacao env vars Zod | Tornar `NEXT_PUBLIC_SITE_URL` obrigatorio no schema; remover fallback silencioso `http://localhost:3000` em `app/api/auth/signout/route.ts:8`; adicionar validacao em `instrumentation.ts` para Edge runtime tambem | H8 devops |
| #54 | Sentry release + source maps upload | Pre-requisito: adicionar `SENTRY_AUTH_TOKEN`, `SENTRY_ORG`, `SENTRY_PROJECT` como secrets no workflow `.github/workflows/ci.yml:33-37` (hoje source maps podem ir para bundle de producao) | H7 devops |

---

### Epic K - Infra Hardening (NOVO)

**Objetivo:** fechar vetores de ataque fora do dominio de aplicacao (headers HTTP, rate limit, LGPD, deployment protection, signed URLs). Pre-requisito para piloto publico com dados reais.

**Escopo:** configuracao de infraestrutura + middleware + LGPD. Zero mudanca de feature para o usuario. Requisito legal e boa pratica de seguranca.

| Prio | Item | Impacto/Esforco | Origem |
|------|------|-----------------|--------|
| P1 | CSP + HSTS explicitos em `next.config.ts` headers (hoje so X-Frame-Options, Referrer-Policy, Permissions-Policy) | M/M | M7, M8 devops |
| P1 | Rate limiting no middleware via `@upstash/ratelimit` — login, trocar-senha, aceitar-convite, /monitoring (100 req/min por IP) | L/M | M9 devops |
| P1 | Cookie banner + pagina publica `/privacidade` (LGPD Art. 46, coleta CPF/CNPJ em site publico) | L/M | M10 devops |
| P1 | Signed URL TTL reduzido para 300s em listagens (manter 3600s so em detalhe); proxy interno como alternativa | M/S | M3 cyber-chief |
| P1 | Validar `motoristaIds` no export CSV `/financeiro/historico/export/route.ts` contra empresa antes do `.in()` | M/S | M2 cyber-chief |
| P1 | Sentry replay com `maskAllInputs: true`, `maskAllText: true`, `blockAllMedia: true` explicitos; adicionar `[data-sentry-mask]` em campos CPF/valor | M/S | M4 cyber-chief |
| P2 | Confirmar no dashboard Vercel que Preview Deployments tem protection por senha habilitada | S/S | M11 devops |
| P2 | Edge runtime valida envs (replicar schema Zod em `instrumentation.ts` edge) | M/S | M12 devops |
| P3 | Cleanup LOW: remover `cookies.txt` do repo, `poweredByHeader: false`, `permissions: { contents: read }` + `persist-credentials: false` no `ci.yml`, `UNIQUE(cnpj)` sem escopo (mitigar enum attack), `SET search_path` em `fn_get_motorista_id`, ownership check em `listComprovantes`, auditoria profunda fluxo `aceitar-convite` | S/S | 6 LOW findings |

**Esforco total:** M (7-10 dias, espalhados)
**Impacto:** L (bloqueador legal para piloto publico com dados reais; reduz superficie de ataque; compliance LGPD)
**Risco:** medio. CSP pode quebrar integracoes inline (Sentry, analytics). Mitigar com report-only mode antes de enforce.
**Dependencias:** BLOCO FIRE concluido. Epic H #20 (logger) antes de #21 (env vars) antes deste.
**Sprint sugerido:** P1 em Sprint 4, P2 em Sprint 5, P3 pos-piloto

---

### Epic L - Relatorios e Upload da Chamada (NOVO)

**Objetivo:** entregar sistema de relatorios que o dono puxa por motorista ou caminhao + upload da CHAMADA (documento fisico com VINs e valor do frete) ao lancar viagem. Anchor feature pre-piloto (dor semanal de acerto com motorista) e fundacao para Copilot IA (OCR futuro).

**Escopo:** feature funcional nova. Schema + storage + UI + geracao de PDF/Excel + RPCs agregadas. Regra de negocio: motorista adiciona, nunca troca/deleta; dono governa tudo (imutabilidade auditavel). Foco contabilidade: Excel com abas separadas, totais por categoria de gasto dedutivel, periodo em mes fechado.

**Conceito de CHAMADA:** documento que motorista recebe na empresa embarcadora (montadora/patio) listando VINs/carros a carregar e valor do frete total. Equivalente ao Bill of Lading (BOL) americano. Super Dispatch faz OCR de VIN; FrotaViva sera primeiro no Brasil. Upload nao bloqueia viagem (posto sem sinal e real) — marca "Chamada pendente" com destaque amarelo.

| Prio | Item | Impacto/Esforco | Origem |
|------|------|-----------------|--------|
| P1 | Schema: tabela `foto_chamada` (espelho de `foto_comprovante`, FK `viagem_id`, ON DELETE CASCADE) + bucket Storage `chamadas/` com mesma policy pattern do `comprovantes` + colunas OCR-ready nullable em `viagem` (`chamada_carros_count int`, `chamada_embarcador text`, `chamada_ocr_extraido_em timestamptz`) + indices `foto_chamada(viagem_id)`, `viagem(caminhao_id, data_saida DESC)`, `viagem(empresa_id, data_chegada_real DESC) WHERE status='concluida'` | L/M | aiox-data-engineer (agente aa) |
| P1 | Upload mobile da chamada no lancamento de viagem: botao grande "Tirar foto da chamada" (64px, largura total), `capture="environment"` (camera direto), preview obrigatorio com "Usar esta" + "Tirar de novo", compressao WebP via `compress-image.ts` (max 1600px, qualidade 0.8), nao bloqueia viagem se ausente. Regra imutabilidade: motorista adiciona, nao troca, nao deleta | L/M | aiox-ux + aiox-pm |
| P1 | Visualizacao da chamada na ficha da viagem: miniatura 80x80 ao lado dos comprovantes, label "Chamada", clique abre tela cheia com zoom (pinch + +/- buttons), X grande pra fechar | M/S | aiox-ux |
| P1 | Pagina `/relatorios` com 2 cards grandes "Por Motorista" / "Por Caminhao" (nao dropdown), atalhos de periodo "Este mes" (default) / "Mes passado" / "Ultimos 3 meses" / "Escolher datas" | L/M | aiox-ux |
| P1 | RPC `relatorio_motorista_periodo(p_motorista_id uuid, p_inicio date, p_fim date) RETURNS jsonb` com SECURITY INVOKER; retorna viagens + caminhao(oes) usado(s) + comissao + km/L + chamadas anexas + ranking vs media frota | L/M | aiox-architect + data-engineer |
| P1 | RPC `relatorio_caminhao_periodo(...)` analoga: viagens + motoristas + custo por km + margem + comparativo vs outros caminhoes | L/M | aiox-architect + data-engineer |
| P1 | Export PDF via `@react-pdf/renderer` (ja instalado 4.3.2) em Server Action Node runtime, sincrono ate 200 viagens; layout com logo + area de assinatura (acerto motorista) + chamadas como anexo no fim | L/M | aiox-architect |
| P1 | Export Excel (`xlsx` package) com abas separadas: Viagens, Despesas (por categoria dedutivel), Abastecimentos, Resumo. Foco contabilidade. | M/M | aiox-pm |
| P2 | Tier Profissional (R$149): custo/km, margem %, benchmark interno entre caminhoes da frota, ranking de motoristas, export agendado por email mensal | L/L | aiox-pm |
| P2 | Job assincrono para relatorios >200 viagens (tabela `relatorio_job` + Vercel Cron 1min ou Edge Function) com notificacao "Pronto para baixar" | M/M | aiox-architect |
| P2 | Cache de PDF de mes fechado em `chamadas-cache/{empresa_id}/{hash}.pdf` Storage, TTL 90 dias, `revalidateTag` ao fechar mes | M/S | aiox-architect |
| P3 | OCR de chamada via Edge Function disparada por trigger no Storage (extrair VINs e frete_total automaticamente) — prep pro Copilot IA | L/L | aiox-data-engineer (prep) |
| P3 | Export XML CT-e/MDF-e para SEFAZ (tier Enterprise, compliance ANTT) | L/L | aiox-analyst benchmark |

**Esforco total:** L (2 semanas de 1 dev focado pra P1, mais 1 semana para P2)
**Impacto:** L (anchor feature pre-piloto — dor #1 do dono eh acerto semanal com motorista; fundacao para Copilot via digitalizacao da chamada; 4 tiers de dor cobertos: acerto motorista, contabilidade mensal, negociacao embarcador, defesa fiscal/trabalhista)
**Risco:** medio. Storage de chamadas explode custo se faltar retencao. Backlog ja prevê "retencao comprovantes 3 meses" — estender a chamadas OU marcar chamada como imutavel 5 anos (prova fiscal). Decidir no kick-off do Epic L.
**Dependencias:** Epic A #101-107 (seguranca pre-piloto), Epic F #16 (suite RLS expandida para cobrir `foto_chamada`), bucket `chamadas` precisa aplicar mesma policy correta do `comprovantes` desde criacao
**Sprint sugerido:** P1 em Sprint 6 (pre-piloto), P2 em Sprint 7-8 (pos-piloto inicial), P3 pos-launch

**Pricing alinhado:**
- Essencial (R$79): relatorio basico (viagens, totais, PDF/Excel simples) — commodity de mercado, nao pode faltar
- Profissional (R$149): chamadas anexas, custo/km, margem, benchmark interno, export agendado — anchor feature do tier com Copilot
- Enterprise (R$199): + XML CT-e/MDF-e, retencao estendida

**Regra de imutabilidade (vale para `foto_comprovante` e `foto_chamada`):**
| Acao | Motorista (viagem em_andamento) | Motorista (finalizada) | Dono/Gestor |
|------|--------------------------------|------------------------|-------------|
| Adicionar foto nova | OK | BLOQUEADO | OK sempre |
| Adicionar outra foto ao mesmo gasto/viagem (empilhar) | OK | BLOQUEADO | OK |
| Substituir/trocar existente | BLOQUEADO | BLOQUEADO | OK |
| Deletar | BLOQUEADO | BLOQUEADO | OK |

Enforcement: RLS policy + check na server action + trigger bloqueando INSERT de motorista quando `viagem.status != 'em_andamento'`.

---

### Sequenciamento revisado pos-addendum

Ajustes a partir do plano original de 6 sprints:

| Sprint | Mudanca |
|--------|---------|
| 2 | + itens #101, #102 (migration storage + view_viagens_ativas security_invoker) — ambos L/S, execucao rapida no proprio sprint do FIRE |
| 3 | + itens #103, #104, #107 (defesa-em-profundidade em mutations + ownership motorista_id/caminhao_id + WITH CHECK gasto) — junto com suite RLS expandida (#16 extensao) |
| 4 | + itens #105, #106 (combustivel_preco role + empresa INSERT via RPC) + Epic K P1 (CSP, rate limit, LGPD banner, signed URL TTL) + Epic H #20/#21 extensoes (Sentry beforeSend + SITE_URL obrigatorio) |
| 5 | + item #109 (eliminar admin client queryMultiEmpresa) alinhado ao Epic B P2 (unificar branching) |
| 6 | + Epic L P1 (Relatorios + Chamada basico) — anchor feature pre-piloto |
| 7 (piloto) | Kick-off com frota do tio inclui Epic L P1 funcional |
| 8-9 (pos-piloto inicial) | Epic L P2 (tier Profissional) + Epic K P2 (preview protection, Edge envs) |

**Piloto continua na semana 7**, mas agora com relatorio funcional + hardening multi-tenant completo.

---

### Tabela complementar de itens (101-125)

| # | Item | Epic | Prio | Impacto/Esforco | Origem |
|---|------|------|------|-----------------|--------|
| 101 | Migration codificando storage policies do bucket comprovantes (drift git) | A | P0 | M/S | C1 2026-04-14 |
| 102 | Fix view_viagens_ativas com security_invoker | A | P0 | L/S | H1 2026-04-14 |
| 103 | Helper assertOwnership + .eq empresa_id em 14 mutations | A | P1 | L/M | H2 2026-04-14 |
| 104 | Validar ownership motorista_id/caminhao_id em updateViagem + createFechamento | A | P1 | L/S | H3, M1 2026-04-14 |
| 105 | combustivel_preco RLS com role check | A | P1 | M/S | H4 2026-04-14 |
| 106 | empresa INSERT via RPC SECURITY DEFINER | A | P1 | M/M | H5 2026-04-14 |
| 107 | WITH CHECK explicito em policies de gasto | A | P1 | M/S | M5 2026-04-14 |
| 108 | Trigger cross-tenant em usuario.motorista_id | A | P2 | M/S | M6 2026-04-14 |
| 109 | Eliminar admin client em queryMultiEmpresa | B | P1 | L/M | C2 2026-04-14 |
| 110 | CSP + HSTS em next.config.ts | K | P1 | M/M | M7, M8 2026-04-14 |
| 111 | Rate limiting middleware (Upstash) | K | P1 | L/M | M9 2026-04-14 |
| 112 | Cookie banner + pagina /privacidade LGPD | K | P1 | L/M | M10 2026-04-14 |
| 113 | Signed URL TTL 300s em listagens | K | P1 | M/S | M3 2026-04-14 |
| 114 | Validar motoristaIds em export CSV | K | P1 | M/S | M2 2026-04-14 |
| 115 | Sentry replay maskAllInputs/Text explicito | K | P1 | M/S | M4 2026-04-14 |
| 116 | Vercel preview protection confirmar | K | P2 | S/S | M11 2026-04-14 |
| 117 | Edge runtime valida envs (Zod) | K | P2 | M/S | M12 2026-04-14 |
| 118 | Cleanup LOW: cookies.txt, poweredByHeader, CI permissions, UNIQUE cnpj, search_path, listComprovantes, fluxo convite | K | P3 | S/S | 6 LOW 2026-04-14 |
| 119 | Schema foto_chamada + bucket chamadas + colunas OCR-ready + indices | L | P1 | L/M | data-engineer 2026-04-14 |
| 120 | Upload mobile chamada (camera direto + imutabilidade) | L | P1 | L/M | ux + pm 2026-04-14 |
| 121 | Visualizacao chamada + comprovantes na ficha | L | P1 | M/S | ux 2026-04-14 |
| 122 | Pagina relatorios + selectors + RPCs motorista/caminhao + PDF + Excel | L | P1 | L/L | architect + data-engineer + ux 2026-04-14 |
| 123 | Tier Profissional: custo/km, margem, benchmark interno, export agendado | L | P2 | L/L | pm 2026-04-14 |
| 124 | Job assincrono >200 viagens + cache PDF mes fechado | L | P2 | M/M | architect 2026-04-14 |
| 125 | OCR chamada + export XML CT-e/MDF-e (Enterprise) | L | P3 | L/L | data-engineer + analyst 2026-04-14 |

**Total atualizado:** 125 itens (100 originais + 25 novos em 2026-04-14).

---

**Fim do addendum 2026-04-14.**

*Gerado apos auditoria complementar de 3 agentes paralelos. Todos os 29 achados catalogados e classificados vs roadmap original. 24 itens genuinamente novos + 5 extensoes + 2 Epics novos (K, L). Piloto continua na semana 7 com superficie de ataque drasticamente reduzida.*
