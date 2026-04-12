# Auditoria Arquitetural FrotaViva

**Data:** 2026-04-12
**Auditor:** Aria (Architect, AIOX)
**Escopo:** Auditoria média-profunda da arquitetura do app siga-bem (FrotaViva)
**Modo:** Somente leitura, sem alterações de código
**Stack:** Next.js 16.2.1, React 19.2.4, Supabase SSR 0.9, Tailwind v4, TypeScript 5.9, Vercel

---

## Sumário Executivo

O FrotaViva é um app Next.js 16 maduro, com 16 módulos de feature no dashboard, 24 migrações Supabase, Lighthouse 98, Sentry, CI, multi-empresa e BI. O produto está em produção, tecnicamente sólido no papel principal (RLS, SSR correto, Server Actions tipados com Zod, dedup com React.cache, revalidação consistente) e cumpre o que se propõe.

Do ponto de vista arquitetural, porém, a complexidade do multi-empresa criou uma rachadura estrutural que contamina o código: toda feature que precisa consultar dados agregados tem hoje um arquivo `actions.ts` (Server Actions RLS-aware) e um arquivo `multi-actions.ts` (plain server helpers usando service_role) que espelham ~100% da lógica, diferindo só em como filtram por empresa. Isso dobra a superfície de código sensível, cria risco de divergência silenciosa (alertas, KPIs, fechamentos podem calcular diferente entre modo single e multi sem ninguém notar) e transfere para o caller a responsabilidade de não esquecer o guard de autorização.

Os outros pontos críticos são mais pontuais: alguns arquivos grandes demais (`bi/actions.ts` com 2.069 linhas), tipos duplicados (`Usuario` existe em `types/database.ts` e `types/usuario.ts` divergentes), um arquivo `switch-actions.ts` inteiro de dead code, e uso sistemático do padrão `as unknown as` (62 ocorrências) para contornar tipagem incompleta dos joins Supabase.

O app não usa recursos do Next.js 16 para cache (`'use cache'`, `cacheLife`, `cacheTag`) nem PPR. Toda renderização dinâmica bate no banco a cada request, com a única otimização sendo `React.cache` para dedup dentro do mesmo request. Isso é defensável (dados transacionais, RLS complexa), mas é uma decisão explícita que deveria estar documentada.

Nada disso é bloqueante. O produto está vivo e funciona. Mas a dívida técnica está concentrada em pontos que vão cobrar caro quando a próxima feature grande precisar tocar multi-empresa (Copilot, por exemplo), e antes do piloto real com frotas externas vale endereçar os itens CRÍTICO e ALTO.

---

## Visão Geral da Estrutura

```
siga-bem/
  app/
    (auth)/                 # rotas públicas (login, signup, aceitar-convite)
    (dashboard)/            # 16 features com RLS + multi-empresa
      bi/                   # actions.ts (2069) + multi-actions.ts (1105) + page.tsx
      caminhoes/
      configuracoes/
      dashboard/            # actions.ts (379) + multi-actions.ts (212) SEM 'use server'
      empresa/              # actions.ts + switch/actions.ts + switch-actions.ts (duplicado)
      fechamentos/          # actions.ts (802) + multi-actions.ts (93)
      financeiro/
      gastos/               # actions.ts (598)
      motoristas/
      onboarding/
      perfil/
      usuarios/
      viagens/              # actions.ts (783) + multi-actions.ts (57)
      vinculos/
      layout.tsx
    api/
      auth/signout/route.ts # único Route Handler
    auth/
    layout.tsx, error.tsx, global-error.tsx, not-found.tsx, page.tsx
  lib/
    auth/                   # get-user-role, check-must-change-password
    email/
    queries/
      combustivel-queries.ts
      empresas.ts
      gastos.ts
      multi-empresa.ts      # context builder
      multi-empresa-query.ts # queryMultiEmpresa helper
    supabase/
      client.ts, server.ts, admin.ts, middleware.ts
    utils/                  # 20 utils de formatação, validação, cálculo
    validations/
  types/                    # 16 arquivos de tipo, alguns duplicados/divergentes
  middleware.ts             # updateSession chamada por todas as rotas protegidas
  next.config.ts            # Turbopack + Sentry + headers
  instrumentation.ts        # Sentry register + onRequestError
```

**Cobertura de testes:** 8 arquivos em `__tests__/lib/utils/` testando apenas formatação e validação puras. Nenhum teste para actions, queries, RLS, ou componentes. Jest configurado mas não é blocker em CI crítico.

---

## Achados Classificados

### Legenda
- **Impacto (S/M/L):** tamanho do benefício ao corrigir
- **Esforço (S/M/L):** custo estimado para endereçar
- **Severidade:** CRÍTICO / ALTO / MÉDIO / BAIXO

---

### 1. CRÍTICO - Duplicação massiva entre `actions.ts` e `multi-actions.ts`

**Arquivos envolvidos:**
- `app/(dashboard)/bi/actions.ts` (2069 linhas) vs `app/(dashboard)/bi/multi-actions.ts` (1105 linhas)
- `app/(dashboard)/fechamentos/actions.ts` (802) vs `multi-actions.ts` (93)
- `app/(dashboard)/dashboard/actions.ts` (379) vs `multi-actions.ts` (212)
- `app/(dashboard)/viagens/actions.ts` (783) vs `multi-actions.ts` (57)

**Problema:**
Toda feature que expõe dados lidos pelo dashboard/BI tem duas implementações paralelas da mesma query:

1. Uma em `actions.ts` com `'use server'`, usando `createClient()` (SSR, RLS ligado), com guards `getCurrentUsuario() + role check` e filtro implícito via RLS.
2. Outra em `multi-actions.ts` sem `'use server'`, recebendo `(admin: SupabaseClient, empresaId: string)` como parâmetros, RLS desligada (usa service_role), com filtro explícito `.eq('empresa_id', empresaId)`.

Comparando `getBIKpis` (`bi/actions.ts` linhas 91 a 199) com `getBIKpisForEmpresa` (`bi/multi-actions.ts` linhas 72 a 150): a lógica de cálculo de receita, custos, margem média, gasto-por-viagem é 100% idêntica. A única diferença é:
- quem fornece o supabase client
- adicionar ou não `.eq('empresa_id', empresaId)`
- o guard `requireDono()` é feito no single, no multi é delegado ao `queryMultiEmpresa`

Mesma coisa vale para `getViagensPendentesAcerto` vs `getViagensPendentesAcertoForEmpresa` em fechamentos, `getBIMargemMotoristas` vs `getBIMargemMotoristasForEmpresa`, etc.

**Impacto:**
- **Divergência silenciosa:** qualquer ajuste de cálculo (ex: a mudança em curso de "só considerar fechamentos pagos") precisa ser replicada nos dois lados. Basta esquecer um e o modo multi-empresa fica errado sem ninguém ver.
- **Segurança transferida pro caller:** o multi-actions bypassa RLS e confia que o `queryMultiEmpresa` validou ownership via `getMultiEmpresaContext`. Se alguém importar `getBIKpisForEmpresa` direto de outro lugar sem passar pelo wrapper, vira vulnerabilidade de leitura cross-tenant. Hoje o controle é convenção, não tipo.
- **Manutenção dobrada:** ~4.450 linhas totais em actions, provavelmente ~60% é lógica que poderia morar em um lugar só.
- **Onboarding lento:** dev novo precisa entender duas versões de cada função antes de mexer.

**Rationale da arquitetura atual:**
O comentário em `lib/queries/multi-empresa-query.ts` linha 10-12 explica a decisão: usar admin client "avoids fn_switch_empresa, React.cache issues, and context-switching bugs". Ou seja, tentaram usar a mesma função trocando o contexto da empresa ativa via RPC e deu ruim (bugs de cache, context stale). A solução foi partir em dois caminhos.

A decisão é defensável, mas a implementação duplicou em vez de abstrair.

**Proposta:**
Criar uma camada de repositório única por domínio que recebe o `empresa_id` como parâmetro explícito sempre:

```ts
// lib/repositories/bi-repository.ts (exemplo estrutural, não código final)
async function fetchKpisForEmpresa(
  supabase: SupabaseClient,
  empresaId: string,
  filtros: BIFiltros,
): Promise<BIKpis> { /* lógica única */ }
```

Os dois callers atuais viram thin wrappers:

```ts
// bi/actions.ts (Server Action com auth guard)
export async function getBIKpis(filtros: BIFiltros) {
  const usuario = await requireDono();
  const supabase = await createClient();
  return { data: await fetchKpisForEmpresa(supabase, usuario.empresa_id, filtros), error: null };
}

// bi/multi-actions.ts vira só o wrapper do queryMultiEmpresa
// ou é eliminado e queryMultiEmpresa chama fetchKpisForEmpresa diretamente
```

A lógica de cálculo fica em um lugar, RLS vs service_role vira só qual supabase client é passado, e o guard vive onde deve viver (no Server Action).

Alternativa mais radical: eliminar o `multi-actions` e fazer `queryMultiEmpresa` sempre passar pelo client RLS usando o token do usuário com contexto `selected_empresas` aplicado no RLS (mas isso requer mudança no SQL). A primeira alternativa é menos invasiva.

**Esforço:** L (refactor grande, toca 4 domínios principais)
**Impacto:** L (reduz ~40% da superfície de actions, elimina classe inteira de bugs)

---

### 2. CRÍTICO - Naming inconsistente e perigoso em arquivos `actions.ts`

**Arquivos:**
- `app/(dashboard)/dashboard/actions.ts` (sem `'use server'`)
- `app/(dashboard)/dashboard/multi-actions.ts` (sem `'use server'`)
- `app/(dashboard)/bi/multi-actions.ts` (sem `'use server'`)
- `app/(dashboard)/fechamentos/multi-actions.ts` (sem `'use server'`)
- `app/(dashboard)/viagens/multi-actions.ts` (sem `'use server'`)

**Problema:**
Todo arquivo chamado `actions.ts` ou `multi-actions.ts` implica, pela convenção do App Router, Server Actions (funções que podem ser importadas do cliente e viram endpoints RPC automáticos). Mas na prática só os 11 `actions.ts` tradicionais têm a diretiva `'use server'`. Os cinco acima são módulos server-side puros que nunca deveriam ser chamados do cliente, mas têm nome que sugere o contrário.

O arquivo mais alarmante é `dashboard/actions.ts`: não tem `'use server'`, mas tem `export` de funções com nomes de Server Action. Ele é importado por `dashboard/page.tsx` (Server Component), então funciona. Mas se um dev criar um Client Component e fizer `import { getDashboardData } from '@/app/(dashboard)/dashboard/actions'`, vai receber um erro de build do Next estranho, ou pior, vai virar endpoint RPC automaticamente em alguma versão futura.

**Impacto:**
- Confusão cognitiva grave (dev espera uma coisa, código é outra)
- Risco latente de virar endpoint RPC inadvertidamente em upgrade de Next.js
- `multi-actions.ts` exposto via service_role sem `'use server'` é a pior combinação possível: se alguém adicionar a diretiva por engano, expõe endpoints RPC que bypassam RLS

**Proposta:**
Renomear todos os `multi-actions.ts` para algo que não implique Server Action, por exemplo:
- `bi/multi-actions.ts` → `bi/multi-queries.ts` ou mover para `lib/queries/bi-multi.ts`
- `fechamentos/multi-actions.ts` → `fechamentos/multi-queries.ts`
- `dashboard/actions.ts` → `dashboard/queries.ts` ou `dashboard/data.ts` (é puro data fetching, não é mutação)
- `dashboard/multi-actions.ts` → `dashboard/multi-queries.ts`

Convenção explícita: **só arquivos com `'use server'` se chamam `actions.ts`**. O resto vira `queries.ts`, `data.ts` ou vive em `lib/queries/`.

Item 1 e 2 se reforçam: se o refactor do item 1 for feito, a renomeação do item 2 acontece junto porque os multi-actions somem.

**Esforço:** S (rename + ajuste de imports)
**Impacto:** M (elimina ambiguidade crítica e risco futuro)

---

### 3. CRÍTICO - Dead code completo em `empresa/switch-actions.ts`

**Arquivo:** `app/(dashboard)/empresa/switch-actions.ts` (64 linhas)

**Problema:**
O arquivo define duas Server Actions (`trocarEmpresa` e `getEmpresasDoUsuario`) que não são importadas de lugar nenhum. Toda a codebase usa `switchEmpresa` de `app/(dashboard)/empresa/switch/actions.ts` (outro arquivo, nome parecido). O comentário em `components/empresa/EmpresaSelectForCreate.tsx` linha 41 inclusive diz "Use trocarEmpresa pattern instead" mas na linha de baixo importa `switchEmpresa` de qualquer jeito.

Evidência via grep:
- `switchEmpresa` é importado em 5 componentes (`EmpresaCard`, `EmpresaSelectForCreate`, `EmpresaSwitchButton`, `EmpresaSwitcher`)
- `trocarEmpresa` tem 0 imports fora do próprio arquivo
- `getEmpresasDoUsuario` tem 0 imports

**Impacto:**
- Leva dev novo a acreditar que existem 2 funcionalidades quando tem só uma
- Mantém superfície de ataque (Server Actions são endpoints HTTP mesmo sem chamador)
- Comentários internos mencionam uma função que não é usada, desorientando leitura

**Proposta:**
Deletar `app/(dashboard)/empresa/switch-actions.ts`. Atualizar o comentário enganoso em `EmpresaSelectForCreate.tsx` (mas o código já faz o certo, é só o comentário que está errado).

**Esforço:** S (delete + update comment)
**Impacto:** M (limpa ambiguidade e remove endpoint desnecessário)

---

### 4. ALTO - Tipos `Usuario` duplicados e divergentes

**Arquivos:**
- `types/database.ts` linhas 35-48 (interface `Usuario`)
- `types/usuario.ts` linhas 8-22 (interface `Usuario`)

**Problema:**
Existem duas interfaces `Usuario` na codebase:

```ts
// types/database.ts
export interface Usuario {
  id, auth_id, empresa_id, motorista_id, nome, email, telefone, role, ativo,
  ultima_empresa_id,  // ← presente
  created_at, updated_at,
  // selected_empresas AUSENTE
}

// types/usuario.ts
export interface Usuario {
  id, auth_id, empresa_id, motorista_id, nome, email, telefone, role, ativo,
  ultima_empresa_id,
  selected_empresas: string[] | null,  // ← só aqui
  created_at, updated_at,
}
```

Além disso, o comentário no topo de `types/database.ts` diz "These are placeholder types. In production, generate with: npx supabase gen types typescript". Ou seja, nunca foi regenerado. O schema real provavelmente tem mais campos (ex: `must_change_password` que é usado em `checkMustChangePassword`).

**Impacto:**
- `getCurrentUsuario()` em `lib/auth/get-user-role.ts` seleciona `selected_empresas` mas o tipo `Usuario` de `types/usuario.ts` é usado, então dá certo. Mas qualquer código que importe de `types/database.ts` e lide com usuário vai ver um modelo incompleto.
- Drift silencioso: campo novo no DB não aparece em nenhum lugar do código TS até alguém notar via bug em produção.
- `ativa` (empresa) é `boolean` simples em ambos os tipos, mas o código também usa `empresa_ativa` derivado via join em outros tipos (`UserEmpresa`), criando mais divergência semântica.

**Proposta:**
Adotar o fluxo oficial do Supabase: `npx supabase gen types typescript --project-id <ref> > types/supabase.ts` e importar os tipos gerados em todos os lugares que hoje usam `database.ts` ou `usuario.ts` como fonte. Manter só tipos de DTO (form data, list items, request/response) em arquivos manuais.

Quick win: enquanto não regenera, pelo menos consolidar as duas versões em `types/usuario.ts` e apagar de `database.ts`.

**Esforço:** M (gera tipos + refactor de imports)
**Impacto:** L (elimina drift permanente, remove 62 `as unknown as` spalhos pela codebase)

---

### 5. ALTO - `bi/actions.ts` com 2069 linhas é incomprável para humanos

**Arquivo:** `app/(dashboard)/bi/actions.ts`

**Problema:**
Um único arquivo com 16 Server Actions exportadas, ~2.100 linhas, misturando:
- Filter options
- KPI hero metrics
- Margem por motorista
- Breakdown por categoria
- Ranking caminhões
- Ranking motoristas
- Tendência mensal
- Eficiência combustível
- Manutenções
- Alertas de anomalia (com threshold dinâmico via std dev)
- Estimativa de rota
- Histórico de rotas
- Benchmark setor (+ função auxiliar `calcularMetricasProprias` de 147 linhas)

Cada seção tem duplicada em `multi-actions.ts` (1105 linhas, item 1). Navegar no arquivo exige scroll violento, e o risco de adicionar uma nova função no meio sem notar que ela conflita com outra é alto.

O mesmo padrão aparece em menor escala em `fechamentos/actions.ts` (802) e `viagens/actions.ts` (783).

**Impacto:**
- Dev não consegue segurar todo o contexto mental
- Git diffs gigantes em qualquer mudança, aumentando chance de conflito em branches paralelas
- Code review superficial (ninguém lê 2000 linhas com atenção)
- Testes unitários efetivamente impossíveis (arquivo monolítico acoplado ao supabase)

**Proposta:**
Quebrar `bi/actions.ts` por domínio funcional em `app/(dashboard)/bi/actions/`:
- `filters.ts` — getBIFilterOptions
- `kpis.ts` — getBIKpis
- `margem.ts` — getBIMargemMotoristas
- `categorias.ts` — getBICategoriasBreakdown
- `rankings.ts` — getBIRankingCaminhoes + getBIEficienciaMotoristas
- `tendencia.ts` — getBITendenciaMensal
- `combustivel.ts` — getBIEficienciaCombustivel
- `manutencoes.ts` — getBIManutencoes
- `alertas.ts` — getBIAlertas
- `rotas.ts` — getBIEstimativa + getBIHistoricoRotas
- `benchmark.ts` — getBenchmarkSetor + calcularMetricasProprias
- `index.ts` — re-export barrel para manter imports atuais funcionando

Todos os arquivos começam com `'use server'` e importam guard compartilhado `requireDono()` de um `_shared.ts`.

Mesma abordagem para `fechamentos/actions.ts` (quebrar em `crud.ts`, `preview.ts`, `status-transitions.ts`, `pendentes.ts`).

**Esforço:** M (refactor mecânico sem mudar lógica)
**Impacto:** M (diff futuro fica revisável, testes viram possíveis)

---

### 6. ALTO - Uso sistemático de `as unknown as` para contornar tipagem de joins Supabase

**Ocorrências:** 62 em `app/**/*.ts(x)`

**Problema:**
Toda vez que uma query faz `.select('...motorista ( nome )')` ou similar, o tipo retornado pelo Supabase é `any[]` ou um array (porque é 1-to-many por padrão), e o código trata como objeto singular:

```ts
// Pattern em viagens, fechamentos, bi, dashboard
const mot = row.motorista as unknown as { nome: string } | null;
const cam = row.caminhao as unknown as { placa: string } | null;
```

Isso acontece porque:
1. Os tipos gerados do Supabase (que deveriam existir via gen types) estão ausentes (ver item 4)
2. A relação foreign key é 1:1 no domínio, mas o Supabase TS client trata como array por não conhecer a cardinalidade
3. O dev contornou com double-cast, que é a forma mais agressiva possível de burlar o TS

**Impacto:**
- Qualquer mudança de schema (remover `nome` de `motorista`, ex) não é pega em compile time
- Erros de runtime silenciosos se o join vier vazio (código já trata `?? 'Desconhecido'` na maioria dos lugares, mas não é consistente)
- Se um dia o Supabase retornar array (ex: view materializada), o código quebra sem warning

**Proposta:**
- Curto prazo: gerar tipos via `supabase gen types typescript` (casa com item 4) para obter os tipos de relacionamento corretos
- Médio prazo: criar uma pequena utility `singleRelation<T>(value: T | T[] | null): T | null` em `lib/utils/supabase-joins.ts` que documenta a intenção e centraliza o cast. Os 62 call sites passam a usar ela.
- Longo prazo: auditar as queries e quando possível usar `!inner` ou view SQL que retorna shape flat

**Esforço:** M
**Impacto:** M (reduz risco silent failure em schema changes)

---

### 7. ALTO - Padrão de erro inconsistente: exceptions vs `{ data, error }`

**Observado em:**
- `bi/actions.ts` usa try/catch + `throw new Error` internamente, mas retorna `{ data, error }` (mistura 36 throws + 78 returns de error)
- `fechamentos/actions.ts` retorna `{ success, error, fieldErrors }`
- `viagens/actions.ts` mistura `{ data, error }` e `{ success, error }` dependendo da operação
- `lib/queries/empresas.ts` retorna array vazio em erro silenciosamente (`if (error || !data) return []`)

**Problema:**
Não há contrato claro sobre como um erro deve fluir do banco até o componente. Três padrões coexistem:

1. **Result object (data+error):** usado nas actions de leitura. Componentes checam `result.error && <ErrorBanner />`. Bom para GET.
2. **Action result (success+error+fieldErrors):** usado nas actions de escrita/form submit. Casa com `useActionState` do React 19. Bom para mutação.
3. **Silent fallback (return [] on error):** usado em algumas queries utilitárias. Esconde o erro e confunde o caller.

A mistura não é um problema fatal, mas tem três sintomas:
- Componentes precisam conhecer qual padrão cada action usa
- O padrão "silent fallback" esconde bugs (ex: se `fn_get_user_empresas` falhar, usuário vê "Nenhuma empresa" em vez de um erro de DB)
- Sentry captura exceções do `throw`, mas não captura os errors retornados em `{ data, error }`, então só metade dos erros vai pra observabilidade

**Proposta:**
Padronizar em dois contratos explícitos, documentados em `docs/contracts.md`:

```ts
// Read result (para queries)
type ReadResult<T> = { data: T; error: null } | { data: null; error: string };

// Mutation result (para Server Actions de form)
type MutationResult<T> =
  | { success: true; data: T }
  | { success: false; error: string; fieldErrors?: Record<string, string> };
```

Erros inesperados (bugs de DB, RPC quebrada) devem ser thrown para pegar no `error.tsx` da rota + Sentry via `onRequestError` em `instrumentation.ts`. Erros esperados (validação, permissão) retornam via result.

Eliminar silent fallbacks: `getUserEmpresas()` deveria retornar `ReadResult<UserEmpresa[]>` em vez de `[]` em erro.

**Esforço:** M (contrato + refactor gradual das queries mais críticas)
**Impacto:** M (melhora observabilidade e previsibilidade)

---

### 8. ALTO - `if (multiCtx.isMultiEmpresa)` branching replicado em ~15 lugares

**Ocorrências:** 23 em 13 arquivos diferentes

**Problema:**
Cada página/action que precisa lidar com multi-empresa tem hoje um `if/else` mais ou menos assim:

```ts
if (multiCtx.isMultiEmpresa) {
  // caminho 1: usa queryMultiEmpresa + agregação
  const results = await queryMultiEmpresa((admin, eid) => getXxxForEmpresa(admin, eid));
  data = aggregateResults(results);
} else {
  // caminho 2: usa action normal com RLS
  data = await getXxx();
}
```

O `bi/page.tsx` linhas 184-282 é o exemplo mais extremo: 100 linhas de branching com 11 queries cada lado. Dentro ainda tem funções helper privadas de agregação (`aggregateKpis`, `aggregateTendencia`, `aggregateCategorias`, `dedup`) definidas inline no arquivo da página.

**Impacto:**
- Toda feature nova que queira suportar multi-empresa duplica a estrutura
- A lógica de agregação (merge de KPIs, dedup de filter options, soma de categorias por mês) vive no Server Component da página, misturando renderização com regra de negócio
- Chance de divergência: alguém adiciona um novo KPI no `actions.ts` single e esquece de ajustar o `aggregateKpis` do `bi/page.tsx`

**Proposta:**
Criar um helper unificado que esconde o branching, já acoplado com agregação tipada:

```ts
// lib/queries/fetch-bi.ts (esqueleto conceitual)
export async function fetchBIKpis(filtros: BIFiltros): Promise<BIKpis> {
  const ctx = await getMultiEmpresaContext();
  const results = await queryMultiEmpresa((admin, eid) =>
    fetchKpisForEmpresa(admin, eid, filtros),
  );
  return ctx.isMultiEmpresa ? aggregateKpis(results) : results[0].data;
}
```

A página só chama `await fetchBIKpis(filtros)` e não se importa se é single ou multi. Isso combina com item 1 (consolidar a lógica de cálculo em uma camada única) e transforma o branching de 11 blocos em 0.

**Esforço:** L (refactor de todas as páginas que usam multi)
**Impacto:** L (simplifica radicalmente o mental model de multi-empresa)

---

### 9. MÉDIO - Diff em andamento no `fechamentos/actions.ts` (pagos-only) não está em ambos os lados

**Arquivos:**
- `app/(dashboard)/fechamentos/actions.ts` linhas 291-315 (modificado)
- `app/(dashboard)/fechamentos/multi-actions.ts` linhas 29-56 (modificado)
- `scripts/seed-dados-ricos.js` (modificado)

**Observação:**
Já sei pelo briefing que esta é mudança deliberada: "viagens pendentes" agora só considera fechamentos com status `pago` como bloqueantes (antes considerava qualquer status). O diff muda a query de `fechamento_item` para fazer join lógico com `fechamento.status = 'pago'` via `pagoIds Set`.

Verificado: **ambos os arquivos foram atualizados** (o `multi-actions.ts` também tem o novo `pagoIds` check). O dev lembrou de replicar. Bom.

**Impacto:**
Esse é exatamente o tipo de divergência que o item 1 está alertando: hoje essa mudança precisou ser feita duas vezes. Se algum dia o dev esquecer, o modo multi-empresa volta pro comportamento antigo sem ninguém notar. O risco é estrutural, não uma crítica a esse diff específico.

**Proposta:**
Nenhuma ação nesse diff. Mas serve de case concreto para priorizar item 1 assim que o diff atual estabilizar.

**Esforço:** N/A (informativo)
**Impacto:** N/A (informativo)

---

### 10. MÉDIO - `middleware.ts` usa `getSession()` em vez de `getUser()` (trade-off documentado)

**Arquivo:** `lib/supabase/middleware.ts` linhas 30-45

**Observação:**
O código tem comentário claro explicando o trade-off:

> Use getSession() instead of getUser() in middleware for performance.
> getSession() reads from the cookie locally (no Supabase API round-trip).
> The actual getUser() verification happens in the layout/page via getCurrentUsuario().

Esta decisão é **correta** dado o trade-off de performance (middleware roda em toda request, `getUser()` adiciona latência de ~50-100ms por round-trip ao Supabase Auth API). A proteção real vem em dois lugares: (1) o `getCurrentUsuario()` do layout valida o token de verdade, (2) o RLS no Postgres verifica `auth.uid()` em cada query.

**Risco residual:**
Um token forjado/expirado passa pelo middleware e só é validado no layout. Isso é OK porque não há leak de dados, só atraso na descoberta. Mas vale documentar isso como decisão arquitetural em `docs/architecture/auth-flow.md` para não ser questionado em auditoria de segurança.

**Proposta:**
Criar `docs/architecture/auth-flow.md` documentando:
1. O fluxo de auth completo (login → cookie → middleware → layout → RLS)
2. Por que `getSession()` no middleware é seguro
3. Onde a validação real acontece
4. Como testar que o fluxo não tem gaps

**Esforço:** S (só documentação)
**Impacto:** M (reduz risco de alguém "corrigir" o middleware sem entender o trade-off)

---

### 11. MÉDIO - `next.config.ts`: warning deprecated do Sentry `disableLogger`

**Arquivo:** `next.config.ts` linha 46

**Observação:**
O parâmetro `disableLogger: true` passado para `withSentryConfig` emite warning em build (conforme mencionado no briefing). Esse campo foi renomeado em versões recentes do `@sentry/nextjs` (10.47.x) para `_experimental.disableLogger` ou foi substituído pela auto-detecção.

**Impacto:**
- Warning em todo build de CI
- Em algum upgrade futuro do Sentry, vira erro de build

**Proposta:**
Consultar changelog do `@sentry/nextjs` 10.47 e migrar para a nova forma. Muito provavelmente é só remover o campo (default já é silencioso em produção).

**Esforço:** S
**Impacto:** S

---

### 12. MÉDIO - Zero uso de recursos de cache do Next.js 16

**Observação:**
Busca por `'use cache'`, `cacheLife`, `cacheTag`, `unstable_cache` retornou 0 ocorrências no app. O único mecanismo de cache usado é `React.cache()` (`lib/queries/multi-empresa.ts` e `lib/auth/get-user-role.ts`) para dedup intra-request.

Isso significa que:
- Toda página do dashboard refaz todas as queries a cada navegação
- Dados quase-estáticos (categoria_gasto, caminhões ativos, benchmarks setoriais) são buscados em todo request
- BI com 11 queries pesadas roda do zero sempre que o dono entra na página ou muda filtro
- O banco é o gargalo em qualquer escala > 50 donos ativos simultâneos

**Rationale possível:**
Dados transacionais (viagens, fechamentos, gastos) com RLS complexa são difíceis de cachear com segurança (risco de vazar dados entre empresas). A decisão de não cachear é defensável.

**Mas tem oportunidade real:**
- Benchmark setor (`getBenchmarkSetor`) é dado agregado público, poderia ser cacheado por 24h via `'use cache'` + `cacheLife('hours')`
- Filter options (lista de caminhões ativos, motoristas ativos, categorias) muda raro, pode ser cacheado por empresa com `cacheTag(['filter-opts', empresaId])` e invalidado em CRUD
- Categoria_gasto "seed" (ativas, globais) é praticamente estático

**Impacto:**
- Latência mais alta do que precisa ser
- Custo Supabase proporcional a navegação, não a dados
- Performance degrada linearmente com usuários simultâneos

**Proposta:**
Marcar como exploração técnica pós-piloto, não bloquear lançamento. Começar com 2 experimentos pequenos:
1. `getBenchmarkSetor()` com `'use cache'` + `cacheLife('hours')`
2. `getBIFilterOptions()` com `'use cache'` + `cacheTag('filter-opts-' + empresaId)` e `revalidateTag` nos CRUDs de caminhão/motorista/categoria

Medir impacto no p95 com Speed Insights antes de expandir.

**Esforço:** M (cada caso precisa avaliação de staleness)
**Impacto:** M (ganho de perf mensurável, redução de carga DB)

---

### 13. MÉDIO - `app/(dashboard)/layout.tsx` faz muita coisa e bloqueia render

**Arquivo:** `app/(dashboard)/layout.tsx`

**Problema:**
O layout do dashboard executa serialmente/em paralelo:
1. `getCurrentUsuario()` (já cacheado, OK)
2. `checkMustChangePassword()` (um query extra)
3. `Promise.all([getUserEmpresas(), getViagensEmAndamento(), getMultiEmpresaContext()])` (3 queries)
4. Se `!empresa_id`, chama `fn_switch_empresa` via RPC e redireciona
5. Cria novo `supabase` client e chama `getUser()` de novo (linha 99) para pegar `user_metadata` de onboarding
6. Renderiza com `OnboardingTutorial` dinamicamente importado

O step 5 é redundante: `getCurrentUsuario()` já fez `auth.getUser()` via React.cache. Teoricamente a 2ª chamada retorna o mesmo `user` do cache, mas o código cria um novo client (`createClient()`) o que quebra a dedup e faz round-trip extra.

Além disso, o layout usa `dynamic()` para code-split `MobileSidebar`, `EmpresaSwitcher`, `OnboardingTutorial`, mas ainda assim tem ~240 linhas de JSX + lógica, o que torna o layout lento para renderizar no servidor em todo page view.

**Impacto:**
- ~1 query extra a cada navegação por causa do `getUser()` duplicado
- Layout faz trabalho que poderia ser feito em uma Server Component filha com `<Suspense>` streaming

**Proposta:**
1. Quick fix: em vez de `createClient()` + `auth.getUser()` na linha 98-99, ler direto do `currentUsuario` (que já tem tudo) ou adicionar um campo `user_metadata` no retorno de `getCurrentUsuario`.
2. Refactor médio: extrair o `OnboardingTutorial` render para uma Server Component `<OnboardingGate />` com `<Suspense>` própria. O layout renderiza a shell imediatamente, o onboarding streama depois.

**Esforço:** S para quick fix, M para refactor completo
**Impacto:** S (latência de 1 query poupada por request)

---

### 14. MÉDIO - `bi/actions.ts` faz 3 roundtrips desnecessários em `calcularMetricasProprias`

**Arquivo:** `app/(dashboard)/bi/actions.ts` linhas 1923-2069

**Problema:**
A função helper `calcularMetricasProprias` faz 6 queries em sequência:
1. `caminhao` ativos
2. `viagem` concluídas (sem filtro por caminhao_id, pega todas da base)
3. `gasto` linkado às viagens
4. `categoria_gasto` onde nome ILIKE 'combustivel' (`.limit(1).single()`)
5. `categoria_gasto` onde nome ILIKE 'manutencao' (`.limit(1).single()`)

As queries 4 e 5 são **por request**: toda vez que o BI é carregado, busca as categorias de combustível e manutenção por nome. Isso é 2 queries desnecessárias.

Pior: o `.ilike('nome', 'combustivel')` não considera variações ("Combustível" com acento, "Combustíveis" no plural, "COMBUSTIVEL" caixa alta). O dado está acoplado a uma convenção de naming que não é enforçada no schema.

Também: query 2 busca viagens concluídas "sem filtro por empresa" parece, mas na verdade confia no RLS para filtrar. Isso funciona porque `calcularMetricasProprias` é chamada do lado single-empresa. Mas do lado `calcularMetricasPropriasForEmpresa` em multi-actions, se existir o mesmo padrão, bypassa RLS e não filtra por empresa_id. **Verificar se esse bug existe no multi.**

**Impacto:**
- Performance: 2 queries/request desnecessárias no BI
- Fragilidade: renomear uma categoria no seed quebra os cálculos de benchmark silenciosamente
- Potencial leak entre empresas se versão multi tiver o mesmo padrão (precisa auditar)

**Proposta:**
1. Mover "categoria combustível ID" e "categoria manutenção ID" para constantes ou uma coluna `tipo` enum no schema `categoria_gasto` (`tipo: 'combustivel' | 'manutencao' | 'geral'`). Query passa a filtrar por `tipo`.
2. Cachear o lookup via `'use cache'` + `cacheLife('days')` se mantiver o lookup por nome.
3. Auditar o equivalente em `multi-actions.ts` para garantir que `empresa_id` está no filtro.

**Esforço:** M (mudança de schema + migration)
**Impacto:** M

---

### 15. MÉDIO - Testes cobrem só utils, zero cobertura de actions e RLS

**Arquivo:** `__tests__/lib/utils/`

**Problema:**
- 8 arquivos de teste, todos em `lib/utils/` (currency, format-date, validate-cnpj/cpf/placa/renavam, lgpd, compress-image)
- Zero testes para Server Actions
- Zero testes para RLS policies (que são a primeira linha de defesa de multi-tenancy)
- Zero testes de integração Supabase → action → componente

Para um produto em produção com multi-empresa e dados financeiros, a falta de testes para RLS é o maior gap de qualidade estrutural.

**Impacto:**
- Qualquer refactor do item 1 (unificação actions/multi-actions) é arriscado sem suíte de testes
- RLS é silencioso: um drop de policy não quebra nada no código, só começa a vazar
- Regressões de cálculo financeiro (valor_motorista, margem, pagos-only) não são pegas em CI

**Proposta:**
Antes do piloto real, adicionar:
1. Suíte de teste de integração usando `supabase start` local que testa RLS:
   - User A da empresa X não consegue ler `viagem` da empresa Y
   - Motorista não consegue criar `fechamento`
   - Admin não consegue reabrir fechamento (só dono)
2. Teste de cálculo para `calcular_fechamento_total` e `aggregateKpis` (itens funcionais puros, fácil testar)
3. Snapshot test dos retornos da action `getViagensPendentesAcerto` para pegar regressões

**Esforço:** L (setup de supabase local + suíte de RLS)
**Impacto:** L (blocker real para piloto com clientes externos)

---

### 16. BAIXO - `viewport` export no root layout com `themeColor` hardcoded

**Arquivo:** `app/layout.tsx` linhas 51-55

**Observação:**
O `themeColor: '#1B3A4B'` é dark navy do logo, mas o app suporta light/dark via `ThemeToggle` + `localStorage`. O PWA manifesto e browser address bar vão mostrar sempre o dark, mesmo no modo claro.

**Impacto:** cosmético, UX do PWA.

**Proposta:** usar `themeColor` como array com media queries:
```ts
export const viewport: Viewport = {
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#ffffff' },
    { media: '(prefers-color-scheme: dark)', color: '#1B3A4B' },
  ],
  width: 'device-width',
  initialScale: 1,
};
```

**Esforço:** S
**Impacto:** S

---

### 17. BAIXO - Scripts inline em `<head>` do layout root

**Arquivo:** `app/layout.tsx` linhas 77-107

**Observação:**
Dois scripts inline via `dangerouslySetInnerHTML` no `<head>`:
1. Tema inicial (leitura do localStorage, evita FOUC) - aceitável
2. Service worker registration - deveria usar `next/script` com strategy `afterInteractive`

O SW registration bloqueia brevemente o parser em vez de rodar depois que a página está interativa, contribuindo para TBT mais alto.

**Proposta:**
Mover o bloco do SW para um Client Component com `useEffect(() => { navigator.serviceWorker.register('/sw.js') }, [])` ou usar `<Script src="/register-sw.js" strategy="afterInteractive" />`.

**Esforço:** S
**Impacto:** S

---

### 18. BAIXO - `getUserRole()` em `lib/auth/get-user-role.ts` exporta `'use server'` mas é só um query helper

**Arquivo:** `lib/auth/get-user-role.ts` linha 1

**Observação:**
O arquivo começa com `'use server'` mas só `getCurrentUsuario` é usado via import direto em Server Components. Nenhuma das funções é chamada via Server Action (do cliente). Declarar `'use server'` num arquivo de query fica com:
- Todas as funções exportadas viram automaticamente endpoints RPC de Server Action, mesmo as não-chamadas do cliente
- Isso expande superfície de ataque sem benefício
- `requireRole` exportada como Server Action é especialmente estranha porque só faz throw

**Proposta:**
Remover `'use server'` do arquivo. Transformar em módulo server-only comum (roda apenas no servidor porque importa `cookies()`). Se precisar de Server Action de verdade (ex: componente cliente quer checar role), criar ação dedicada em `app/(dashboard)/actions/auth.ts` com `'use server'` explícito que chama a função do helper.

Curioso porque o arquivo tem `'use server'` mas ainda usa `cache` do React, que funciona. Mas é um smell.

**Esforço:** S
**Impacto:** S

---

### 19. BAIXO - Chaves `NEXT_PUBLIC_SUPABASE_URL!` e `NEXT_PUBLIC_SUPABASE_ANON_KEY!` sem validação central

**Arquivos:** `lib/supabase/server.ts`, `lib/supabase/middleware.ts`, `lib/supabase/client.ts`

**Observação:**
Todos os 3 arquivos de Supabase usam non-null assertion `!` em `process.env.X!`. Se em algum deploy uma variável sumir, o erro aparece em runtime em algum ponto aleatório do app, com stack trace pouco claro.

O `lib/supabase/admin.ts` faz o certo: valida as duas envs e joga erro explícito com mensagem legível.

**Proposta:**
Criar `lib/env.ts` que valida todas as envs com Zod no startup do app (idealmente em `instrumentation.ts.register()` para falhar o boot em vez de no primeiro request):

```ts
// lib/env.ts
const envSchema = z.object({
  NEXT_PUBLIC_SUPABASE_URL: z.string().url(),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().min(1),
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1),
  NEXT_PUBLIC_SITE_URL: z.string().url().optional(),
  SENTRY_ORG: z.string().optional(),
  SENTRY_PROJECT: z.string().optional(),
});
export const env = envSchema.parse(process.env);
```

Todos os arquivos de supabase importam `env` em vez de `process.env.X!`.

**Esforço:** S
**Impacto:** M (boot fail-fast em deploy ruim, em vez de descobrir em produção)

---

### 20. BAIXO - Matcher do middleware lista rotas manualmente (propenso a esquecer)

**Arquivo:** `middleware.ts` linhas 8-25

**Observação:**
O matcher lista explicitamente todas as rotas protegidas:
```ts
matcher: [
  '/dashboard/:path*',
  '/selecionar-empresa/:path*',
  '/usuarios/:path*',
  // ... 14 rotas
]
```

Quando uma feature nova é adicionada (ex: `/relatorios`), o dev precisa lembrar de adicionar ela no matcher. Se esquecer, a rota fica sem proteção de auth (mas o layout ainda chama `getCurrentUsuario`, então redireciona).

**Proposta:**
Inverter a lógica: proteger tudo por default, whitelist de rotas públicas:
```ts
export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|login|signup|aceitar-convite|api/auth|monitoring|logos|icons|.*\\.(?:svg|png|jpg|webp|js|css|woff2?)$).*)',
  ],
};
```

Isso protege tudo que não é asset estático ou rota pública. Feature nova fica protegida por default.

**Esforço:** S
**Impacto:** M (elimina classe de bug "esqueci o matcher")

---

### 21. BAIXO - `lighthouse-*.json` sujam o repo e não estão no gitignore

**Arquivo:** raiz do projeto

**Observação:**
Há 9 arquivos `lighthouse-*.json` + `.html` na raiz, totalizando ~4 MB. O `git status` marca 7 deles como untracked. Essa regra está nas rules de Tailwind v4 (`.claude/rules/tailwind-v4-turbopack.md` item "Checklist para novos projetos") mas não foi aplicada aqui.

**Proposta:**
Adicionar ao `.gitignore`:
```
lighthouse-*.json
lighthouse-*.html
```

**Esforço:** S
**Impacto:** S

---

### 22. BAIXO - `tsconfig.json` com `target: ES2017` desatualizado

**Arquivo:** `tsconfig.json` linha 3

**Observação:**
Target `ES2017` era o padrão de 2020. Em 2026 com Node 22 e Next 16 rodando em Vercel Edge, pode-se usar `ES2022` ou `ESNext` sem risco. Isso habilita `globalThis`, `Object.hasOwn`, optional chaining assignment, etc., sem transpilação.

**Proposta:**
Atualizar para `"target": "ES2022"`. Checar se break alguma coisa no build (improvável com Next 16 + TS 5.9).

**Esforço:** S
**Impacto:** S

---

## Resumo por Severidade

| # | Severidade | Problema | Esforço | Impacto |
|---|-----------|----------|---------|---------|
| 1 | CRÍTICO | Duplicação massiva actions.ts vs multi-actions.ts | L | L |
| 2 | CRÍTICO | Naming de arquivos mentiroso (sem `'use server'`) | S | M |
| 3 | CRÍTICO | Dead code completo em empresa/switch-actions.ts | S | M |
| 4 | ALTO | Tipos Usuario duplicados e divergentes | M | L |
| 5 | ALTO | bi/actions.ts com 2069 linhas | M | M |
| 6 | ALTO | 62 `as unknown as` em joins Supabase | M | M |
| 7 | ALTO | Padrão de erro inconsistente (3 convenções) | M | M |
| 8 | ALTO | `if (isMultiEmpresa)` branching em 13 arquivos | L | L |
| 9 | MÉDIO | Diff pagos-only precisou ser feito 2x (evidência de #1) | - | - |
| 10 | MÉDIO | middleware usa getSession(), sem doc de trade-off | S | M |
| 11 | MÉDIO | Sentry disableLogger deprecation warning | S | S |
| 12 | MÉDIO | Zero uso de cache do Next.js 16 | M | M |
| 13 | MÉDIO | Dashboard layout faz query redundante (getUser 2x) | S | S |
| 14 | MÉDIO | calcularMetricasProprias com 2 queries desnecessárias | M | M |
| 15 | MÉDIO | Testes cobrem só utils, zero teste de RLS | L | L |
| 16 | BAIXO | themeColor hardcoded (não respeita light/dark) | S | S |
| 17 | BAIXO | Scripts inline em vez de next/script | S | S |
| 18 | BAIXO | get-user-role.ts com `'use server'` desnecessário | S | S |
| 19 | BAIXO | Sem validação central de env vars | S | M |
| 20 | BAIXO | Matcher do middleware manual propenso a erro | S | M |
| 21 | BAIXO | lighthouse-*.json sujando repo | S | S |
| 22 | BAIXO | tsconfig target ES2017 desatualizado | S | S |

---

## Roadmap Sugerido

### Antes do piloto real (prioridade máxima)
- **#3** Deletar dead code de `switch-actions.ts` (S/M) - 30 min
- **#2** Renomear `multi-actions.ts` → `multi-queries.ts` ou mover para `lib/queries/` (S/M) - 2h
- **#15** Suíte mínima de testes de RLS (L/L) - 1 semana
- **#19** Validação central de env vars (S/M) - 2h
- **#20** Matcher do middleware inverso (S/M) - 1h
- **#21** + **#22** Housekeeping (S/S) - 30 min

### Pós-piloto, antes de escalar
- **#1** Unificar actions.ts com multi-actions.ts via camada de repositório (L/L) - 1 a 2 semanas
- **#4** Gerar tipos Supabase e consolidar Usuario (M/L) - 3 dias
- **#8** Unificar branching multi-empresa em helper único (L/L) - combinado com #1
- **#5** Quebrar bi/actions.ts por domínio (M/M) - 3 dias

### Otimização contínua
- **#6** as unknown as → utility helper (M/M)
- **#7** Padronizar contratos de erro (M/M)
- **#10** Doc de auth flow (S/M)
- **#12** Experimentos com 'use cache' em benchmark e filter options (M/M)
- **#13** Layout refactor com Suspense (S-M/S)
- **#14** Schema: coluna tipo em categoria_gasto (M/M)

### Baixa prioridade
- **#11** Sentry disableLogger deprecation (S/S)
- **#16** themeColor responsivo (S/S)
- **#17** next/script para SW (S/S)
- **#18** Remover use server de get-user-role (S/S)

---

## Pontos Fortes do Projeto (para não perder de vista)

- RLS bem estruturada, filtro implícito por `empresa_id` em todas as queries single-empresa
- React.cache aplicado corretamente em `getCurrentUsuario` e `getMultiEmpresaContext`
- Zod validando todo form submit nos Server Actions de escrita
- Sentry + instrumentation.ts + onRequestError bem configurado
- CI com lint, typecheck, jest rodando
- Lighthouse 98 reportado, preload de assets críticos, dynamic imports no layout
- 24 migrations Supabase com naming cronológico consistente
- Separação de auth e dashboard via route groups `(auth)` e `(dashboard)`
- Single API route handler (signout) - correto, 99% das mutações são Server Actions

---

## Conclusão

O FrotaViva está maduro o suficiente para rodar em produção e o piloto. A dívida técnica está concentrada e endereçável, com um tema dominante: **a explosão do multi-empresa duplicou código crítico sem abstração intermediária**. Resolver isso (itens 1, 2, 8) é o maior investimento arquitetural possível agora e deve acontecer antes de qualquer feature grande nova (Copilot, novos relatórios, novos módulos financeiros).

Os itens de segurança imediatos (#3 dead code, #15 testes de RLS, #19 env validation, #20 middleware matcher) são rápidos e devem entrar antes do piloto real com frotas externas.

O time não precisa parar e refatorar tudo. Pode seguir entregando features e ir endereçando o backlog em paralelo, começando pelos CRÍTICO-S (esforço baixo) que podem sair em um dia de trabalho focado.
