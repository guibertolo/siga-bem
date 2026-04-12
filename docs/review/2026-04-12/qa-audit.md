# QA Audit - FrotaViva (Pré-Piloto)

**Data:** 2026-04-12
**Agente:** Quinn (Guardian) - AIOX QA
**Escopo:** Cobertura de testes, qualidade, riscos de regressão, CI/CD, observabilidade, segurança, acessibilidade e checklist de validação manual antes do piloto real.
**Status do projeto:** Pré-launch, deploy live em Vercel, aguardando piloto com frota do tio.
**Público-alvo:** Donos de frota 40-60 anos. Baixa tolerância a bugs. Usuário que desiste não volta.

---

## Sumário executivo (5 linhas)

1. **CI está quebrado e ninguém percebeu.** As 2 únicas runs do GitHub Actions falharam em menos de 12 segundos. O workflow usa `working-directory: apps/siga-bem` mas o repo é standalone (`guibertolo/siga-bem`), ou seja, os quality gates nunca rodaram em nenhum commit.
2. **Typecheck quebra localmente** (2 erros em `VeiculoForm.tsx`) e **lint tem 9 erros** hoje. Código está sendo feito push pra main sem rodar `npm run typecheck` nem `npm run lint` antes.
3. **Cobertura de testes é praticamente zero onde importa.** 114 testes passando, 100% em utilitários puros (CPF, CNPJ, placa, datas, moeda). **Zero testes em server actions, queries, RLS, multi-empresa, BI, fechamentos ou upload.** O diff não-commitado em `fechamentos/actions.ts` e `multi-actions.ts` não tem teste que o cubra.
4. **Upload de comprovantes não valida tamanho nem tipo no servidor.** Qualquer cliente pode enviar um arquivo de 500MB via `uploadComprovante` e ele vai pro Supabase Storage. A validação só existe no cliente (`compress-image.ts`).
5. **Rollback do cadastro atômico de motorista é incompleto.** Se a falha acontecer depois de inserir o motorista e o usuario, o `deleteUser` do auth limpa só o Supabase Auth. Os registros em `motorista` e `usuario` ficam órfãos no Postgres.

---

## 1. Cobertura de testes atual

### Inventário (`__tests__/lib/utils/`)

| Arquivo | Categoria | Alvo |
|---|---|---|
| `compress-image.test.ts` | Unit | Util client-side (compressão e limite de tamanho) |
| `currency.test.ts` | Unit | Util puro (parse/format BRL) |
| `format-date.test.ts` | Unit | Util puro (formatação de datas PT-BR) |
| `lgpd.test.ts` | Unit | Util puro (mascaramento LGPD) |
| `validate-cnpj.test.ts` | Unit | Util puro |
| `validate-cpf.test.ts` | Unit | Util puro |
| `validate-placa.test.ts` | Unit | Util puro |
| `validate-renavam.test.ts` | Unit | Util puro |

**Total:** 8 suítes, 114 testes, todos passando, zero skipped, tempo de execução 1.4s.

### Features críticas SEM teste (nem um único)

| Feature | Arquivos sem cobertura | Impacto |
|---|---|---|
| **Fechamentos** (lógica de dinheiro) | `app/(dashboard)/fechamentos/actions.ts` (802 linhas), `multi-actions.ts`, `[id]/actions.ts` | CRÍTICO |
| **BI / KPIs / Alertas** | `app/(dashboard)/bi/actions.ts` (2069 linhas), `multi-actions.ts` | CRÍTICO |
| **Dashboard** (home do dono) | `app/(dashboard)/dashboard/actions.ts`, `multi-actions.ts` | ALTO |
| **Viagens** (ciclo de vida) | `app/(dashboard)/viagens/actions.ts` (783 linhas), `[id]/actions.ts`, `veiculos/actions.ts` | CRÍTICO |
| **Gastos + upload comprovante** | `gastos/actions.ts` (598 linhas), `comprovante-actions.ts` | CRÍTICO |
| **Multi-empresa (admin client, RLS bypass)** | `lib/queries/multi-empresa.ts`, `multi-empresa-query.ts`, `multi-select-actions.ts` | CRÍTICO |
| **Cadastro atômico de motorista (auth + DB)** | `motoristas/actions.ts` (`createMotoristaComConta`) | CRÍTICO |
| **Auth / role guards** | `lib/auth/get-user-role.ts`, `middleware.ts`, `lib/supabase/middleware.ts` | ALTO |
| **Switch de empresa** | `empresa/switch/actions.ts`, `empresa/switch-actions.ts` | ALTO |
| **Configuração (troca de senha, primeiro login)** | `auth/trocar-senha/actions.ts`, `perfil/actions.ts` | ALTO |
| **Aceitar convite** | `auth/aceitar-convite/actions.ts` | ALTO |
| **Histórico financeiro + export CSV** | `financeiro/historico/actions.ts`, `export/route.ts` | MÉDIO |

### Distribuição por tipo

| Tipo | Quantidade | % |
|---|---|---|
| Unit (utils puros) | 8 suítes (114 testes) | 100% |
| Integration (DB/RLS) | 0 | 0% |
| E2E (Playwright/Cypress) | 0 | 0% |

**Observação importante:** `puppeteer` está listado em `devDependencies` mas não há nenhum teste Puppeteer no repo. Foi usado ad-hoc pra gerar Lighthouse (os `lighthouse-*.report.json` que estão soltos no root, sem `.gitignore`).

---

## 2. Jest configuração

### Status

Funcional. `jest.config.ts` usa `ts-jest`, `testEnvironment: 'node'`, `roots: ['<rootDir>/__tests__']`, module alias `@/` para raiz. Todos os 114 testes passam em 1.4s.

### Limitações

- Não há `coverage` configurado, nenhum `npm run test:coverage`. Não dá pra medir cobertura de forma objetiva.
- Não há `testPathIgnorePatterns` para integração vs unit.
- Nenhum setup de mock para Supabase client. Testar server actions exigiria mocks ou um Supabase local.

---

## 3. Riscos de regressão ativos (áreas mexidas recentemente)

Recent `git log --oneline -15` mostra alta atividade:

| Commit | Área | Tem teste? |
|---|---|---|
| `2a85322` PWA service worker | `public/sw.js`, `app/layout.tsx` | NÃO |
| `76ba6b8` Sentry + CI | `sentry.*.config.ts`, `.github/workflows/ci.yml` | NÃO (e CI quebrou) |
| `210e16f` multi-empresa keys, onboarding, perf | vários | NÃO |
| `d62c5bf` multi-empresa admin client, tutorial, switcher | `multi-empresa-query.ts` (RLS bypass) | NÃO |
| `bd3f0b3` tooltips BI, cards alerta | BI | NÃO |
| `808431b` alertas dispensáveis, benchmark setor | BI | NÃO |
| `3042eec` validação completa (performance 98) | várias | NÃO |
| `449cae6` máscaras inteligentes | utils (via currency.test.ts) | PARCIAL |
| `781c860` acertos pendentes conta viagens concluídas | `fechamentos/actions.ts` | NÃO |
| `e64d30d` dashboard Lucro do Mês | `dashboard/actions.ts` | NÃO |

**Padrão:** quase todos os últimos 15 commits mexem em código crítico de server action + query, e nenhum deles acompanha teste. A carga de regressão se acumula a cada commit.

### Diff não-commitado em `fechamentos`

Os dois arquivos com diff pendente mudam a semântica de "acerto concluído": antes bastava existir `fechamento_item` ligado à viagem, agora o `fechamento` precisa estar com `status = 'pago'`.

**Edge cases que podem quebrar silenciosamente:**

1. Motorista tem viagem dentro de um fechamento `fechado` (não `pago`): antes era considerada "já acertada", agora volta a aparecer como "pendente de acerto". Risco: o dono cria um segundo fechamento com essa viagem e paga em dobro.
2. Se `fechamento_item.fechamento_id` ficar null por algum motivo, o filtro `pagoIds.has(i.fechamento_id)` retorna `false` e a viagem entra em "pendente" silenciosamente. Hoje não há teste que capture isso.
3. Multi-empresa: o `getViagensPendentesAcertoForEmpresa` (admin client) aplica a mesma lógica, mas **não revalida que o empresaId ainda é válido para o usuário autenticado** no momento do query (só no momento da seleção via `setSelectedEmpresas`). Se um admin remove um vínculo no meio da sessão, o dono ainda consulta como se o vínculo existisse até limpar o `selected_empresas`.
4. `fechamento_item` aceita `referencia_id` duplicado entre múltiplos fechamentos abertos (nada impede). Se o dono criou fechamento A (aberto) e depois fechamento B (aberto), a mesma viagem pode estar em ambos. Nenhum teste previne.

---

## 4. CI/CD atual

### Workflow

Arquivo único: `.github/workflows/ci.yml`. Roda em `push main` e `pull_request main`. Job único `Lint + TypeCheck + Build`.

### Status real (via `gh run list`)

| Run | Status | Duração | Commit |
|---|---|---|---|
| `23819999484` | **failure** | 12s | PWA service worker |
| `23819141973` | **failure** | 8s | Sentry + CI setup |

**CI nunca passou.** A causa é estrutural: o workflow usa `working-directory: apps/siga-bem` e `cache-dependency-path: apps/siga-bem/package-lock.json`, mas o repo `guibertolo/siga-bem` é standalone. Isso é um resíduo da época em que o app vivia dentro do monorepo `aiox-core/apps/`. Ao reorganizar, o workflow não foi corrigido.

### O que NÃO está rodando automaticamente hoje

- `npm run lint`
- `npx tsc --noEmit`
- `npm run build`
- `npm test`
- Nenhum gate bloqueia push.

### Observação crítica

O projeto também **não roda `jest` no CI** mesmo que fosse consertado. O workflow atual só faz lint + typecheck + build. Os 114 testes unitários nunca são executados pelo CI.

---

## 5. Monitoramento em produção (Sentry)

### Configuração atual

3 arquivos: `sentry.client.config.ts`, `sentry.server.config.ts`, `sentry.edge.config.ts`. Todos:
- `enabled: process.env.NODE_ENV === 'production'`
- `tracesSampleRate: 0.1`
- Client: `replaysSessionSampleRate: 0`, `replaysOnErrorSampleRate: 1.0`

### Cobertura de erros

**Única captura manual no código:** `app/global-error.tsx`. Nenhum outro `Sentry.captureException` em nenhum server action, query ou util. Erros de Supabase em server actions hoje **só retornam um objeto `{ error: string }` para o cliente e somem pro sempre**. Se uma RLS silenciar um query (retornando array vazio onde deveria ter dados), Sentry não vê.

### O que está faltando

1. Nenhum `Sentry.captureException` em catch de server actions (motoristas, fechamentos, viagens, gastos).
2. Nenhum logger estruturado. Há 4 `console.error` espalhados em 3 arquivos (`aceitar-convite`, `empresa`, `empresa/switch-actions`). Logs não vão pro Sentry.
3. Sem tags de contexto (empresa_id, usuario_id, role) em erros, impossível correlacionar bug com empresa específica.
4. Release tracking não está configurado (nenhum `SENTRY_RELEASE` nos workflows).
5. `tracesSampleRate: 0.1` significa só 10% de performance traces. OK para produção de larga escala, mas em piloto pequeno você perde visibilidade de queries lentas.

---

## 6. Pontos classificados por severidade

### CRÍTICO (1-6)

#### 1. CI/CD completamente quebrado
**Arquivo:** `.github/workflows/ci.yml` linhas 12-13
**Problema:** `working-directory: apps/siga-bem` e `cache-dependency-path: apps/siga-bem/package-lock.json` apontam pra um sub-path que não existe no repo standalone.
**Impacto:** Todo commit desde `76ba6b8` (31/03) tem CI red. Ninguém viu porque o status check não bloqueia push em main. Quality gates nunca rodaram.
**Proposta:** Remover `working-directory` e `cache-dependency-path` (deixar default no root). Adicionar `npm test` ao job. Configurar branch protection em `main` exigindo CI green.
**Esforço:** S | **Impacto:** L

#### 2. Typecheck falha localmente (2 erros) e lint tem 9 erros
**Arquivos:**
- `components/viagens/VeiculoForm.tsx:30, 114` (erros TS2322, TS2345 em Resolver do react-hook-form)
- `components/empresa/EmpresaSwitcher.tsx:53, 96, 109` (variáveis não usadas)
- `components/gastos/GastoForm.tsx:116` (rule `react-hooks/exhaustive-deps` não encontrada no config)
- `components/gastos/GastoTable.tsx:22` (variável não usada)
- `components/onboarding/OnboardingOverlay.tsx:87`, `components/ui/MobileSidebar.tsx:99` (warnings de `<img>`)

**Impacto:** Código está sendo commitado sem validação local. `GastoForm.tsx` linha 116 tem uma regra eslint referenciada que não existe no config, o que é um sintoma de config dessincronizado.
**Proposta:** Rodar `npm run typecheck && npm run lint && npm test` como pre-commit hook (husky) ou via `package.json` `scripts.prepush`. Corrigir os 11 problemas listados antes do piloto.
**Esforço:** S | **Impacto:** L

#### 3. Upload de comprovante sem validação server-side
**Arquivo:** `app/(dashboard)/gastos/comprovante-actions.ts` linhas 18-66
**Problema:** O handler recebe `FormData`, chama `supabase.storage.upload(storagePath, file)` direto sem validar `file.size` nem `file.type`. A única validação de tamanho (10MB) vive em `lib/utils/compress-image.ts`, que é client-side.
**Impacto:** Cliente malicioso ou bug no client pode gravar arquivos de qualquer tamanho no bucket `comprovantes`. Supabase Storage tem limite default de 50MB mas ainda assim pode custar caro em um plano pago, e nada impede anexar .exe renomeado pra .jpg.
**Proposta:** Validar `file.size <= 10 * 1024 * 1024` e `contentType in ['image/jpeg', 'image/png', 'application/pdf']` no topo da action. Rejeitar antes de chamar upload.
**Esforço:** S | **Impacto:** M

#### 4. Rollback do cadastro atômico não limpa DB
**Arquivo:** `app/(dashboard)/motoristas/actions.ts` linhas 225-315
**Problema:** O try/catch cobre os inserts em `motorista`, `usuario`, `usuario_empresa`. Se qualquer um falhar, o catch chama `adminClient.auth.admin.deleteUser(authUserId)`. Mas se a falha acontecer, por exemplo, no insert de `usuario_empresa` (linha 276), o `motorista` e o `usuario` já foram inseridos e ficam órfãos. Só o auth user é apagado.
**Impacto:** Deixa registros inconsistentes no banco, aparecem como motoristas "fantasma" que ninguém consegue logar (auth user não existe mais) e o dono não entende por que apareceram na lista. Cenário raro mas de recuperação manual.
**Proposta:** Transformar em transação via SQL function `fn_criar_motorista_com_conta` (trigger ou RPC) OU adicionar rollback em cascata explícito no catch (deletar `usuario_empresa` → `usuario` → `motorista`, nessa ordem, antes do `deleteUser`).
**Esforço:** M | **Impacto:** M

#### 5. Zero teste na lógica de fechamentos (dinheiro)
**Arquivos:** `app/(dashboard)/fechamentos/actions.ts` (802 linhas), `multi-actions.ts`, `[id]/actions.ts`
**Problema:** Fechamentos tocam dinheiro do motorista. Hoje: 0 testes. Toda vez que mexer na lógica de `idsComAcerto`, `saldo_motorista`, overlap de período ou transição de status, o único feedback é "usuário tem prejuízo real".
**Impacto:** Bug financeiro em produção é o pior tipo de bug pra o público 55+. Perda de confiança imediata e irreversível.
**Proposta:** Criar suíte de integration tests que rode contra Supabase local (via `supabase start`), com fixtures de motorista, viagem, fechamento, fechamento_item. Cobrir pelo menos: transições de status válidas/inválidas, overlap de período, divisão por `percentual_pagamento` (inclui zero e 100), `getViagensPendentesAcerto` com mix de fechamentos aberto/fechado/pago, multi-empresa com admin client.
**Esforço:** L | **Impacto:** L

#### 6. Multi-empresa bypass RLS sem revalidação em runtime
**Arquivo:** `lib/queries/multi-empresa-query.ts` linhas 19-50
**Problema:** `queryMultiEmpresa` usa `createAdminClient()` (service_role). A ownership check é indireta: lê `usuario.selected_empresas` e confia que foi validado no `setSelectedEmpresas`. Se um admin remove um vínculo (`usuario_empresa.ativo = false`) no meio da sessão do dono, a consulta continua puxando dados da empresa até o usuário limpar manualmente o `selected_empresas`.
**Impacto:** Janela de exposição pequena mas real. Dado de empresa não autorizada pode vazar. Para o caso típico (dono com múltiplas empresas), o risco é baixo; para o caso adversarial (admin ex-funcionário), é maior.
**Proposta:** No `queryMultiEmpresa`, antes de iterar `ctx.empresaIds`, revalidar contra `usuario_empresa` WHERE `usuario_id = auth.id AND empresa_id IN (...) AND ativo = true`. Filtrar `empresaIds` para só aqueles que passam.
**Esforço:** S | **Impacto:** M

### ALTO (7-14)

#### 7. Nenhum `Sentry.captureException` em server actions
**Arquivos:** todos os `actions.ts` em `app/(dashboard)/`
**Problema:** Erros de Supabase são retornados como string, o usuário vê, o log morre. Sentry só captura erros que chegam até `global-error.tsx`, que é raro em server actions (elas capturam o erro e retornam objeto).
**Impacto:** Durante o piloto, você vai perder TODOS os erros silenciosos de query/RLS. Não vai saber quando algo está quebrando na casa do dono.
**Proposta:** Criar `lib/observability/logger.ts` com `logError(context, error)` que chama `Sentry.captureException` com tags (`empresa_id`, `usuario_id`, `action`). Usar em todos os catch de server action. Mínimo: catch nas actions críticas de fechamentos, viagens, gastos.
**Esforço:** M | **Impacto:** L

#### 8. `getSession()` no middleware em vez de `getUser()`
**Arquivo:** `lib/supabase/middleware.ts` linhas 33-36
**Problema:** O comentário assume que `getSession()` é suficiente porque `getCurrentUsuario` (server-side) valida via `getUser()`. Mas o middleware é a primeira linha de defesa e `getSession()` **não valida o JWT contra o Supabase**, só lê o cookie. Se um atacante tiver um cookie forjado mas a camada abaixo não valida antes de render, há risco de 1 round-trip inteiro em estado inválido.
**Impacto:** Pequeno no caso normal (server-side sempre valida em `getCurrentUsuario`), mas perigoso se alguma rota protegida fizer render usando só a sessão do middleware. Vale auditar cada page.tsx crítico.
**Proposta:** Trocar para `await supabase.auth.getUser()` no middleware, aceitando o custo de 1 round-trip por request protegido (é o recomendado pelo Supabase).
**Esforço:** S | **Impacto:** M

#### 9. Storage dos reports Lighthouse poluindo repo
**Arquivo:** root (10 arquivos `lighthouse-*.report.json` e `.html`)
**Problema:** Estão untracked e **não estão em `.gitignore`**. Qualquer `git add .` vai incluí-los. São artefatos de análise, não código.
**Impacto:** Poluição do repo, risco de commit acidental de payload grande, relatórios com dados de preview URL.
**Proposta:** Adicionar ao `.gitignore`:
```
lighthouse-*.json
lighthouse-*.html
```
E remover os arquivos soltos do working dir.
**Esforço:** S | **Impacto:** S

#### 10. Possível double-bilhetagem de viagens entre fechamentos
**Arquivo:** `app/(dashboard)/fechamentos/actions.ts` linha 426 (insert em `fechamento`)
**Problema:** O check de overlap (linhas 410-423) compara período mas **não compara com `fechamento_item`**. Se o dono cria fechamento A para o motorista no período 01/04-07/04 (sem conflito), e depois insere viagens manualmente, essas viagens também vão pro `allItems`. Mas não há UNIQUE constraint em `fechamento_item (referencia_id, tipo)` que impeça a mesma viagem aparecer em 2 fechamentos.
**Impacto:** Bug financeiro: o dono pode, sem querer, pagar o motorista 2x pela mesma viagem. A mudança recente do diff (ignora itens em fechamento não-pago) **piora** esse risco porque uma viagem que está em fechamento `aberto` volta pra "pendente" e pode ser paga de novo.
**Proposta:** Adicionar UNIQUE em DB: `CREATE UNIQUE INDEX ON fechamento_item (referencia_id) WHERE tipo='viagem';` OU validar no código: antes de inserir, verificar se já existe algum `fechamento_item` com esse `referencia_id` em fechamento != 'cancelado'.
**Esforço:** M | **Impacto:** L

#### 11. Tantas stories `InProgress` ao mesmo tempo (9)
**Arquivos:** `docs/stories/active/3.4`, `5.1`, `5.2`, `5.3`, `5.4`, `5.5`, `5.6`, `7.1`, `7.5`, `8.1` marcados InProgress
**Problema:** 10 stories em estado intermediário e **nenhuma com QA report correspondente em `docs/stories/qa/`** (o qa dir só tem reports até Wave 6 de 31/03). Não dá pra saber o que realmente foi entregue vs abandonado no meio.
**Impacto:** Fica impossível decidir o que precisa ser testado manualmente antes do piloto. O time testando pode pular área crítica.
**Proposta:** Sessão de triagem com @sm/@po pra mover cada story pra `Done` (com QA report), `Draft` (volta pra fila) ou `Blocked`. Objetivo: 0 stories `InProgress` antes do piloto.
**Esforço:** M | **Impacto:** M

#### 12. Nenhuma ferramenta automatizada de acessibilidade
**Arquivos:** (projeto inteiro)
**Problema:** Público 55+ é o núcleo do produto. Não há `@axe-core/playwright`, `pa11y`, `lighthouse --only-categories=accessibility` no CI, nem teste de contraste automatizado. A única evidência de acessibilidade são os Lighthouse manuais (100/100 no último), mas eles rodam no build local, não regridem automaticamente.
**Impacto:** Qualquer commit que mude um componente pode quebrar contraste ou target-size sem ninguém notar.
**Proposta:** Adicionar no CI (uma vez consertado): `npx @axe-core/cli http://localhost:3000/login` pelo menos para rotas públicas. OU usar Playwright + `axe-playwright` pra uma suíte rápida de a11y.
**Esforço:** M | **Impacto:** M

#### 13. Observabilidade sem release tracking nem source maps
**Arquivo:** `sentry.*.config.ts`
**Problema:** `sentry.client.config.ts` não configura `release` nem integração com source maps. Erros em produção vão aparecer com stack traces minificados.
**Impacto:** Quando o primeiro bug do piloto acontecer, você vai ver `Qe()@main.4fe8.js:1` e não vai saber de qual linha veio.
**Proposta:** Seguir o wizard `npx @sentry/wizard@latest -i nextjs` para configurar `withSentryConfig` em `next.config.ts` com `sourcemaps.upload`. Ou no mínimo injetar `release: process.env.VERCEL_GIT_COMMIT_SHA` nos 3 configs.
**Esforço:** M | **Impacto:** L

#### 14. Signed URL do comprovante com expiração fixa de 1 hora
**Arquivo:** `app/(dashboard)/gastos/comprovante-actions.ts` linha 12
**Problema:** `SIGNED_URL_EXPIRY = 3600`. Se o usuário abre o comprovante e fica lendo por mais de 1 hora, link expira. Também: o URL é salvo em `foto_url` do gasto (linha 88+), então vai ficar gravado no DB e expirar. Próximo acesso precisa regenerar.
**Impacto:** UX ruim pro dono 55+ que clica num link "quebrado" e não entende. Risco também de ter URLs antigas no banco que apontam pra conteúdo válido mas são inacessíveis.
**Proposta:** Gerar signed URL sob demanda (quando o usuário clica), não gravar no DB. OU aumentar expiração pra 24h e gerar sob demanda quando for exibir listagem.
**Esforço:** S | **Impacto:** M

### MÉDIO (15-20)

#### 15. Performance: nenhuma medição estruturada de queries
**Arquivos:** todos os `actions.ts`
**Problema:** Não há timing em nenhum query. Sentry está com `tracesSampleRate: 0.1` mas sem spans manuais nas actions, então você só vê o tempo total da request. Em páginas com N+1 potencial (como dashboard carregando viagens + motoristas + caminhões + fechamentos), fica difícil achar o culpado.
**Proposta:** Nos pontos quentes (dashboard, BI, fechamentos list) adicionar `Sentry.startSpan({ name: 'fetch_dashboard_data' })` manual. E rodar uma medição baseline no piloto real pra ter referência.
**Esforço:** M | **Impacto:** M

#### 16. `fn_switch_empresa` error message parsing frágil
**Arquivo:** `app/(dashboard)/empresa/switch/actions.ts` linhas 35-38
**Problema:** `error.message.includes('vinculo')` é parsing de string pra decidir a mensagem pro usuário. Qualquer mudança no texto do erro SQL quebra.
**Proposta:** Retornar um código de erro estruturado da SQL function (`RAISE EXCEPTION USING ERRCODE = 'P0001', MESSAGE = 'no_binding'`) e parsear o code em vez do texto.
**Esforço:** S | **Impacto:** S

#### 17. Nenhum teste de E2E do fluxo crítico login → criar viagem → fechar
**Problema:** O fluxo completo nunca foi exercitado por nenhum teste automatizado. O único "E2E" são os Lighthouse manuais.
**Proposta:** Adicionar 1 suíte Playwright mínima com 3 cenários: (1) login dono → cria viagem → conclui → fecha, (2) login motorista → vê própria viagem → atualiza status, (3) login admin → switch empresa → vê dados corretos.
**Esforço:** L | **Impacto:** L

#### 18. Zero assertions de RLS
**Problema:** As migrations criam RLS policies mas nada testa que um motorista realmente NÃO consegue ver dados de outra empresa, que um usuário sem vínculo retornar empty, etc.
**Proposta:** Suíte de integration rodando com 2 auth tokens diferentes (dono A e motorista B) fazendo queries cross-tenant e esperando array vazio ou erro.
**Esforço:** L | **Impacto:** L

#### 19. Service worker sem versionamento nem estratégia de invalidação
**Arquivo:** `public/sw.js`, `app/layout.tsx` linhas 97-107
**Problema:** `navigator.serviceWorker.register('/sw.js')` sem cache busting. Se você mudar o sw.js, clientes antigos podem ficar servindo versão velha por dias.
**Impacto:** Bug fixado em produção não chega pro usuário 55+ que deixou a aba aberta.
**Proposta:** Registrar com `?v=${buildHash}`, implementar `skipWaiting` e `clients.claim` no sw.js, mostrar toast "Nova versão disponível, clique pra atualizar".
**Esforço:** M | **Impacto:** M

#### 20. `pwa.json` sem validação automática
**Arquivo:** `public/manifest.json`
**Problema:** Sem CI validando o manifest. Um campo inválido (icon path errado, name faltando) pode quebrar a instalação PWA no Android e ninguém percebe até o primeiro usuário reclamar.
**Proposta:** Adicionar `web-app-manifest` check no script de build ou um test unitário que faça `JSON.parse` + valida campos obrigatórios.
**Esforço:** S | **Impacto:** S

### BAIXO (21-22)

#### 21. Comentário com em-dash no código
**Arquivo:** `lib/queries/multi-empresa.ts` linha 9
**Problema:** `/** IDs to query — either selected_empresas or [active empresa_id] */`. Em-dash em comentário interno. Não afeta usuário mas viola a regra global do projeto.
**Proposta:** Trocar por hífen. Considerar adicionar um lint rule (ESLint custom) que flagueie em-dash em strings e comentários.
**Esforço:** S | **Impacto:** S

#### 22. `Number(row.qtd_viagens)` usado em múltiplos lugares sem checar NaN
**Arquivo:** `app/(dashboard)/fechamentos/actions.ts` linhas 138-139, 228-229
**Problema:** `Number(row.qtd_viagens)` retorna `NaN` se o valor for string mal formada. Dashboard mostra "NaN viagens" ao usuário 55+.
**Proposta:** Usar `Number(row.qtd_viagens) || 0`. Ou melhor, tipar o retorno da RPC corretamente e usar validação via Zod antes de consumir.
**Esforço:** S | **Impacto:** S

---

## 7. Bugs latentes suspeitos (lidos mas não reproduzidos)

1. **`Number(f.litros) || 0` em `bi/actions.ts:717`** pode mascarar dados corrompidos. Um motorista digitando "10,5" (vírgula) em vez de "10.5" vira 0. Silenciosamente.
2. **`lighthouse-*.json` soltos no root** indicam que alguém rodou Lighthouse manualmente via Puppeteer mas nunca criou script permanente. Risco: perda de referência de performance baseline.
3. **`scripts/seed-dados-ricos.js` modificado** (aparece em `git status`): scripts de seed em produção são risco por natureza. Se alguém rodar esse script contra prod, pode sobrescrever dados reais. Sem gate `NODE_ENV !== 'production'` no topo do script é perigoso.
4. **`fechamento_item` com `CASCADE delete`** (assumido pela linha 789 do `fechamentos/actions.ts` que diz "Items are CASCADE deleted"). Se o dono deletar um fechamento `aberto`, os itens somem. OK. Mas se o schema mudar e a cascade sumir, o delete vai falhar por foreign key. Teste de integration capturaria.
5. **`Math.round((v.valor_total * v.percentual_pagamento) / 100)`** em várias actions. Com `percentual_pagamento` decimal (ex: 33.33), arredondamento acumula erro ao longo de várias viagens. Em 100 viagens de R$1000 com 33.33%, o total calculado pode divergir do esperado em centavos. Pequeno mas cegonheiro vai ligar pra reclamar.
6. **`periodo_fim: \`${data.periodo_fim}T23:59:59\`**` em `fechamentos/actions.ts:455` usa string concat em vez de ISO. Se o browser estiver em fuso diferente, edge case no último segundo do dia pode perder viagem.
7. **`alerta_dispensado` table mas nenhum índice visível**. Se um dono dispensa 200 alertas, o query de listar alertas não-dispensados pode ficar lento. Não há teste de performance.
8. **`auth/aceitar-convite/actions.ts`** tem `console.error` mas não reporta pro Sentry. Usuário que tenta aceitar convite e falha fica sem erro visível pro time.

---

## 8. Performance testing

- Lighthouse manuais mostram 98+ consistente (objetivo alcançado).
- **Nenhuma medição de TTFB / query time no servidor.**
- Nenhum load test (artillery, k6) nem mesmo manual com 10 usuários simulando.
- Dashboard tem `Promise.all` em 3 queries paralelas (bom), mas algumas páginas ainda fazem N+1 (especificamente `BI` e `historico financeiro`).

**Recomendação:** rodar `k6` ou `artillery` numa suíte leve simulando 5 donos + 15 motoristas simultâneos antes do piloto. Benchmark de baseline.

---

## 9. Security testing

### Cobertura atual

- RLS: existe em todas as tabelas críticas (grep confirma). Não há teste automatizado que valide.
- Auth: middleware + `getCurrentUsuario` é consistente.
- XSS: `dangerouslySetInnerHTML` só em 2 locais (`app/layout.tsx`), ambos com conteúdo estático seguro (theme detection + SW register). OK.
- SQL injection: Supabase parameteriza tudo. `ilike` usa template literals mas o Supabase client escapa corretamente. OK.
- CSRF: Next.js server actions tem proteção built-in. OK.

### O que falta

1. Teste adversarial de RLS (item 18).
2. Validação server-side de upload (item 3).
3. Rate limiting: nenhum rate limit em server actions. Usuário hostil pode spam `uploadComprovante` ou `createViagem`. Vercel tem default mas é por IP, não por usuário.
4. Secrets: `.env.local` não está no repo (.gitignore confirma). Bom. Mas `SUPABASE_SERVICE_ROLE_KEY` tem que estar em **Vercel env** e não vazar em logs. Não há verificação.

---

## 10. Accessibility testing

- Lighthouse manual: 100. Bom.
- **Sem ferramenta automatizada.** Risco descrito em item 12.
- Componentes críticos para 55+ (inputs grandes, toggle, etc.) não têm teste de `aria-label`, `role`, contraste.

---

## 11. Story lifecycle gaps

### InProgress abandonados ou sem QA

| Story | Status | QA report | Nota |
|---|---|---|---|
| 3.4 (Fluxo de carga) | InProgress | NÃO | Desde quando? |
| 5.1-5.6 (BI) | InProgress | NÃO | 6 stories abertas simultaneamente |
| 7.1, 7.5 | InProgress | NÃO | Épico 7 incompleto |
| 8.1 (Cadastro atômico) | InProgress | NÃO | Código parece completo mas status não atualizado |

### Stories com quality_gate = @qa mas sem QA report

Stories 3.2, 3.3, 4.1, 4.2, 4.3 (último QA wave) estão no `wave6-final-qa-report.md` de 31/03. Desde então nenhuma nova story foi revisada. **12 dias sem pipeline de QA rodando.**

---

## 12. Checklist de Manual Testing Pré-Piloto (30 itens)

Este checklist é pro dono do projeto (ou o tio que vai testar) executar passo a passo antes de soltar pra frota real. Cada item deve ser marcado `[x]` apenas depois de validado em conta real no ambiente Vercel live.

### Setup e acesso
- [ ] 1. Criar conta do dono pela tela pública de cadastro e receber email de confirmação.
- [ ] 2. Login do dono funciona em desktop e mobile (Chrome Android).
- [ ] 3. Logout limpa a sessão e redireciona pra `/login`.
- [ ] 4. Tentar acessar `/dashboard` sem login redireciona pra `/login`.

### Cadastro de estrutura
- [ ] 5. Cadastrar um caminhão real com placa, modelo, RENAVAM. Campos com máscara funcionam.
- [ ] 6. Cadastrar um motorista com CPF real. Toggle "criar acesso" gera credenciais e o email chega.
- [ ] 7. Motorista criado no item 6 consegue logar com a senha temporária recebida.
- [ ] 8. Após login, motorista vê o banner recomendando trocar senha (Story 8.6).
- [ ] 9. Motorista troca senha em `/perfil`. Banner some.

### Fluxo de viagem
- [ ] 10. Dono cria viagem para o motorista (origem, destino, valor, percentual, caminhão).
- [ ] 11. Motorista vê a viagem na lista dele e consegue iniciar (`em_andamento`).
- [ ] 12. Motorista tenta editar origem / destino / valor da viagem e é bloqueado com mensagem clara.
- [ ] 13. Motorista registra gasto (combustível com litros) vinculado à viagem.
- [ ] 14. Upload de comprovante (foto real da bomba) funciona e aparece no gasto.
- [ ] 15. Upload de arquivo muito grande (>10MB) é rejeitado com mensagem amigável.
- [ ] 16. Motorista conclui a viagem, status muda pra `concluida`.

### Fechamento e dinheiro
- [ ] 17. Dono vê na listagem de fechamentos a viagem aparecer como "pendente de acerto".
- [ ] 18. Dono cria fechamento semanal pro motorista. Preview mostra valores corretos (receita, gastos, saldo).
- [ ] 19. Dono fecha o fechamento (`aberto` → `fechado`). Status e timestamps corretos.
- [ ] 20. Dono marca fechamento como pago (`fechado` → `pago`). Viagem NÃO aparece mais em pendentes.
- [ ] 21. Dono tenta deletar um fechamento pago e é bloqueado.
- [ ] 22. Dono reabre fechamento (`pago` → `aberto`). Viagem volta a aparecer em pendentes? Verificar comportamento esperado.
- [ ] 23. PDF do fechamento é gerado, baixa e abre corretamente no mobile.

### Multi-empresa
- [ ] 24. Dono com 2 empresas troca empresa via switcher e os dados do dashboard refletem a empresa ativa (não misturado).
- [ ] 25. Dono ativa modo consolidado (multi-empresa). Soma de receita/custo bate com a soma individual das 2 empresas.
- [ ] 26. Ao sair do modo consolidado, volta ao modo single corretamente.

### BI e alertas
- [ ] 27. Dashboard BI carrega em menos de 3 segundos em conexão 4G.
- [ ] 28. Alerta de combustível aparece quando algum caminhão tem consumo fora do padrão (simular com gasto manual).
- [ ] 29. Dispensar alerta em `alerta_dispensado` faz o alerta sumir da lista.

### Monitoramento
- [ ] 30. Provocar um erro intencional (ex: criar viagem com motorista_id inválido via devtools) e confirmar que aparece no painel Sentry em menos de 1 minuto.

---

## Decisão

**NEEDS_WORK**

O projeto não está pronto pra piloto com frota real até pelo menos os itens CRÍTICO 1 (CI quebrado), CRÍTICO 2 (typecheck/lint vermelho), CRÍTICO 3 (upload sem validação) serem consertados. Recomendo também priorizar CRÍTICO 5 (testes de fechamento) antes de qualquer bug financeiro bater no usuário 55+, e ALTO 7 (Sentry em actions) porque sem isso o piloto vai ser cego.

**Não é catastrófico e nada aqui bloqueia o projeto por semanas.** A maioria dos itens CRÍTICOS é de esforço S ou M. O checklist de manual testing já permite validar o produto hoje mesmo.

---

*QA Audit gerado por Quinn (Guardian) - AIOX QA - 2026-04-12*
