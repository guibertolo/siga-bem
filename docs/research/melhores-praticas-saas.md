# Relatorio de Pesquisa: Melhores Praticas para SaaS Next.js + Supabase

**Projeto:** FrotaViva - Gestao de Frotas de Cegonha
**Data:** 2026-03-29
**Publico-alvo:** Transportadores de veiculos, 40-65 anos, baixa familiaridade digital
**Stack:** Next.js 16 + React 19 + Supabase + Tailwind CSS 4 + Vercel

---

## Indice

1. [Performance Next.js 16](#1-performance-nextjs-16)
2. [Supabase Performance](#2-supabase-performance)
3. [Core Web Vitals](#3-core-web-vitals)
4. [PWA Best Practices](#4-pwa-best-practices)
5. [Acessibilidade (WCAG 2.1 AA)](#5-acessibilidade-wcag-21-aa)
6. [SEO para SaaS B2B](#6-seo-para-saas-b2b)
7. [Monitoring e Observability](#7-monitoring-e-observability)
8. [Security Best Practices](#8-security-best-practices)
9. [Ferramentas de Testing](#9-ferramentas-de-testing)
10. [DevOps e CI/CD](#10-devops-e-cicd)
11. [Top 10 Quick Wins](#top-10-quick-wins)
12. [Roadmap de Otimizacao](#roadmap-de-otimizacao-em-3-fases)

---

## 1. Performance Next.js 16

### Estado Atual do FrotaViva

- **App Router:** Implementado corretamente com route groups `(auth)` e `(dashboard)`
- **Server Components:** Layout do dashboard e paginas de listagem sao Server Components (correto)
- **Client Components:** 59 arquivos com `'use client'` — muitos sao componentes de formulario/interacao (aceitavel), mas alguns podem ser otimizados
- **Streaming/Suspense:** Usado em apenas 4 paginas (gastos, fechamentos, bi, historico) — sub-utilizado
- **next.config.ts:** Minimalista — sem configuracoes de performance, sem headers, sem image optimization explicita
- **Font:** Inter do Google Fonts com `display: 'swap'` e variable font (correto)
- **Image:** Usando `next/image` na homepage com `priority` (correto)
- **Turbopack:** Configurado para dev (correto)
- **ISR:** Nao implementado

### Gaps Identificados

| Gap | Severidade | Descricao |
|-----|-----------|-----------|
| Suspense sub-utilizado | ALTA | Apenas 4 de ~15 paginas de dashboard usam Suspense |
| Sem loading.tsx | ALTA | Nenhum arquivo loading.tsx encontrado nos route groups |
| Sem ISR | MEDIA | Paginas semi-estaticas (categorias, configuracoes) poderiam usar ISR |
| next.config minimalista | MEDIA | Sem headers de cache, sem image remotePatterns, sem redirects |
| Client boundary alta | MEDIA | Alguns componentes de lista poderiam ter boundary mais baixa |

### Acoes Recomendadas

#### P0 — Imediato
1. **Adicionar `loading.tsx` em cada route group** — Shell instantaneo enquanto dados carregam
   ```
   app/(dashboard)/loading.tsx         # Skeleton do layout
   app/(dashboard)/gastos/loading.tsx   # Skeleton da lista de gastos
   app/(dashboard)/viagens/loading.tsx  # Skeleton da lista de viagens
   ```
   Esforco: 2-3h | Impacto: TTFB reduzido de segundos para <200ms percebido

2. **Wrapping de dados em Suspense** — Todas as paginas com fetch de dados
   ```tsx
   // Antes
   export default async function GastosPage() {
     const data = await getGastos(); // bloqueia toda a pagina
     return <GastoList data={data} />;
   }

   // Depois
   export default function GastosPage() {
     return (
       <Suspense fallback={<GastosSkeleton />}>
         <GastosContent />
       </Suspense>
     );
   }
   ```
   Esforco: 4-6h | Impacto: Streaming progressivo, UX muito melhor

#### P1 — Curto prazo
3. **Configurar headers de cache no next.config.ts** — Cache de assets estaticos
   ```ts
   headers: async () => [{
     source: '/logos/:path*',
     headers: [{ key: 'Cache-Control', value: 'public, max-age=31536000, immutable' }]
   }]
   ```
   Esforco: 1h | Impacto: Assets servidos do cache do browser

4. **Avaliar ISR para paginas semi-estaticas** — Configuracoes de combustivel, categorias
   Esforco: 2h | Impacto: Menos load no Supabase

#### P2 — Medio prazo
5. **Bundle analysis** — Instalar `@next/bundle-analyzer` para identificar dependencias pesadas
   ```bash
   npm install @next/bundle-analyzer
   ```
   Esforco: 1h setup + 2h analise | Impacto: Reducao potencial de 20-40% no JS bundle

6. **Partial Pre-Rendering (PPR)** — Quando estavel no Next.js 16, ativar para shell estatico + holes dinamicos
   Esforco: 3h | Impacto: TTFB < 100ms para todas as paginas

### Melhores Praticas (Referencia)

- **Server Components por padrao** — Manter `'use client'` apenas em componentes que precisam de interatividade (hooks, event handlers)
- **Push `'use client'` para folhas** — Ex: `GastoList` pode ser server, apenas `GastoFilters` (com estado) precisa ser client
- **Parallel data fetching** — Usar `Promise.all()` como ja feito no dashboard (bom padrao)
- **Avoid waterfall requests** — Mover fetches para os componentes que os consomem, nao no pai
- **Route Segment Config** — Usar `export const dynamic = 'force-dynamic'` ou `revalidate` por segmento

### Fontes
- [Next.js Streaming Guide](https://nextjs.org/learn/dashboard-app/streaming)
- [Server and Client Components](https://nextjs.org/docs/app/getting-started/server-and-client-components)
- [Next.js 16 Performance Guide](https://www.digitalapplied.com/blog/nextjs-16-performance-server-components-guide)
- [RSC Performance Pitfalls](https://blog.logrocket.com/react-server-components-performance-mistakes)
- [Next.js Caching](https://nextjs.org/docs/app/getting-started/caching)

---

## 2. Supabase Performance

### Estado Atual do FrotaViva

- **Client creation:** `createClient()` via `@supabase/ssr` com cookies (correto)
- **Auth caching:** `getCurrentUsuario()` com `React.cache()` (excelente — evita chamadas duplicadas)
- **RLS:** Implementado nas migrations (correto)
- **Queries:** Server-side via server actions com `createClient()` (correto)
- **Admin client:** Separado em `lib/supabase/admin.ts` (correto)
- **Connection pooling:** Nao configurado explicitamente
- **Indexes:** Nao verificados (migrations nao mostram CREATE INDEX explicitos)
- **Realtime:** Nao utilizado
- **Edge Functions:** Nao utilizadas

### Gaps Identificados

| Gap | Severidade | Descricao |
|-----|-----------|-----------|
| Indexes ausentes | ALTA | Foreign keys e colunas de filtro sem indexes dedicados |
| Sem connection pooling config | MEDIA | Usando conexao direta, sem Supavisor otimizado |
| Sem query monitoring | MEDIA | Sem pg_stat_statements ou dashboard de performance |
| RLS sem indexes dedicados | MEDIA | Colunas usadas em RLS policies podem nao ter indexes |
| Sem caching layer | BAIXA | Todas as queries vao direto ao banco |

### Acoes Recomendadas

#### P0 — Imediato
1. **Audit e criar indexes** — Colunas frequentemente filtradas/joined
   ```sql
   -- Foreign keys (provavelmente sem index)
   CREATE INDEX idx_gasto_motorista ON gasto(motorista_id);
   CREATE INDEX idx_gasto_caminhao ON gasto(caminhao_id);
   CREATE INDEX idx_gasto_viagem ON gasto(viagem_id);
   CREATE INDEX idx_gasto_categoria ON gasto(categoria_id);
   CREATE INDEX idx_gasto_empresa ON gasto(empresa_id);
   CREATE INDEX idx_viagem_empresa ON viagem(empresa_id);
   CREATE INDEX idx_motorista_caminhao_empresa ON motorista_caminhao(empresa_id);

   -- Colunas de filtro/sort
   CREATE INDEX idx_gasto_data ON gasto(data DESC);
   CREATE INDEX idx_viagem_data_saida ON viagem(data_saida DESC);
   CREATE INDEX idx_fechamento_periodo ON fechamento(periodo_inicio, periodo_fim);

   -- Colunas usadas em RLS
   CREATE INDEX idx_usuario_empresa ON usuario_empresa(user_id, empresa_id);
   ```
   Esforco: 2h | Impacto: Queries 10-100x mais rapidas em tabelas grandes

2. **Usar Supabase Performance Advisor** — Dashboard > Database > Advisors
   Esforco: 30min | Impacto: Identificar indexes missing automaticamente

#### P1 — Curto prazo
3. **Configurar connection pooling via Supavisor** — Usar pooled connection string
   - Transaction mode para server actions (stateless)
   - Session mode para realtime/subscriptions
   - Limite pool a 80% do max connections se nao usar API PostgREST pesadamente
   Esforco: 1h | Impacto: Melhor gerenciamento de conexoes sob carga

4. **Habilitar pg_stat_statements** — Monitorar queries lentas
   ```sql
   CREATE EXTENSION IF NOT EXISTS pg_stat_statements;
   ```
   Esforco: 30min | Impacto: Visibilidade sobre performance real

#### P2 — Medio prazo
5. **Implementar Realtime** para notificacoes de viagens — Quando motorista reporta gasto, dono ve em tempo real
   Esforco: 4-6h | Impacto: UX melhorada, menos necessidade de refresh manual

6. **Avaliar Edge Functions** para calculo de estimativas de viagem — Mais rapido que round-trip ao servidor
   Esforco: 4h | Impacto: Latencia reduzida para calculos

### Melhores Praticas (Referencia)

- **Sempre indexar colunas usadas em WHERE, JOIN, ORDER BY**
- **Indexar colunas usadas em RLS policies** — RLS e avaliado em CADA query
- **Wrapping functions em RLS com SELECT** permite caching:
  ```sql
  -- Menos performante
  CREATE POLICY "..." ON gasto USING (auth.uid() = user_id);
  -- Mais performante (cached)
  CREATE POLICY "..." ON gasto USING (user_id = (SELECT auth.uid()));
  ```
- **Monitorar com pg_stat_activity** para detectar conexoes idle
- **Nao ultrapassar 40% do pool** se usar API PostgREST intensivamente

### Fontes
- [Supabase Performance Tuning](https://supabase.com/docs/guides/platform/performance)
- [RLS Performance Best Practices](https://supabase.com/docs/guides/troubleshooting/rls-performance-and-best-practices-Z5Jjwv)
- [Connection Management](https://supabase.com/docs/guides/database/connection-management)
- [Supabase Database Advisors](https://supabase.com/docs/guides/database/database-advisors)
- [Supabase 30 Optimization Rules](https://supaexplorer.com/best-practices/supabase-postgres/)

---

## 3. Core Web Vitals

### Estado Atual do FrotaViva

- **LCP:** Nao medido, mas provavelmente lento nas paginas de listagem (sem streaming/skeleton)
- **CLS:** Tabelas dinamicas sem height reservado podem causar shifts
- **INP:** Formularios com validacao client-side podem ter delays
- **Font:** `display: 'swap'` configurado (bom para LCP)
- **Images:** `next/image` com priority na homepage (bom), mas SVG logos nao precisam de optimization
- **CSS:** Tailwind CSS 4 com purge automatico (bom)

### Targets (2026)

| Metrica | Target | Threshold "Good" |
|---------|--------|-------------------|
| LCP | < 2.5s | < 1.5s ideal |
| INP | < 200ms | < 100ms ideal |
| CLS | < 0.1 | < 0.05 ideal |

### Gaps Identificados

| Gap | Severidade | Descricao |
|-----|-----------|-----------|
| LCP nao otimizado | ALTA | Paginas de listagem bloqueiam render ate dados carregarem |
| CLS em tabelas | MEDIA | Tabelas sem height minimo causam shift quando dados carregam |
| INP em formularios | MEDIA | Formularios com muitos campos podem ter delay na primeira interacao |
| Sem medicao | ALTA | Nenhuma ferramenta de monitoring de CWV instalada |

### Acoes Recomendadas

#### P0 — Imediato
1. **Implementar Skeletons para listas** — Reservar espaco visual antes dos dados carregarem
   ```tsx
   // components/ui/TableSkeleton.tsx
   export function TableSkeleton({ rows = 5 }: { rows?: number }) {
     return (
       <div className="animate-pulse space-y-3">
         <div className="h-10 bg-surface-muted rounded" /> {/* header */}
         {Array.from({ length: rows }).map((_, i) => (
           <div key={i} className="h-12 bg-surface-muted rounded" />
         ))}
       </div>
     );
   }
   ```
   Esforco: 2h | Impacto: CLS reduzido a ~0, LCP percebido melhorado

2. **Reservar dimensoes em imagens e containers** — Prevenir layout shift
   ```tsx
   // Sempre definir width/height ou aspect-ratio em containers de dados
   <div className="min-h-[400px]"> {/* Reserva espaco para tabela */}
     <Suspense fallback={<TableSkeleton />}>
       <GastoTable />
     </Suspense>
   </div>
   ```
   Esforco: 1h | Impacto: CLS < 0.05

#### P1 — Curto prazo
3. **Instalar Vercel Speed Insights** — Monitoring real de CWV em producao
   ```bash
   npm install @vercel/speed-insights
   ```
   ```tsx
   // app/layout.tsx
   import { SpeedInsights } from '@vercel/speed-insights/next';
   // ... dentro do body:
   <SpeedInsights />
   ```
   Esforco: 15min | Impacto: Dados reais de performance de usuarios

4. **Otimizar INP em formularios pesados** — Debounce em inputs de busca, lazy load de selects
   Esforco: 2h | Impacto: INP < 200ms garantido

#### P2 — Medio prazo
5. **Implementar Web Workers** para calculos pesados (BI, simulador de viagem)
   Esforco: 4h | Impacto: Main thread livre, INP melhorado

### Fontes
- [Core Web Vitals 2026](https://nitropack.io/blog/most-important-core-web-vitals-metrics/)
- [CWV Optimization Guide](https://www.mewastudio.com/en/blog/seo-core-web-vitals-2026)
- [Google Core Web Vitals](https://developers.google.com/search/docs/appearance/core-web-vitals)

---

## 4. PWA Best Practices

### Estado Atual do FrotaViva

- **manifest.json:** Existe em `public/manifest.json` com icones 192/512, display standalone (bom)
- **Referenciado no layout:** `manifest: '/manifest.json'` em metadata (bom)
- **Service Worker:** NAO existe (critico para offline)
- **Push Notifications:** NAO implementado
- **Background Sync:** NAO implementado
- **Offline support:** NAO implementado
- **Install prompt:** NAO implementado

### Contexto do Publico-Alvo

Motoristas de cegonha frequentemente trafegam por areas rurais com pouca ou nenhuma cobertura de sinal. Um PWA com suporte offline e **essencial** para este publico:
- Registro de gastos em viagem (pedago, combustivel) sem internet
- Visualizacao de dados da viagem atual offline
- Sincronizacao automatica quando retorna ao sinal
- Notificacoes de novos fechamentos/acertos

### Gaps Identificados

| Gap | Severidade | Descricao |
|-----|-----------|-----------|
| Sem Service Worker | CRITICA | Nenhum suporte offline — motoristas em areas sem sinal nao podem usar o app |
| Sem Background Sync | CRITICA | Dados registrados offline se perdem se fechar o app |
| Sem Push Notifications | ALTA | Motoristas nao sao avisados de novos gastos/fechamentos |
| Sem Install Prompt | MEDIA | Usuarios nao sao incentivados a instalar na home screen |
| manifest.json estatico | BAIXA | Poderia ser dinamico via `app/manifest.ts` |

### Acoes Recomendadas

#### P0 — Imediato
1. **Criar Service Worker basico** (`public/sw.js`) — Cache de shell estatico
   ```js
   const CACHE_NAME = 'frotaviva-v1';
   const STATIC_ASSETS = [
     '/',
     '/dashboard',
     '/logos/frotaviva-logo-full.svg',
     '/icons/icon-192.png',
     '/icons/icon-512.png',
   ];

   self.addEventListener('install', (event) => {
     event.waitUntil(
       caches.open(CACHE_NAME).then((cache) => cache.addAll(STATIC_ASSETS))
     );
   });

   self.addEventListener('fetch', (event) => {
     event.respondWith(
       caches.match(event.request).then((response) => response || fetch(event.request))
     );
   });
   ```
   Esforco: 2h | Impacto: Shell do app disponivel offline

2. **Migrar manifest para `app/manifest.ts`** — Manifest dinamico, type-safe
   Esforco: 30min | Impacto: Melhor manutencao

#### P1 — Curto prazo
3. **Implementar offline data com IndexedDB** — Gastos e viagens offline
   - Usar `idb` (IndexedDB wrapper) para armazenar dados localmente
   - Queue de operacoes pendentes para sync
   - Indicador visual "offline" no header
   Esforco: 8-12h | Impacto: App funcional sem internet (diferencial competitivo)

4. **Background Sync** — Sincronizar dados quando voltar online
   ```js
   // No service worker
   self.addEventListener('sync', (event) => {
     if (event.tag === 'sync-gastos') {
       event.waitUntil(syncPendingGastos());
     }
   });
   ```
   Esforco: 4h | Impacto: Dados nunca se perdem

5. **Install Prompt component** — Incentivar instalacao na home screen
   Esforco: 2h | Impacto: Aumento de retencao/engajamento

#### P2 — Medio prazo
6. **Push Notifications** — Avisar motoristas sobre:
   - Nova viagem atribuida
   - Fechamento/acerto disponivel
   - Vencimento de documentos do caminhao
   - Necessidade de registrar gastos
   Esforco: 8h (VAPID + web-push + Supabase webhook) | Impacto: Re-engajamento ativo

7. **Serwist integration** — Caching avancado com Workbox strategies
   - StaleWhileRevalidate para API calls
   - CacheFirst para assets estaticos
   - NetworkFirst para dados criticos
   Esforco: 4h | Impacto: Performance offline profissional

### Fontes
- [Next.js PWA Guide](https://nextjs.org/docs/app/guides/progressive-web-apps)
- [Next.js 16 PWA Offline Support](https://blog.logrocket.com/nextjs-16-pwa-offline-support/)
- [Offline-First PWA with IndexedDB](https://www.wellally.tech/blog/build-offline-first-pwa-nextjs-indexeddb)
- [MDN: Offline and Background Operation](https://developer.mozilla.org/en-US/docs/Web/Progressive_web_apps/Guides/Offline_and_background_operation)

---

## 5. Acessibilidade (WCAG 2.1 AA)

### Estado Atual do FrotaViva

- **Idioma:** `lang="pt-BR"` definido (correto)
- **Font base:** Inter, sem tamanho minimo definido (body usa default do browser)
- **Contraste:** Cores definidas em CSS custom properties — light mode parece adequado, dark mode precisa audit
- **Touch targets:** Links do sidebar tem `py-3.5` (~14px padding) — provavelmente 48px+ (verificar)
- **Keyboard navigation:** Links nativos do Next.js, mas forms nao verificados
- **Screen reader:** Sem aria-labels explicitos na maioria dos componentes
- **Focus indicators:** Focus ring no CTA da homepage (`focus:ring-2`) — verificar em outros elementos
- **Viewport:** `maximumScale: 1` — **BLOQUEIO DE ZOOM** (viola WCAG!)

### Contexto do Publico-Alvo (40-65 anos)

Este publico tem necessidades especificas:
- **Visao reduzida:** Texto precisa ser GRANDE e com ALTO CONTRASTE
- **Motricidade reduzida:** Touch targets precisam ser GENEROSOS
- **Baixa familiaridade digital:** Interface precisa ser SIMPLES e PREVISIVEL
- **Possivel daltomismo:** Nao depender apenas de cor para comunicar estado

### Gaps Identificados

| Gap | Severidade | Descricao |
|-----|-----------|-----------|
| `maximumScale: 1` bloqueia zoom | CRITICA | Viola WCAG 1.4.4 — usuarios com baixa visao nao podem ampliar |
| Font size base nao definido | ALTA | Body sem min font-size, pode ser < 16px em alguns devices |
| Sem aria-labels em componentes | ALTA | Tabelas, modais, formularios sem landmarks semanticos |
| Sem skip-to-content | MEDIA | Navegacao por teclado obriga percorrer todo sidebar |
| Sem audit de contraste dark mode | MEDIA | Cores do dark mode nao verificadas contra WCAG AA |
| Sem text spacing override | BAIXA | Nao testado se layout quebra com ajuste de espacamento |

### Acoes Recomendadas

#### P0 — Imediato (CRITICO)
1. **Remover `maximumScale: 1`** do viewport — Permitir zoom
   ```tsx
   // app/layout.tsx — ANTES
   export const viewport: Viewport = {
     maximumScale: 1, // REMOVER!
   };

   // DEPOIS
   export const viewport: Viewport = {
     themeColor: '#1B3A4B',
     width: 'device-width',
     initialScale: 1,
     // maximumScale REMOVIDO — permitir zoom ate 5x
   };
   ```
   Esforco: 5min | Impacto: Conformidade WCAG imediata

2. **Definir font-size base de 16px** e line-height de 1.5
   ```css
   body {
     font-size: 16px;
     line-height: 1.5;
   }
   ```
   Esforco: 10min | Impacto: Legibilidade garantida em todos os dispositivos

3. **Adicionar skip-to-content** no layout do dashboard
   ```tsx
   <a href="#main-content" className="sr-only focus:not-sr-only focus:absolute ...">
     Pular para conteudo principal
   </a>
   // ... sidebar ...
   <main id="main-content" tabIndex={-1}>
   ```
   Esforco: 15min | Impacto: Navegacao por teclado usavel

#### P1 — Curto prazo
4. **Audit de contraste** em TODAS as combinacoes de cor
   - Usar [WebAIM Contrast Checker](https://webaim.org/resources/contrastchecker/)
   - Verificar text-muted (#64748B) sobre surface-card (#FFFFFF) = ratio 4.5:1 (minimo AA)
   - Verificar dark mode: text-muted (#94A3B8) sobre surface-card (#1E293B)
   Esforco: 2h | Impacto: Todos os textos legiveis

5. **Touch targets de 48px minimo** em todos os botoes e links
   ```css
   button, a, [role="button"] {
     min-height: 48px;
     min-width: 48px;
   }
   ```
   Esforco: 2h | Impacto: Usabilidade para dedos grandes

6. **Aria-labels e roles** em componentes complexos
   - Tabelas: `<table role="grid" aria-label="Lista de gastos">`
   - Modais: `role="dialog" aria-modal="true" aria-labelledby="..."`
   - Filtros: `aria-label="Filtrar gastos por periodo"`
   - Status: `aria-live="polite"` para notificacoes de sucesso/erro
   Esforco: 4h | Impacto: Screen reader usavel

#### P2 — Medio prazo
7. **Fonte alternativa para numeros financeiros** — Tabular nums ja implementado (bom), mas considerar fonte maior (18px+) para valores monetarios
   Esforco: 1h | Impacto: Valores claramente legiveis

8. **Modo alto contraste** — Opcional para usuarios com baixa visao
   Esforco: 4h | Impacto: Acessibilidade avancada

### Fontes
- [WCAG 2.1](https://www.w3.org/TR/WCAG21/)
- [Font Size Requirements](https://font-converters.com/accessibility/font-size-requirements)
- [Contrast Requirements WCAG 2.2 AA](https://www.makethingsaccessible.com/guides/contrast-requirements-for-wcag-2-2-level-aa/)
- [Target Sizes](https://tetralogical.com/blog/2022/12/20/foundations-target-size/)

---

## 6. SEO para SaaS B2B

### Estado Atual do FrotaViva

- **Metadata:** Title, description, keywords, OpenGraph definidos no root layout (bom)
- **Title template:** `'%s | FrotaViva'` configurado (bom)
- **robots:** `index: true, follow: true` (bom para landing, mas dashboard deveria ser noindex)
- **Sitemap:** NAO existe
- **robots.txt:** NAO existe
- **Schema markup:** NAO existe
- **Twitter Card:** NAO configurado
- **Canonical URL:** NAO definido

### Gaps Identificados

| Gap | Severidade | Descricao |
|-----|-----------|-----------|
| Sem robots.txt | ALTA | Crawlers sem instrucoes, podem indexar paginas de auth |
| Sem sitemap | MEDIA | Google nao descobre todas as paginas publicas |
| Dashboard indexavel | MEDIA | Paginas autenticadas nao deveriam ser indexadas |
| Sem schema markup | MEDIA | Sem rich results para SoftwareApplication |
| Sem canonical URL | BAIXA | Possivel conteudo duplicado |
| Sem Twitter Card | BAIXA | Compartilhamento pobre no Twitter/X |

### Acoes Recomendadas

#### P0 — Imediato
1. **Criar `app/robots.ts`** — Bloquear indexacao do dashboard
   ```ts
   import type { MetadataRoute } from 'next';

   export default function robots(): MetadataRoute.Robots {
     return {
       rules: [
         {
           userAgent: '*',
           allow: '/',
           disallow: ['/dashboard/', '/gastos/', '/viagens/', '/fechamentos/',
                      '/motoristas/', '/caminhoes/', '/vinculos/', '/usuarios/',
                      '/configuracoes/', '/financeiro/', '/bi/', '/empresa/',
                      '/selecionar-empresa/', '/api/'],
         },
         { userAgent: 'Perplexitybot', allow: '/' },
         { userAgent: 'ChatGPT-User', allow: '/' },
         { userAgent: 'Claudebot', allow: '/' },
       ],
       sitemap: 'https://frotaviva.com.br/sitemap.xml',
     };
   }
   ```
   Esforco: 30min | Impacto: Paginas de app protegidas de indexacao

2. **Criar `app/sitemap.ts`** — Sitemap dinamico
   ```ts
   import type { MetadataRoute } from 'next';

   export default function sitemap(): MetadataRoute.Sitemap {
     return [
       { url: 'https://frotaviva.com.br', lastModified: new Date(), priority: 1 },
       { url: 'https://frotaviva.com.br/login', lastModified: new Date(), priority: 0.5 },
     ];
   }
   ```
   Esforco: 15min | Impacto: Google descobre paginas publicas

#### P1 — Curto prazo
3. **Adicionar noindex nas paginas de dashboard** — Via metadata por pagina
   ```ts
   export const metadata: Metadata = {
     robots: { index: false, follow: false },
   };
   ```
   Esforco: 30min | Impacto: Dados de usuarios nao indexados

4. **Schema markup SoftwareApplication** na homepage
   ```tsx
   <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify({
     "@context": "https://schema.org",
     "@type": "SoftwareApplication",
     "name": "FrotaViva",
     "applicationCategory": "BusinessApplication",
     "operatingSystem": "Web",
     "description": "Gestao inteligente para transportadoras de veiculos",
     "offers": { "@type": "Offer", "price": "0", "priceCurrency": "BRL" }
   })}} />
   ```
   Esforco: 1h | Impacto: Rich results no Google

5. **Twitter Card metadata** — Adicionar ao layout
   ```ts
   twitter: {
     card: 'summary_large_image',
     title: 'FrotaViva - Sua frota no controle',
     description: 'Gestao inteligente para transportadoras de veiculos',
   }
   ```
   Esforco: 15min | Impacto: Compartilhamento visual no Twitter/X

#### P2 — Medio prazo
6. **Landing page publica** com conteudo rico (beneficios, precos, depoimentos) — Mais paginas para indexar
   Esforco: 16-24h | Impacto: SEO organico significativo

### Fontes
- [Complete Next.js SEO Guide](https://www.adeelhere.com/blog/2025-12-09-complete-nextjs-seo-guide-from-zero-to-hero)
- [SEO in Next.js 16](https://jsdevspace.substack.com/p/how-to-configure-seo-in-nextjs-16)
- [B2B SaaS SEO Playbook 2026](https://thewhylayer.medium.com/b2b-saas-seo-a-compact-but-complete-playbook-for-2026-b7a37010a60f)
- [Technical SEO for SaaS 2026](https://www.rzlt.io/blog/the-complete-guide-to-technical-seo-for-saas-companies-in-2026)

---

## 7. Monitoring e Observability

### Estado Atual do FrotaViva

- **Error tracking:** NENHUM (sem Sentry, sem LogRocket)
- **Analytics:** NENHUM (sem Vercel Analytics, sem GA)
- **Speed Insights:** NENHUM (sem Vercel Speed Insights)
- **Uptime monitoring:** NENHUM
- **RUM:** NENHUM
- **Logging:** Apenas `console.error` em catch blocks

### Gaps Identificados

| Gap | Severidade | Descricao |
|-----|-----------|-----------|
| Sem error tracking | CRITICA | Erros em producao passam despercebidos |
| Sem analytics | ALTA | Zero visibilidade sobre uso do app |
| Sem monitoring de performance | ALTA | Nao sabe se app esta rapido ou lento para usuarios reais |
| Sem uptime monitoring | MEDIA | Nao sabe se app caiu |
| Sem logging estruturado | MEDIA | Debugging em producao impossivel |

### Acoes Recomendadas

#### P0 — Imediato
1. **Instalar Sentry** — Error tracking + performance monitoring
   ```bash
   npx @sentry/wizard@latest -i nextjs
   ```
   Isso cria automaticamente:
   - `instrumentation-client.ts` (browser errors)
   - `sentry.server.config.ts` (server errors)
   - `sentry.edge.config.ts` (edge errors)
   - Configuracao no `next.config.ts`

   Esforco: 30min | Impacto: Visibilidade total sobre erros em producao

2. **Instalar Vercel Analytics + Speed Insights**
   ```bash
   npm install @vercel/analytics @vercel/speed-insights
   ```
   ```tsx
   // app/layout.tsx
   import { Analytics } from '@vercel/analytics/next';
   import { SpeedInsights } from '@vercel/speed-insights/next';

   // No body:
   <Analytics />
   <SpeedInsights />
   ```
   Esforco: 15min | Impacto: Metricas reais de uso e performance

#### P1 — Curto prazo
3. **Configurar uptime monitoring** — BetterUptime, UptimeRobot, ou Vercel Checks
   - Monitorar `/api/health` endpoint (criar)
   - Alertas via email/SMS quando cair
   Esforco: 1h | Impacto: Saber imediatamente quando app cai

4. **Health check endpoint**
   ```ts
   // app/api/health/route.ts
   export async function GET() {
     return Response.json({ status: 'ok', timestamp: Date.now() });
   }
   ```
   Esforco: 10min | Impacto: Endpoint para monitoring externo

5. **Sentry custom breadcrumbs** para acoes de negocio
   ```ts
   Sentry.addBreadcrumb({
     category: 'gasto',
     message: 'Gasto registrado',
     level: 'info',
     data: { valor, categoria },
   });
   ```
   Esforco: 2h | Impacto: Contexto rico para debugging

#### P2 — Medio prazo
6. **Dashboard de metricas de negocio** — Total de gastos, viagens ativas, usuarios ativos
   Esforco: 4h | Impacto: Visao executiva do sistema

### Fontes
- [Sentry for Next.js](https://docs.sentry.io/platforms/javascript/guides/nextjs/)
- [Sentry Observability for Next.js](https://blog.sentry.io/next-js-observability-gaps-how-to-close-them/)
- [Next.js Analytics Guide](https://nextjs.org/docs/app/guides/analytics)
- [Vercel Observability](https://vercel.com/docs/observability)

---

## 8. Security Best Practices

### Estado Atual do FrotaViva

- **Auth:** Supabase Auth via cookies com middleware de refresh (correto)
- **RLS:** Implementado nas tabelas (correto)
- **Server Actions:** Validacao com Zod schemas (correto)
- **CSP:** NAO configurado
- **Security headers:** NENHUM configurado no next.config.ts
- **Rate limiting:** NAO implementado
- **CSRF:** Protegido nativamente via Server Actions POST-only (correto)
- **Admin client:** Separado (`lib/supabase/admin.ts`) — verificar se esta exposto
- **Input sanitization:** Zod valida inputs, mas sem sanitization de HTML
- **LGPD:** Utilitarios de mascaramento existem (`mascarar-cpf.ts`, `lgpd.ts`) (bom)

### Gaps Identificados

| Gap | Severidade | Descricao |
|-----|-----------|-----------|
| Sem CSP | ALTA | Vulneravel a XSS, injection de scripts |
| Sem security headers | ALTA | Sem X-Frame-Options, X-Content-Type-Options |
| Sem rate limiting | ALTA | Login exposto a brute force |
| RLS nao auditado | MEDIA | Policies podem ter gaps |
| Sem audit log | MEDIA | Acoes sensiveis (delete, update) sem log |
| Admin client potencialmente exposto | MEDIA | Verificar se `SUPABASE_SERVICE_ROLE_KEY` esta protegido |

### Acoes Recomendadas

#### P0 — Imediato
1. **Adicionar security headers** no `next.config.ts`
   ```ts
   async headers() {
     return [{
       source: '/(.*)',
       headers: [
         { key: 'X-Content-Type-Options', value: 'nosniff' },
         { key: 'X-Frame-Options', value: 'DENY' },
         { key: 'X-XSS-Protection', value: '1; mode=block' },
         { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
         { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
         { key: 'Strict-Transport-Security', value: 'max-age=63072000; includeSubDomains; preload' },
       ],
     }];
   }
   ```
   Esforco: 30min | Impacto: Protecao contra ataques comuns

2. **Implementar CSP basico** via middleware
   ```ts
   // Com nonce para scripts inline (theme toggle)
   const csp = `
     default-src 'self';
     script-src 'self' 'nonce-${nonce}';
     style-src 'self' 'unsafe-inline';
     img-src 'self' data: blob:;
     font-src 'self';
     connect-src 'self' https://*.supabase.co wss://*.supabase.co;
   `;
   ```
   Esforco: 2h | Impacto: XSS mitigado

#### P1 — Curto prazo
3. **Rate limiting no login** — Via middleware ou Vercel Edge Middleware
   ```ts
   // Limitar a 5 tentativas por minuto por IP
   // Usar Vercel KV ou in-memory Map para tracking
   ```
   Esforco: 3h | Impacto: Brute force prevenido

4. **Audit de RLS** — Verificar todas as policies contra OWASP
   - Testar acesso cross-tenant (empresa A nao ve dados de empresa B)
   - Testar acesso por role (motorista nao ve dados de admin)
   - Usar Supabase Security Advisor
   Esforco: 4h | Impacto: Multi-tenancy seguro

5. **Audit log** para acoes criticas
   ```sql
   CREATE TABLE audit_log (
     id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
     user_id uuid REFERENCES auth.users(id),
     action text NOT NULL,
     table_name text NOT NULL,
     record_id uuid,
     old_data jsonb,
     new_data jsonb,
     created_at timestamptz DEFAULT now()
   );
   ```
   Esforco: 4h | Impacto: Rastreabilidade completa

#### P2 — Medio prazo
6. **Verificar env vars** — Garantir que `SUPABASE_SERVICE_ROLE_KEY` nao esta no `NEXT_PUBLIC_*`
   Esforco: 15min | Impacto: Server-only secrets protegidos

7. **Dependency audit regular**
   ```bash
   npm audit
   ```
   Esforco: Automatizar via CI | Impacto: Vulnerabilidades de dependencias detectadas

### Fontes
- [Next.js CSP Guide](https://nextjs.org/docs/pages/guides/content-security-policy)
- [Next.js Data Security](https://nextjs.org/docs/app/guides/data-security)
- [OWASP CSP Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Content_Security_Policy_Cheat_Sheet.html)
- [Defensive Security Guide](https://fenilsonani.com/articles/security/defensive-security-csrf-csp-rate-limiting-cors/)

---

## 9. Ferramentas de Testing

### Estado Atual do FrotaViva

- **Unit Tests:** 8 testes em `__tests__/lib/utils/` (currency, date, lgpd, cpf, cnpj, placa, renavam, compress-image)
- **Jest:** Configurado com `ts-jest` (bom)
- **E2E:** NENHUM (sem Playwright, sem Cypress)
- **Accessibility testing:** NENHUM (sem axe-core)
- **Visual regression:** NENHUM
- **Lighthouse CI:** NENHUM
- **Test coverage:** Nao configurado

### Gaps Identificados

| Gap | Severidade | Descricao |
|-----|-----------|-----------|
| Sem E2E tests | CRITICA | Fluxos criticos (login, registrar gasto, fechar acerto) nao testados automaticamente |
| Sem accessibility tests | ALTA | Violations WCAG nao detectadas automaticamente |
| Cobertura minimal | ALTA | Apenas utils testados, nenhum component/page test |
| Sem Lighthouse CI | MEDIA | Performance pode degradar sem deteccao |
| Sem visual regression | BAIXA | Mudancas visuais podem passar despercebidas |

### Acoes Recomendadas

#### P0 — Imediato
1. **Instalar Playwright** para E2E
   ```bash
   npm init playwright@latest
   ```
   Criar testes para fluxos criticos:
   ```ts
   // e2e/gastos.spec.ts
   test('registrar novo gasto', async ({ page }) => {
     await page.goto('/login');
     await page.fill('[name=email]', 'test@example.com');
     // ... login flow
     await page.goto('/gastos/novo');
     // ... preencher formulario
     await expect(page.locator('.alert-success')).toBeVisible();
   });
   ```
   Esforco: 4h setup + 8h testes iniciais | Impacto: Fluxos criticos protegidos contra regressao

2. **Instalar axe-core com Playwright** para testes de acessibilidade
   ```bash
   npm install -D @axe-core/playwright
   ```
   ```ts
   import AxeBuilder from '@axe-core/playwright';

   test('pagina de gastos acessivel', async ({ page }) => {
     await page.goto('/gastos');
     const results = await new AxeBuilder({ page }).analyze();
     expect(results.violations).toEqual([]);
   });
   ```
   Esforco: 2h | Impacto: WCAG violations detectadas automaticamente

#### P1 — Curto prazo
3. **Aumentar cobertura de unit tests** — Server actions, queries, validations
   ```bash
   # Adicionar ao package.json
   "test:coverage": "jest --coverage --coverageThreshold='{\"global\":{\"branches\":60,\"functions\":60,\"lines\":60}}'"
   ```
   Esforco: 8h | Impacto: Regressoes detectadas cedo

4. **Lighthouse CI** — Automatizar checks de performance
   ```bash
   npm install -D @lhci/cli
   ```
   ```yaml
   # .lighthouserc.js
   module.exports = {
     ci: {
       collect: { url: ['http://localhost:3000/'] },
       assert: {
         assertions: {
           'categories:performance': ['warn', { minScore: 0.8 }],
           'categories:accessibility': ['error', { minScore: 0.9 }],
         },
       },
     },
   };
   ```
   Esforco: 2h | Impacto: Performance e acessibilidade monitorados em CI

#### P2 — Medio prazo
5. **React Testing Library** para components criticos
   ```bash
   npm install -D @testing-library/react @testing-library/jest-dom
   ```
   Esforco: 6h | Impacto: Componentes testados isoladamente

6. **Visual regression** com Playwright screenshots
   ```ts
   await expect(page).toHaveScreenshot('gastos-list.png');
   ```
   Esforco: 2h | Impacto: Mudancas visuais detectadas

### Fontes
- [Next.js Playwright Testing](https://nextjs.org/docs/pages/guides/testing/playwright)
- [Playwright Accessibility Testing](https://playwright.dev/docs/accessibility-testing)
- [Accessibility Audits with Playwright + Axe](https://dev.to/jacobandrewsky/accessibility-audits-with-playwright-axe-and-github-actions-2504)
- [Jest + RTL + Playwright for Next.js](https://blog.jarrodwatts.com/how-to-set-up-nextjs-with-jest-react-testing-library-and-playwright)

---

## 10. DevOps e CI/CD

### Estado Atual do FrotaViva

- **GitHub Actions:** NENHUM workflow configurado
- **Vercel:** Provavelmente deployando via git integration (preview + production)
- **Database migrations:** Arquivos em `supabase/migrations/` mas sem automacao
- **Feature flags:** NAO implementado
- **Rollback strategy:** NENHUMA
- **Preview deployments:** Provavelmente via Vercel auto-deploy
- **Pre-commit hooks:** NENHUM (sem husky, sem lint-staged)

### Gaps Identificados

| Gap | Severidade | Descricao |
|-----|-----------|-----------|
| Sem CI pipeline | CRITICA | Codigo pode ser deployado sem lint/typecheck/tests |
| Sem migration automation | ALTA | Migrations manuais sao propensos a erro |
| Sem pre-commit hooks | ALTA | Codigo mal formatado entra no repo |
| Sem feature flags | MEDIA | Releases tudo-ou-nada |
| Sem rollback strategy | MEDIA | Se deploy quebrar, sem plano de volta |

### Acoes Recomendadas

#### P0 — Imediato
1. **Criar GitHub Actions CI** — Lint + Typecheck + Tests em PRs
   ```yaml
   # .github/workflows/ci.yml
   name: CI
   on:
     pull_request:
       branches: [main]
     push:
       branches: [main]

   jobs:
     quality:
       runs-on: ubuntu-latest
       steps:
         - uses: actions/checkout@v4
         - uses: actions/setup-node@v4
           with:
             node-version: 22
             cache: npm
         - run: npm ci
         - run: npm run lint
         - run: npm run typecheck
         - run: npm test
         - run: npm run build
   ```
   Esforco: 1h | Impacto: Quality gate antes de merge

2. **Instalar husky + lint-staged** — Pre-commit hooks
   ```bash
   npm install -D husky lint-staged
   npx husky init
   ```
   ```json
   // package.json
   "lint-staged": {
     "*.{ts,tsx}": ["eslint --fix", "prettier --write"],
     "*.{json,md,css}": ["prettier --write"]
   }
   ```
   Esforco: 30min | Impacto: Codigo limpo garantido

#### P1 — Curto prazo
3. **Automacao de migrations** — Run `supabase db push` em CI
   ```yaml
   # Em job separado, apos testes passarem
   migrate:
     needs: quality
     if: github.ref == 'refs/heads/main'
     runs-on: ubuntu-latest
     steps:
       - uses: supabase/setup-cli@v1
       - run: supabase db push --db-url ${{ secrets.SUPABASE_DB_URL }}
   ```
   Esforco: 2h | Impacto: Migrations automaticas e seguras

4. **Vercel Preview + Comment bot** — Comentario automatico em PRs com link do preview
   (Vercel faz isso nativamente se conectado ao repo — apenas verificar configuracao)
   Esforco: 15min | Impacto: Review facilitado

#### P2 — Medio prazo
5. **Feature flags** com Vercel Edge Config ou PostHog
   - Gradual rollout de funcionalidades novas
   - Kill switch para features problematicas
   Esforco: 4h | Impacto: Releases seguras e graduais

6. **Rollback strategy** documentada
   - Vercel permite reverter para deployment anterior em 1 clique
   - Database: manter scripts de rollback para cada migration
   Esforco: 2h docs + 4h scripts | Impacto: Recovery rapido

7. **Playwright E2E no CI** — Rodar apos build
   ```yaml
   e2e:
     needs: quality
     runs-on: ubuntu-latest
     steps:
       - run: npx playwright install --with-deps
       - run: npm run build
       - run: npx playwright test
   ```
   Esforco: 2h | Impacto: E2E automatizado em cada PR

### Fontes
- [GitHub Actions for Next.js](https://digitalthriveai.com/en-us/resources/platform-docs/github/github-actions-nextjs/)
- [Vercel + GitHub Actions](https://vercel.com/kb/guide/how-can-i-use-github-actions-with-vercel)
- [Vercel for GitHub](https://vercel.com/docs/git/vercel-for-github)

---

## Top 10 Quick Wins

Mudancas de **alto impacto** com **baixo esforco** que podem ser implementadas em 1-2 dias:

| # | Acao | Esforco | Impacto | Area |
|---|------|---------|---------|------|
| 1 | Remover `maximumScale: 1` do viewport | 5 min | CRITICO — desbloqueio WCAG | Acessibilidade |
| 2 | Instalar Vercel Analytics + Speed Insights | 15 min | Visibilidade total de metricas | Monitoring |
| 3 | Criar `robots.ts` e `sitemap.ts` | 30 min | SEO basico funcional | SEO |
| 4 | Adicionar security headers no next.config.ts | 30 min | Protecao contra ataques comuns | Security |
| 5 | Instalar Sentry (wizard automatico) | 30 min | Error tracking em producao | Monitoring |
| 6 | Criar GitHub Actions CI (lint+typecheck+test) | 1h | Quality gate automatico | DevOps |
| 7 | Adicionar `loading.tsx` nos route groups | 2-3h | UX instantanea com skeletons | Performance |
| 8 | Criar indexes no Supabase para FK e filtros | 2h | Queries 10-100x mais rapidas | Database |
| 9 | Instalar husky + lint-staged | 30 min | Codigo limpo garantido | DevOps |
| 10 | Instalar Playwright + axe-core basico | 4h | E2E + acessibilidade automatizada | Testing |

**Tempo total estimado: ~12 horas para todos os 10 quick wins.**

---

## Roadmap de Otimizacao em 3 Fases

### Fase 1: Fundacao (Semana 1-2) — IMEDIATO

**Objetivo:** Corrigir gaps criticos e estabelecer baseline de qualidade.

| Tarefa | Area | Esforco | Responsavel |
|--------|------|---------|-------------|
| Remover `maximumScale: 1` | Acessibilidade | 5 min | @dev |
| Definir font-size 16px base + line-height 1.5 | Acessibilidade | 10 min | @dev |
| Skip-to-content no dashboard | Acessibilidade | 15 min | @dev |
| Security headers no next.config.ts | Security | 30 min | @dev |
| Instalar Sentry | Monitoring | 30 min | @dev |
| Instalar Vercel Analytics + Speed Insights | Monitoring | 15 min | @dev |
| Criar robots.ts + sitemap.ts | SEO | 30 min | @dev |
| GitHub Actions CI (lint+typecheck+test+build) | DevOps | 1h | @devops |
| Husky + lint-staged | DevOps | 30 min | @dev |
| Adicionar loading.tsx em route groups | Performance | 2-3h | @dev |
| Criar indexes no Supabase | Database | 2h | @data-engineer |
| Wrapping Suspense em paginas de listagem | Performance | 4-6h | @dev |
| Instalar Playwright + axe-core | Testing | 4h | @qa |
| Health check endpoint | Monitoring | 10 min | @dev |

**Total Fase 1: ~16-20h**

### Fase 2: Qualidade (Semana 3-4) — CURTO PRAZO

**Objetivo:** Elevar qualidade, seguranca e cobertura de testes.

| Tarefa | Area | Esforco | Responsavel |
|--------|------|---------|-------------|
| Audit de contraste (light + dark mode) | Acessibilidade | 2h | @ux-design-expert |
| Touch targets 48px em todos os interativos | Acessibilidade | 2h | @dev |
| Aria-labels em componentes complexos | Acessibilidade | 4h | @dev |
| Implementar CSP com nonce | Security | 2h | @dev |
| Rate limiting no login | Security | 3h | @dev |
| Audit de RLS multi-tenant | Security | 4h | @data-engineer |
| Connection pooling via Supavisor | Database | 1h | @data-engineer |
| pg_stat_statements habilitado | Database | 30 min | @data-engineer |
| Schema markup na homepage | SEO | 1h | @dev |
| Twitter Card metadata | SEO | 15 min | @dev |
| noindex nas paginas de dashboard | SEO | 30 min | @dev |
| E2E tests para fluxos criticos (5-8 testes) | Testing | 8h | @qa |
| Unit tests: server actions + queries | Testing | 8h | @qa |
| Lighthouse CI configurado | Testing | 2h | @qa |
| Automacao de migrations no CI | DevOps | 2h | @devops |
| Uptime monitoring | Monitoring | 1h | @devops |
| Skeletons para todas as paginas de listagem | Performance | 2h | @dev |
| Bundle analysis | Performance | 1h | @dev |

**Total Fase 2: ~44h**

### Fase 3: Excelencia (Semana 5-8) — MEDIO PRAZO

**Objetivo:** Features avancadas e diferenciais competitivos.

| Tarefa | Area | Esforco | Responsavel |
|--------|------|---------|-------------|
| Service Worker com cache de shell | PWA | 2h | @dev |
| Offline data com IndexedDB | PWA | 8-12h | @dev |
| Background Sync para gastos offline | PWA | 4h | @dev |
| Install prompt component | PWA | 2h | @dev |
| Push Notifications | PWA | 8h | @dev |
| Serwist/Workbox integration avancada | PWA | 4h | @dev |
| Realtime subscriptions para viagens | Database | 4-6h | @dev |
| Audit log table + triggers | Security | 4h | @data-engineer |
| Feature flags (Vercel Edge Config / PostHog) | DevOps | 4h | @devops |
| Rollback strategy documentada | DevOps | 2h | @devops |
| Visual regression tests | Testing | 2h | @qa |
| React Testing Library para components | Testing | 6h | @qa |
| Modo alto contraste (opcional) | Acessibilidade | 4h | @ux-design-expert |
| Landing page publica rica | SEO | 16-24h | @dev + @ux-design-expert |
| Web Workers para calculos BI | Performance | 4h | @dev |
| Partial Pre-Rendering (PPR) | Performance | 3h | @dev |

**Total Fase 3: ~77-87h**

---

## Resumo Executivo

### Score Atual Estimado do FrotaViva

| Area | Score | Nota |
|------|-------|------|
| Performance | 6/10 | Server Components bom, mas sem streaming/skeletons |
| Supabase | 7/10 | Arquitetura correta, mas sem indexes/monitoring |
| Core Web Vitals | 5/10 | Nao medido, provavelmente LCP lento |
| PWA | 3/10 | Manifest existe, mas sem SW/offline/push |
| Acessibilidade | 4/10 | Estrutura boa mas violacao critica (zoom blocked) |
| SEO | 5/10 | Metadata basico, sem robots/sitemap/schema |
| Monitoring | 1/10 | Zero observabilidade |
| Security | 5/10 | Auth/RLS bom, mas sem headers/CSP/rate-limit |
| Testing | 3/10 | Apenas 8 unit tests, sem E2E |
| DevOps | 3/10 | Sem CI, sem hooks, sem automacao |

### Score Projetado Apos 3 Fases

| Area | Apos Fase 1 | Apos Fase 2 | Apos Fase 3 |
|------|-------------|-------------|-------------|
| Performance | 8/10 | 9/10 | 10/10 |
| Supabase | 8/10 | 9/10 | 9/10 |
| Core Web Vitals | 7/10 | 8/10 | 9/10 |
| PWA | 3/10 | 3/10 | 9/10 |
| Acessibilidade | 6/10 | 8/10 | 9/10 |
| SEO | 7/10 | 9/10 | 10/10 |
| Monitoring | 7/10 | 8/10 | 9/10 |
| Security | 7/10 | 9/10 | 9/10 |
| Testing | 5/10 | 8/10 | 9/10 |
| DevOps | 7/10 | 8/10 | 9/10 |

**Investimento total: ~137-151 horas (~3.5-4 semanas de trabalho focado)**

---

*Relatorio gerado em 2026-03-29 via pesquisa web + analise do codebase FrotaViva*
