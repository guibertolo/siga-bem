# Implementation Plan — Assistente FrotaViva

**Versao:** 0.1
**Data:** 2026-04-10
**Autor:** @architect (Aria)
**Rastreia:** [spec.md](./spec.md), [critique.md APPROVED 4.5/5](./critique.md), [complexity.md STANDARD](./complexity.md)
**Recomendacoes da critique incorporadas:** R8 (cap de 50 linhas por tool), NFR-3 calibrado, FR-4 testing via spy, NFR-8 logs via **Sentry free tier com fallback gracioso para `console`** (decisao GATE-2: sem pagamento extra; se cota free estourar, logger degrada para console sem quebrar feature), FR-9 label "Assistente"

---

## 1. Arquitetura Tecnica

```
app/
  (dashboard)/
    assistente/
      page.tsx              # Server component: verifica role (FR-9) e renderiza UI client
      chat-ui.tsx           # Client component: useChat() do AI SDK, streaming UI
      loading.tsx
      error.tsx
  api/
    assistente/
      chat/
        route.ts            # POST handler: auth + rate limit + streamText + tools

lib/
  copilot/
    client.ts               # Factory do provider Gemini via @ai-sdk/google
    system-prompt.ts        # String constante do system prompt (FR-4)
    rate-limit.ts           # Wrapper sobre @upstash/ratelimit OU @vercel/kv
    tools/
      index.ts              # Agrega e exporta o toolset
      buscar-gastos-por-periodo.ts     # T1
      ranking-caminhoes-por-lucro.ts   # T2
      ranking-viagens-por-margem.ts    # T3
      motoristas-cnh-vencendo.ts       # T4
      resumo-desempenho-periodo.ts     # T5
      listar-caminhoes.ts              # T6
    utils/
      period.ts             # Parser de periodo ("este mes", "ultima semana", "marco") -> datas
      format.ts             # Helpers de formatacao (centavos, datas)

middleware.ts               # Atualizar matcher: adicionar /assistente e /api/assistente

components/
  ui/
    chat-message.tsx        # Componente de mensagem (reuso em futuros chats)
    chat-input.tsx          # Input com botao enviar 48px+
    chat-empty-state.tsx    # Estado vazio com as 5 perguntas farol como sugestoes
```

**Decisoes arquiteturais:**

- **Runtime do route handler:** Node.js (nao Edge). Motivo: Supabase SSR + Sentry sao mais simples e Fluid Compute cobre o timeout.
- **Streaming:** `streamText()` do AI SDK v6 + `useChat()` do lado cliente. Protocolo SSE padrao do AI SDK.
- **Rate limit provider:** Decisao final entre Upstash e Vercel KV sera tomada **no inicio da Story S1** apos checar docs oficiais (free tier vigente, quotas, compatibilidade com Node runtime). Default preferencial = **Upstash Redis** porque `@upstash/ratelimit` ja tem helpers prontos (`slidingWindow`, `fixedWindow`).
- **Tool contract:** cada tool exporta `{ schema: z.ZodObject, execute: async (input, context) => object }`. Wrapper em `tools/index.ts` injeta contexto (`supabase`, `usuario`, `empresaIds`) e aplica try/catch + cap de 50 linhas.
- **Cap de 50 linhas por tool (R8):** constante `MAX_TOOL_ROWS = 50` em `lib/copilot/tools/index.ts`. Tools passam isso como `.limit()` no Supabase query.

---

## 2. Quebra em Stories (Fase 3 preview)

**Decidido no GATE-2:** 7 stories, fundindo UI da pagina com item de menu (acoplamento logico).

O @sm deve criar estas stories na Fase 3:

| # | Story (Epic 8) | Agente owner | Depende de | Estimativa relativa |
|---|-------|--------------|------------|---------------------|
| **8.1** | Setup: install deps, env vars, middleware matcher, rate-limit provider decision | @dev | — | P |
| **8.2** | Tool T1 + T6 (buscar_gastos_por_periodo + listar_caminhoes) + util `period.ts` | @dev | 8.1 | M |
| **8.3** | Tool T2 + T3 (ranking_caminhoes_por_lucro + ranking_viagens_por_margem) | @dev | 8.2 | M |
| **8.4** | Tool T4 + T5 (motoristas_cnh_vencendo + resumo_desempenho_periodo) | @dev | 8.2 | M |
| **8.5** | Route handler `/api/assistente/chat` + system prompt + streamText integration + logger (Sentry free tier com fallback console) | @dev | 8.3, 8.4 | M |
| **8.6** | UI `/assistente` (page + chat-ui + empty state + 48px targets) **+ item de menu "Assistente" no dashboard gated por role** (FR-9) | @dev | 8.5 | M |
| **8.7** | Testes: unit dos period parser + integration das 6 tools + E2E cross-tenant das 5 perguntas farol (spy anti-alucinacao) | @dev / @qa | 8.6 | G |

**Total: 7 stories.** 8.6 combina page + menu porque o menu aponta pra `/assistente` e so faz sentido ativar junto.

**Legenda de tamanho:** P = pequeno (< 1h), M = medio (1-4h), G = grande (> 4h).

---

## 3. Sequenciamento e Riscos

**Caminho critico:** 8.1 → 8.2 → 8.5 → 8.6 → 8.7. 8.3 e 8.4 podem ser feitas em paralelo a 8.2 depois que os tipos de input/output estiverem definidos. Testes unitarios sao escritos junto com cada story; integration e E2E concentram em 8.7.

**Gates intra-Fase-4 (self-verify por story):**
- `npm run lint && npm run typecheck && npm test && npm run build` devem passar ao fim de cada story
- Lighthouse manual em `/` so e verificado ao fim de S6 (quando a UI vai ao ar)

---

## 4. Acceptance Tests Globais (Fase 5 QA)

Mapeados para os criterios §8 da spec:

| Criterio §8 | Como validar |
|-------------|--------------|
| 1. Navegar para `/assistente` | E2E (Playwright ou Cypress — decidir no plan de testes do projeto) |
| 2. 5 perguntas farol com dados reais | Teste de integracao em cada tool + teste manual no tenant demo |
| 3. Logs mostram tool chamada | Teste com spy no AI SDK que falha se zero tool calls em 5 prompts farol |
| 4. Rate limit dispara mensagem amigavel | Teste de integracao enviando 11 requests em < 60s |
| 5. Cross-tenant nao vaza | Teste com 2 cookies de tenants diferentes chamando cada tool |
| 6. Build passa | CI automatico |
| 7. Lighthouse >= 95 | Rodar `lighthouse` em producao pos-deploy |

---

## 5. ENV Vars Checklist

**Local (.env.local):**
- `GOOGLE_GENERATIVE_AI_API_KEY` — obter em https://aistudio.google.com
- `UPSTASH_REDIS_REST_URL` + `UPSTASH_REDIS_REST_TOKEN` (ou Vercel KV equivalente)

**Vercel Production:** espelhar as 3 env vars via `vercel env add` ou dashboard. @devops fara isso na Fase 6 antes do deploy.

---

## 6. Docs Oficiais a Consultar Antes de Codar (obrigatorio)

Por regra do projeto, APIs mudam. Na Story S1 o @dev DEVE abrir:

- **AI SDK v6:** https://sdk.vercel.ai/docs — especificamente `streamText`, `tool()`, `@ai-sdk/google`
- **Next.js App Router:** https://nextjs.org/docs/app — route handlers streaming, client/server boundary
- **Upstash Ratelimit:** https://upstash.com/docs/redis/sdks/ratelimit-ts/overview
- **Vercel KV (se escolhido):** https://vercel.com/docs/storage/vercel-kv
- **Google AI Studio free tier:** confirmar limites vigentes antes de travar NFR-2

---

## 7. Deploy / Release (Fase 6 — @devops)

- Merge PR em `main` apos QA PASS
- @devops adiciona env vars em Vercel production
- Deploy automatico via Vercel
- Smoke test manual das 5 perguntas farol no tenant demo em producao
- Tag release (ex: `v0.x.y-copilot-mvp`)
- Lighthouse manual pos-deploy

---

## 8. Rollback Plan

Se o deploy em producao der problema:
1. @devops reverte via Vercel (`Promote previous deployment`)
2. Feature e **complementar** (brief §11 ultimo risco), entao rollback nao afeta operacao da frota
3. Env vars ficam; apenas o codigo volta

---

## 9. Proximo Passo

**GATE-2** — validacao do stakeholder antes de ir para Fase 3 (criar e validar as 8 stories via @sm + @po).
