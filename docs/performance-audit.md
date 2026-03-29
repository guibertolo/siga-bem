# Performance Audit Report - Siga Bem

**Data:** 2026-03-29
**Auditor:** Quinn (QA Agent)
**Ambiente:** Next.js 16.2.1 (Turbopack), React 19.2.4, Vercel
**URL:** https://siga-bem-rosy.vercel.app

---

## Resumo Executivo

O Siga Bem apresenta **3 problemas criticos** e **5 problemas medios** de performance. O principal ofensor e o `@react-pdf/renderer` que injeta um chunk de **1.49 MB** no bundle do cliente, mesmo em paginas que nao geram PDF. Adicionalmente, queries Supabase sem `.limit()` e agregacoes client-side em `getGastosTotals` causam lentidao proporcional ao volume de dados.

**Veredicto: NEEDS_WORK** -- Nenhum dos problemas e bloqueante, mas o conjunto degrada significativamente a experiencia do usuario.

---

## 1. Analise de Bundle

### Metricas de Build

| Metrica | Valor |
|---------|-------|
| Build time | 2.7s (compilacao) |
| Total JS chunks | 39 arquivos |
| Total JS size | **2.9 MB** (uncompressed) |
| Total static dir | 3.3 MB |
| Rotas dinamicas (SSR) | 28 |
| Rotas estaticas | 3 (/, /login, /aceitar-convite) |

### Top 5 Chunks por Tamanho

| Chunk | Tamanho | Provavel Conteudo |
|-------|---------|-------------------|
| `0_eav9oi104.0.js` | **1.49 MB** | @react-pdf/renderer (pdfkit, fontkit, etc.) |
| `0-gnqsmnjjwbk.js` | 289 KB | react-hook-form + zod |
| `0syizokme4mb..js` | 222 KB | Supabase client SDK |
| `0oe_k5jz-e~o~.js` | 198 KB | React + React DOM |
| `03~yq9q893hmn.js` | 110 KB | Next.js framework |

O chunk do @react-pdf/renderer sozinho representa **51% de todo o JS** entregue ao cliente.

---

## 2. Problemas Encontrados

### CRITICO-01: @react-pdf/renderer no bundle global (1.49 MB)

- **Arquivo:** `components/fechamentos/FechamentoPDF.tsx`
- **Problema:** Apesar do `use-fechamento-pdf.ts` usar `import()` dinamico para carregar o renderer sob demanda, o `FechamentoPDF.tsx` faz `import { Document, Page, Text, View, StyleSheet } from '@react-pdf/renderer'` de forma **estatica**. O Turbopack inclui esse modulo no bundle porque `FechamentoPDF.tsx` e marcado como `'use client'` e pode ser referenciado em tree-shaking.
- **Impacto:** ALTO -- 1.49 MB de JS desnecessario em TODAS as paginas (o bundler pode pre-carregar chunks compartilhados).
- **Solucao:**
  1. Converter `FechamentoPDF.tsx` para **nao** ter `'use client'` no topo -- ele so precisa ser importado dinamicamente pelo hook.
  2. Garantir que `GerarPDFButton` (unico consumidor) importe via `next/dynamic` com `ssr: false`.
  3. Alternativa: usar `@react-pdf/renderer` apenas via API Route que gera o PDF server-side (elimina totalmente do bundle client).
- **Reducao estimada:** ~1.49 MB do bundle client (~51% do total JS).

### CRITICO-02: getGastosTotals busca TODOS os gastos sem limit

- **Arquivo:** `lib/queries/gastos.ts` (linhas 121-204)
- **Problema:** A funcao `getGastosTotals()` executa `supabase.from('gasto').select('valor, categoria_gasto(nome, icone, cor)')` **sem `.limit()`** e sem paginacao. Para um usuario com 10.000 gastos, isso transfere ~10K registros do Supabase para o servidor Next.js e faz agregacao em JavaScript (`for...of` loop no Node.js).
- **Impacto:** ALTO -- O tempo de resposta da pagina `/gastos` cresce linearmente com o volume de dados. Com 1.000+ gastos, a resposta pode levar 3-5 segundos.
- **Solucao:**
  1. Criar uma **Supabase RPC function** (PostgreSQL) para agregar diretamente no banco:
     ```sql
     CREATE OR REPLACE FUNCTION fn_gastos_totais(
       p_motorista_ids UUID[] DEFAULT NULL,
       p_caminhao_ids UUID[] DEFAULT NULL,
       p_categoria_ids UUID[] DEFAULT NULL,
       p_start_date DATE DEFAULT NULL,
       p_end_date DATE DEFAULT NULL
     ) RETURNS TABLE(
       total_centavos BIGINT,
       categoria_nome TEXT,
       categoria_icone TEXT,
       categoria_cor TEXT,
       cat_total BIGINT,
       cat_count INT
     ) AS $$ ... $$
     ```
  2. Usar `.rpc('fn_gastos_totais', params)` ao inves de buscar todos os registros.
- **Reducao estimada:** De O(n) para O(1) no tempo de resposta.

### CRITICO-03: Dashboard faz 4 queries sequenciais ao Supabase

- **Arquivo:** `app/(dashboard)/layout.tsx` + `app/(dashboard)/dashboard/page.tsx`
- **Problema:** O dashboard layout chama `supabase.auth.getUser()` + `getCurrentUsuario()` (2 queries). Depois, cada card do dashboard (`ViagemSummaryCard`, `GastoSummaryCard`, `FechamentoSummaryCard`) faz suas proprias queries. O `FechamentoSummaryCard` faz 2 queries adicionais. Total: **pelo menos 7 round-trips** ao Supabase no carregamento da pagina dashboard.
- **Impacto:** ALTO -- Com latencia media de 100ms por query ao Supabase (serverless), isso adiciona ~700ms ao TTFB da pagina.
- **Solucao:**
  1. O layout ja faz `getUser()` + `getCurrentUsuario()` -- passar esses dados como props para os cards ao inves de cada card re-autenticar.
  2. Consolidar as queries dos 3 cards em uma unica funcao `getDashboardData()` que use `Promise.all()` para todas as queries de dados.
  3. Considerar `unstable_cache` ou `revalidate` para cachear os dados por 30-60 segundos.
- **Reducao estimada:** De 7 round-trips para 3-4 (economia de ~300-400ms).

---

### MEDIO-01: 10 queries com `.select('*')` -- over-fetching

- **Arquivos afetados:**
  - `app/(dashboard)/caminhoes/actions.ts`
  - `app/(dashboard)/configuracoes/combustivel/actions.ts`
  - `app/(dashboard)/empresa/actions.ts`
  - `app/(dashboard)/fechamentos/actions.ts`
  - `app/(dashboard)/motoristas/actions.ts`
  - `app/(dashboard)/gastos/actions.ts`
  - `app/(dashboard)/gastos/comprovante-actions.ts`
  - `app/(dashboard)/viagens/[id]/veiculos/actions.ts`
  - `lib/auth/get-user-role.ts`
- **Problema:** `.select('*')` busca TODAS as colunas da tabela, incluindo campos que nao sao usados na interface. Isso aumenta o payload de rede e o tempo de parse.
- **Impacto:** MEDIO -- Cada coluna extra e bytes transferidos. Em tabelas com campos TEXT longos ou JSONB, o impacto pode ser significativo.
- **Solucao:** Substituir `.select('*')` por selecao explicita dos campos necessarios (e.g., `.select('id, nome, placa')`).

### MEDIO-02: Middleware executa supabase.auth.getUser() em TODA rota do dashboard

- **Arquivo:** `middleware.ts` + `lib/supabase/middleware.ts`
- **Problema:** O middleware intercepta `/dashboard/:path*` e `/usuarios/:path*`, e em CADA request faz `supabase.auth.getUser()` que e uma chamada HTTP ao Supabase Auth. Essa mesma chamada e repetida no `layout.tsx` do dashboard, resultando em **dupla autenticacao**.
- **Impacto:** MEDIO -- 1 round-trip extra (~100ms) em cada navegacao.
- **Solucao:**
  1. O middleware pode usar `supabase.auth.getSession()` (mais leve, usa cookie local) ao inves de `getUser()` para verificacao rapida.
  2. O resultado da autenticacao do middleware pode ser propagado via headers para evitar re-verificacao no layout.

### MEDIO-03: 43 componentes marcados como 'use client'

- **Arquivos:** 43 arquivos com `'use client'` directive
- **Problema:** Componentes `'use client'` enviam todo o JS para o browser. Alguns desses componentes poderiam ser server components (e.g., componentes de listagem que apenas renderizam dados).
- **Impacto:** MEDIO -- Cada `'use client'` force o Next.js a enviar o modulo inteiro + suas dependencias para o browser. Reduzir de 43 para ~30 poderia economizar 100-200KB de JS.
- **Solucao:** Auditar cada componente `'use client'` e verificar se ele realmente precisa de interatividade client-side. Componentes que apenas renderizam dados podem ser convertidos para server components.
- **Candidatos para conversao:**
  - `components/financeiro/HistoricoFechamentos.tsx` -- se so renderiza tabela
  - `components/usuarios/usuario-list.tsx` -- se so renderiza lista
  - `components/gastos/GastoSummary.tsx` -- se so renderiza totais

### MEDIO-04: getGastosMesAtual busca todos os gastos do mes sem limit

- **Arquivo:** `app/(dashboard)/gastos/actions.ts` (linhas 538-556)
- **Problema:** `.from('gasto').select('valor').gte('data', primeiroDiaMes)` busca TODOS os gastos do mes atual para somar client-side. Para frotas com muitos gastos mensais, isso pode ser lento.
- **Impacto:** MEDIO -- Similar ao CRITICO-02 mas com escopo menor (apenas 1 mes).
- **Solucao:** Usar `.rpc()` com `SUM(valor)` no PostgreSQL ou pelo menos usar `.select('valor', { count: 'exact', head: false })` com paginacao.

### MEDIO-05: FechamentoSummaryCard busca saldo_motorista de TODOS os fechamentos abertos

- **Arquivo:** `components/dashboard/FechamentoSummaryCard.tsx` (linhas 12-21)
- **Problema:** Busca `.from('fechamento').select('saldo_motorista').eq('status', 'aberto')` sem limit. Se houver muitos fechamentos abertos, transfere todos os registros.
- **Impacto:** MEDIO -- Proporcional ao numero de fechamentos abertos.
- **Solucao:** Usar RPC com `SUM(saldo_motorista)` diretamente no banco.

---

## 3. Analise de Server Components vs Client Components

| Tipo | Quantidade |
|------|-----------|
| Server Components (pages) | 28 pages (bom uso do SSR) |
| Client Components | 43 arquivos |
| Dynamic imports | **0** (nenhum `next/dynamic` usado) |
| Lazy loading | **0** (nenhum `React.lazy()` usado) |

**Observacao positiva:** As pages do dashboard sao todas Server Components assincronas, o que e correto. O problema esta nos componentes filhos que sao `'use client'` e carregam JS desnecessario.

---

## 4. Middleware

**Veredicto: ACEITAVEL** com ressalvas.

O middleware e leve e tem matcher restrito (`/dashboard/:path*`, `/usuarios/:path*`), o que e correto. Porem:
- Usa `getUser()` ao inves de `getSession()` (chamada HTTP vs cookie local)
- O Next.js 16 avisa que `middleware` esta deprecado em favor de `proxy`

---

## 5. next.config.ts

**Veredicto: MINIMALISTA** -- nao ha configuracoes de performance.

Configuracoes ausentes que poderiam ajudar:
- `images.formats: ['image/avif', 'image/webp']` -- formatos otimizados
- `experimental.optimizePackageImports` -- tree-shaking agressivo para pacotes como zod e react-hook-form
- `compress: true` -- habilitar compressao gzip/brotli (Vercel ja faz, mas e boa pratica)

---

## 6. Uso de Imagens

| Tipo | Quantidade | Status |
|------|-----------|--------|
| `<Image>` do Next.js | 2 (login, home) | OK |
| `<img>` HTML nativo | **0** | OK |

**Veredicto: OK** -- Nao ha abuso de imagens nao otimizadas.

---

## 7. Plano de Acao Priorizado

| # | Problema | Impacto | Esforco | Prioridade |
|---|----------|---------|---------|------------|
| 1 | CRITICO-01: @react-pdf/renderer no bundle | -1.49MB JS | Medio | P0 |
| 2 | CRITICO-02: getGastosTotals sem limit | Tempo linear | Alto | P0 |
| 3 | CRITICO-03: Dashboard queries waterfall | -300-400ms | Baixo | P1 |
| 4 | MEDIO-02: Dupla autenticacao middleware/layout | -100ms | Baixo | P1 |
| 5 | MEDIO-01: .select('*') over-fetching | Payload menor | Medio | P2 |
| 6 | MEDIO-04: getGastosMesAtual sem RPC | Tempo linear | Medio | P2 |
| 7 | MEDIO-05: FechamentoSummaryCard sem RPC | Tempo linear | Medio | P2 |
| 8 | MEDIO-03: Excesso de 'use client' | -100-200KB | Alto | P3 |

### Impacto Estimado Total

Se todos os itens P0 e P1 forem implementados:
- **Bundle JS:** de 2.9 MB para ~1.4 MB (-51%)
- **TTFB dashboard:** de ~1.5s para ~0.8s (-47%)
- **Pagina /gastos com 1000+ registros:** de ~3-5s para <1s

---

## 8. Pontos Positivos

1. **Server Components bem aplicados** -- Todas as pages do dashboard sao async server components. Correto.
2. **@react-pdf/renderer com dynamic import no hook** -- O `use-fechamento-pdf.ts` ja usa `import()` dinamico. Precisa apenas corrigir o import estatico no componente.
3. **Paginacao implementada** -- `getGastos()` usa `.range()` corretamente.
4. **Queries paralelas com Promise.all** -- `getGastoFilterOptions()` e `getResumoFinanceiro()` usam `Promise.all` corretamente.
5. **Font loading otimizado** -- `Inter` com `display: 'swap'` e `variable` CSS.
6. **Middleware com matcher restrito** -- Nao intercepta rotas publicas desnecessariamente.

---

*Quinn (QA Agent) -- Performance Audit*
*Veredicto: NEEDS_WORK (3 criticos, 5 medios)*
