# Spec: Assistente FrotaViva

**Versao:** 0.1
**Data:** 2026-04-10
**Autor:** @pm (Morgan) + @architect (Aria)
**Status:** Draft — aguardando GATE-2
**Rastreia:** [product-brief.md v0.2](./product-brief.md), [complexity.md STANDARD](./complexity.md)
**Article IV compliance:** Todo statement abaixo tem coluna **Rastreio** com a origem (brief secao, tabela real, memoria ou arquivo do projeto).

---

## 1. Correcoes ao Brief (achados da exploracao de codigo)

A exploracao do codigo em `apps/siga-bem/` revelou dois desvios entre o brief e a realidade do schema. A spec corrige antes de virar requisito:

| Item no brief | Realidade no schema | Correcao na spec |
|---------------|---------------------|------------------|
| "documentos com vencimento" | Nao existe tabela `documento`. CNH vencendo vive em `motorista.cnh_validade` | Tool de documentos opera **apenas** em `motorista.cnh_validade` no MVP. Qualquer outro tipo de documento entra em feature futura, nao no MVP. |
| "manutencoes" | Nao existe tabela `manutencao`. Manutencoes sao registradas como `gasto` com `categoria_gasto.nome = 'Manutencao'` | Tool de manutencoes opera consultando `gasto` filtrado por categoria 'Manutencao'. |

Esse ajuste mantem o MVP **honesto ao schema real** (Article IV) sem perder nenhum dos 5 use cases-farol.

---

## 2. Requisitos Funcionais (FR)

### FR-1 — Rota autenticada `/assistente`

| Campo | Valor |
|-------|-------|
| **Descricao** | App expoe `/assistente` como rota do dashboard, protegida por sessao Supabase SSR |
| **Rastreio** | brief §7 (rota), `middleware.ts` (matcher), `lib/supabase/middleware.ts` (updateSession) |
| **Criterio** | Usuario nao autenticado e redirecionado pelo middleware existente; usuario autenticado ve a tela do assistente |

### FR-2 — UI de chat com streaming

| Campo | Valor |
|-------|-------|
| **Descricao** | Interface de chat de thread unica e efemera (nao persistente entre sessoes) que renderiza resposta do modelo em streaming via Vercel AI SDK v6 |
| **Rastreio** | brief §7 "Interface de chat", "Streaming de resposta", brief §8 OUT "Historico de conversas persistente" |
| **Criterio** | Usuario digita pergunta, aperta enviar, primeiro token aparece em < 2s (NFR-M3 do brief) e resposta chega incrementalmente ate o final |

### FR-3 — Route handler `/api/assistente/chat`

| Campo | Valor |
|-------|-------|
| **Descricao** | Endpoint POST que recebe mensagens do chat, autentica o usuario via Supabase SSR, aplica rate limit, invoca `streamText` do AI SDK com Gemini 2.0 Flash e o toolset, retorna streaming response |
| **Rastreio** | brief §7 "Vercel AI SDK v6", "Modelo: Gemini 2.0 Flash", padrao `lib/supabase/server.ts`, `lib/auth/get-user-role.ts` |
| **Criterio** | Request nao autenticada retorna 401; acima do rate limit retorna 429 com mensagem pt-BR; request valida inicia streaming |

### FR-4 — System prompt grounded

| Campo | Valor |
|-------|-------|
| **Descricao** | System prompt injetado em toda chamada obriga o modelo a **usar sempre as ferramentas**, **nunca inventar dados**, responder em pt-BR, usar linguagem simples (publico 55+), formatar com markdown e tabelas quando relevante, nao expor termos tecnicos ("LLM", "tool", "prompt") ao usuario |
| **Rastreio** | brief §10 CON-5 (publico 55+, zero jargao), brief §11 risco "LLM inventa dados", memoria "feedback_ux_older_audience" |
| **Criterio** | As 5 perguntas-farol retornam respostas com dados reais vindos de tool (verificavel em logs/trace), zero conteudo inventado, zero jargao tecnico |

### FR-5 — Toolset (N = 6)

O MVP define **6 ferramentas** (dentro da faixa 5-8 do brief §7). Cada uma recebe um cliente Supabase SSR RLS-aware e devolve dados do tenant atual.

| Tool ID | Descricao | Cobre use case(s) do brief §6 | Tabelas consultadas | Rastreio |
|---------|-----------|-------------------------------|---------------------|----------|
| **T1 `buscar_gastos_por_periodo`** | Lista/agrega gastos filtrando por periodo, categoria (opcional), motorista (opcional) e caminhao (opcional). Retorna total em centavos e subtotal por categoria. | UC4 (combustivel em marco), UC3 (resumo semanal), UC1 (prejuizo por caminhao) | `gasto`, `categoria_gasto`, `caminhao`, `motorista` | `lib/queries/gastos.ts`, brief §6 |
| **T2 `ranking_caminhoes_por_lucro`** | Para um periodo, calcula por caminhao: `SUM(viagem.valor_frete_centavos) - SUM(gasto.valor) = lucro_centavos`, ordena ascendente (mais prejuizo primeiro) ou descendente. | UC1 (qual caminhao deu mais prejuizo esse mes) | `viagem`, `gasto`, `caminhao` | brief §6 UC1, schema `Viagem.valor_frete_centavos`, `Gasto.valor` |
| **T3 `ranking_viagens_por_margem`** | Para um periodo, calcula por viagem: `(valor_frete_centavos - SUM(gasto.valor onde gasto.viagem_id = viagem.id)) / valor_frete_centavos` e retorna top N. | UC5 (qual viagem teve maior margem) | `viagem`, `gasto` | brief §6 UC5, schema `Gasto.viagem_id` |
| **T4 `motoristas_cnh_vencendo`** | Lista motoristas com `cnh_validade` dentro de N dias a partir de hoje (default 30), respeitando `status = 'ativo'`. | UC2 (CNH vencendo em 30 dias) | `motorista` | brief §6 UC2, schema `Motorista.cnh_validade`, `Motorista.status` |
| **T5 `resumo_desempenho_periodo`** | Agrega num unico objeto: n. viagens, receita total (centavos), gasto total (centavos), lucro (centavos), top 3 categorias de gasto, melhor e pior viagem por margem. Periodo parametrizavel. | UC3 (resumo da ultima semana) | `viagem`, `gasto`, `categoria_gasto` | brief §6 UC3 |
| **T6 `listar_caminhoes`** | Lista caminhoes ativos com placa, modelo, ano. Usado pelo LLM quando o usuario menciona um caminhao por apelido/placa parcial e o LLM precisa resolver o ID. | Apoio transversal a UC1, UC5 | `caminhao` | Descoberta necessaria p/ RLS, schema `Caminhao.ativo` |

**Notas de design do toolset:**
- Toda tool recebe em input **apenas filtros** (datas, ids, N). **Nunca** IDs cross-tenant nem SQL bruto.
- Input valido via **Zod schema** (brief §5 "structured output").
- Output de cada tool e objeto JSON estruturado (nao texto livre) — o modelo recebe dados tipados e decide como formatar a resposta final.
- Valores monetarios sempre em centavos no I/O; formatacao em R$ e responsabilidade do LLM na resposta final.

### FR-6 — RLS-awareness estrita

| Campo | Valor |
|-------|-------|
| **Descricao** | Toda tool usa `createClient()` de `lib/supabase/server.ts` (SSR com cookies do request), e respeita `getMultiEmpresaContext()` quando filtra por empresa |
| **Rastreio** | `lib/supabase/server.ts`, `lib/queries/multi-empresa.ts`, brief §10 CON-3 |
| **Criterio** | Teste automatizado (E2E ou integration) garante que tenant A nao recebe dados de tenant B para nenhuma das 6 tools |

### FR-7 — Rate limiting persistente

| Campo | Valor |
|-------|-------|
| **Descricao** | Antes de invocar o modelo, route handler consulta rate limiter com chave = `usuario.id`. Defaults: **10 perguntas/minuto** e **200 perguntas/dia** por usuario |
| **Rastreio** | brief §7 "Rate limiting persistente", brief §9 NFR-M2 |
| **Criterio** | 11a pergunta dentro de 1 minuto do mesmo user retorna 429 + mensagem pt-BR amigavel; contador sobrevive a cold start |

### FR-8 — Rota inclusa no middleware matcher

| Campo | Valor |
|-------|-------|
| **Descricao** | `middleware.ts` adiciona `/assistente/:path*` e `/api/assistente/:path*` ao matcher para herdar `updateSession()` existente |
| **Rastreio** | `middleware.ts` atual, brief §10 CON-3 (RLS) |
| **Criterio** | Request sem sessao em `/assistente` e redirecionada para login; `/api/assistente/chat` sem sessao retorna 401 |

### FR-9 — Item de menu "Assistente"

| Campo | Valor |
|-------|-------|
| **Descricao** | Dashboard ganha item de menu "Assistente" (label pt-BR, icone de chat) apontando para `/assistente`. Visivel apenas para role `dono` e `admin` (nao `motorista`) |
| **Rastreio** | brief §4 (usuario primario = dono), brief §8 OUT "outros papeis" |
| **Criterio** | Menu renderizado corretamente por role; clique navega para `/assistente` |

### FR-10 — Degradacao graciosa

| Campo | Valor |
|-------|-------|
| **Descricao** | Erros tratados com mensagem pt-BR amigavel: (a) 429 rate limit, (b) cota Gemini esgotada, (c) erro de tool (query falhou), (d) timeout. Nenhum erro tecnico cru exposto ao usuario. |
| **Rastreio** | brief §9 NFR-M4, memoria "feedback_ux_older_audience" |
| **Criterio** | Cada um dos 4 cenarios dispara UI correspondente sem jargao |

---

## 3. Requisitos Nao-funcionais (NFR)

| ID | Requisito | Metrica | Rastreio |
|----|-----------|---------|----------|
| **NFR-1** | Custo financeiro do MVP = **zero** | Nenhum servico pago em uso; free tiers de Gemini + Upstash/KV + Vercel Hobby | brief §10 CON-2 |
| **NFR-2** | Rate limit respeita free tier Gemini | 10 req/min/user, 200 req/dia/user, cap 1024 tokens saida por resposta | brief §9 NFR-M2 |
| **NFR-3** | Primeiro token em < 2s para perguntas curtas | Measurement em producao com tenant demo | brief §9 FR-M3 |
| **NFR-4** | RLS zero vazamento | Teste automatizado cross-tenant | brief §9 FR-M2 |
| **NFR-5** | Acessibilidade publico 55+ | Targets 48px, `text-base` min, sem jargao, sem ingles visivel | memoria "feedback_ux_older_audience" |
| **NFR-6** | Lighthouse nao regride | Pos-deploy Lighthouse em `/` e `/dashboard` >= 95 nas 4 categorias | brief §10 CON-6 |
| **NFR-7** | Degradacao graciosa | Todos os 4 cenarios de erro em FR-10 testados | brief §9 NFR-M4 |
| **NFR-8** | Logs estruturados | Cada chamada de tool loga `{user_id, empresa_id, tool_name, duration_ms}` para debug (sem dados sensiveis) | Boa pratica, nao no brief |

---

## 4. Constraints (CON)

| ID | Constraint | Origem |
|----|------------|--------|
| **CON-1** | Stack congelada (Next.js 16, React 19, Tailwind v4, Supabase SSR) | brief §10 CON-1 |
| **CON-2** | Custo adicional = zero; qualquer ameaca de cobranca dispara degradacao graciosa | brief §10 CON-2 |
| **CON-3** | RLS inviolavel; nenhuma tool bypassa auth | brief §10 CON-3 |
| **CON-4** | Zero mudanca de schema no MVP | brief §10 CON-4 |
| **CON-5** | Pt-BR puro na UI, sem jargao tecnico | brief §10 CON-5 |
| **CON-6** | Lighthouse 98 nao regride | brief §10 CON-6 |
| **CON-7** | Este terminal toca apenas `apps/siga-bem/` | brief §10 CON-7 |
| **CON-8** | Apenas @devops faz git push / PR | brief §10 CON-8 / Article II |
| **CON-9** | Valores monetarios SEMPRE em INTEGER centavos no I/O das tools | `lib/queries/gastos.ts` CON-003 do projeto |
| **CON-10** | Tools usam `@/` absolute imports | CLAUDE.md "Imports" |

---

## 5. Escopo Fora do MVP (reafirmacao)

Reafirmado do brief §8 com detalhamento tecnico das fronteiras:

- **Historico persistente:** zero escrita em tabela de chat. Thread vive em memoria do cliente ate refresh.
- **RAG / embeddings:** zero uso de vector store. Toolset estruturado resolve os 5 use cases.
- **Multiplos modelos:** provider fixo = `@ai-sdk/google`. Trocar provider e trivial (1-2 linhas) mas fica pra release futura.
- **Voice input:** nao implementado.
- **Billing por uso:** nao implementado.
- **Feedback thumbs:** nao implementado.
- **Copilot para motorista/admin:** menu oculto pra role `motorista`; admin TBD em release futura.
- **Documentos alem de CNH:** so `motorista.cnh_validade` no MVP.
- **Tabela de manutencao:** manutencao e categoria de gasto, nao tabela propria.

---

## 6. Dependencias Tecnicas Confirmadas

**A instalar:**
```
ai@^6              # Vercel AI SDK v6
@ai-sdk/google@^2  # Gemini provider
zod@^4             # ja presente — reutilizar
@upstash/ratelimit + @upstash/redis  # OU  @vercel/kv
```
Escolha Upstash vs Vercel KV sera feita no implementation-plan apos checar disponibilidade e limites de free tier vigentes no dia da implementacao.

**Env vars a adicionar (.env.local + Vercel Production):**
- `GOOGLE_GENERATIVE_AI_API_KEY`
- `UPSTASH_REDIS_REST_URL` + `UPSTASH_REDIS_REST_TOKEN` (ou `KV_REST_API_URL` + `KV_REST_API_TOKEN`)

**Nao precisa migrar schema:** todas as queries usam tabelas existentes.

---

## 7. Riscos e Mitigacoes Revisados

| ID | Risco | Impacto | Mitigacao | Rastreio |
|----|-------|---------|-----------|----------|
| **R1** | LLM responde sem usar tool (inventa) | Alto | System prompt estrito + Zod schemas + teste das 5 perguntas-farol comparando output com queries diretas | FR-4, brief §11 |
| **R2** | Vazamento cross-tenant por tool mal-configurada | Critico | Tools nao recebem IDs de empresa no input; usam sempre `getMultiEmpresaContext()` no server-side; teste E2E cross-tenant | FR-6, brief §11 |
| **R3** | Cota gratuita Gemini esgotar | Medio | Rate limit 10/min + 200/dia, cap 1024 tokens out, degradacao graciosa | FR-7, FR-10 |
| **R4** | Erro de tool cai em UI como stack trace | Alto (UX) | Try/catch em cada tool + mapa de erro amigavel + logger.error com contexto (CLAUDE.md Error Handling) | FR-10 |
| **R5** | Upstash/Vercel KV mudar free tier | Baixo | Escolha do provider eh encapsulada em `lib/copilot/rate-limit.ts`; trocar eh refactor local | FR-7 |
| **R6** | Lighthouse regride por bundle do AI SDK | Medio | Rota `/assistente` e code-split (Next.js App Router ja faz); AI SDK so carrega ali; medir Lighthouse antes/depois | NFR-6 |
| **R7** | Streaming nao funciona em Vercel Hobby por timeout | Medio | Fluid Compute tem default 300s; route handler `/api/assistente/chat` roda em Node runtime; streaming nativo do AI SDK e compativel | FR-3 |

---

## 8. Criterios de Aceite Globais

Um engenheiro independente, rodando o projeto localmente com credenciais de teste, consegue:
1. Navegar para `/assistente` e ver a UI do Assistente FrotaViva
2. Fazer cada uma das 5 perguntas-farol e receber resposta com dados reais do tenant demo
3. Verificar nos logs que cada pergunta disparou pelo menos 1 chamada de tool
4. Disparar rate limit proposital (enviar 11 perguntas em 60s) e ver a mensagem amigavel
5. Logar com segundo tenant e confirmar que nao vaza dados do primeiro
6. Rodar `npm run lint && npm run typecheck && npm test && npm run build` sem erros
7. Ver Lighthouse manter-se >= 95 em `/` e `/dashboard`

---

## 9. Proximo Passo

Critique (@qa) + Implementation Plan (@architect), ambos no mesmo GATE-2.
