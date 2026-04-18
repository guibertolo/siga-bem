# Complexity Assessment — Assistente FrotaViva

**Agente:** @architect (Aria)
**Data:** 2026-04-10
**Metodo:** Pipeline step-10, 5 dimensoes scored 1-5

---

## Scoring

| Dimensao | Score | Justificativa |
|----------|-------|---------------|
| **Scope** — arquivos afetados | 3 | Nova rota `/assistente`, nova API route `/api/assistente/chat`, novo diretorio `lib/copilot/` (tools + system prompt + rate-limit + client Gemini), componentes de UI novos (`app/(dashboard)/assistente/`), atualizacao do `middleware.ts` (matcher) e do menu do dashboard. Sem mudanca de schema. |
| **Integration** — APIs externas | 3 | Duas integracoes externas novas: Google AI Studio (Gemini) via `@ai-sdk/google` e Upstash Redis/Vercel KV para rate limit. Supabase (existente) e reusado sem mudanca. |
| **Infrastructure** — mudancas de infra | 2 | 3 ENV vars novas (`GOOGLE_GENERATIVE_AI_API_KEY`, `UPSTASH_REDIS_REST_URL`, `UPSTASH_REDIS_REST_TOKEN` ou equivalente KV). Zero migracoes. Zero mudancas em Supabase/Vercel/CI pipeline alem de env vars. |
| **Knowledge** — familiaridade | 2 | AI SDK v6 + tool use e framework bem documentado. Equipe tem experiencia com Next.js/Supabase SSR (dominio alto). Gemini provider e Upstash sao pontos novos mas de baixa curva. |
| **Risk** — criticidade | 3 | Feature roda em producao ao lado de um app ja live (Lighthouse 98). RLS cross-tenant e critica (publico alto se vazar). Custo e constraint absoluta (CON-2). Feature e complementar, entao falha nao para operacao — mitiga parte do risco. |

**Total:** 13 / 25

## Classificacao

**STANDARD** (faixa 9-15)

## Implicacoes para o Pipeline

- Fase 2 segue as 6 etapas completas (gather, assess, research, spec, critique, plan) — **nao e SIMPLE**
- Como o stakeholder explicitamente optou por pular research (Fase 0) e ja temos brief detalhado, consolidamos: **spec + critique + implementation plan em um unico GATE-2**
- **Nao ha revision cycle** (isso so ocorre em COMPLEX)
- Se criticue retornar NEEDS_REVISION ou BLOCKED, volta manualmente antes do GATE-2

## Nota sobre o fast-track pedido pelo stakeholder

O stakeholder pediu "fast-track SIMPLE". A avaliacao honesta do @architect e **STANDARD**, nao SIMPLE. A diferenca pratica para este MVP:
- SIMPLE pularia a fase de research de dependencias e a critique formal
- STANDARD executa tudo mas sem o revision cycle de COMPLEX

Como o stakeholder ja dispensou o research de Fase 0 e temos um brief completo (v0.2), a velocidade efetiva fica proxima do fast-track pedido — apenas com a critique formal mantida para garantir Article IV (No Invention).

**Aceito fazer trade-off com o stakeholder** se ele quiser pular a critique: basta aprovar SIMPLE explicitamente no GATE-2. Padrao deste documento = STANDARD.
