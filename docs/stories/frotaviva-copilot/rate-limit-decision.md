# Rate-Limit Provider Decision — Story 9.1

**Data:** 2026-04-10
**Decisor:** @dev (Dex)
**Contexto:** Story 9.1 AC-3 exige decisao fundamentada sobre provider de rate-limit.

---

## Opcoes Avaliadas

### Opcao A — Upstash Redis + @upstash/ratelimit
- **Pacotes:** `@upstash/ratelimit@^2.0.8` + `@upstash/redis@^1.37.0`
- **API:** `Ratelimit.slidingWindow(10, "60 s")` + `.limit(userId)` — pronto em 5 linhas
- **Free tier vigente (2026-04):** 500.000 comandos/mes + 256 MB storage, sem expiracao
- **Integracao:** `Redis.fromEnv()` le `UPSTASH_REDIS_REST_URL` + `UPSTASH_REDIS_REST_TOKEN`

### Opcao B — Vercel KV (`@vercel/kv`)
- **Pacotes:** `@vercel/kv`
- **API:** KV e low-level (get/set/incr); rate-limit precisa ser escrito a mao ou combinado com `@upstash/ratelimit` (que tambem suporta `Redis` do Vercel KV, ja que KV = Upstash por baixo)
- **Free tier vigente (2026-04):** 30.000 comandos/mes na Hobby — mais **apertado** que Upstash direto
- **Integracao:** `KV_REST_API_URL` + `KV_REST_API_TOKEN`, auto-provisionado se criado via dashboard Vercel

---

## Decisao

**Escolhido: Opcao A — Upstash Redis + @upstash/ratelimit**

## Rationale

1. **Helpers prontos:** `Ratelimit.slidingWindow()` resolve o FR-7 (10/min + 200/dia) em poucas linhas. Com Vercel KV puro, seria necessario implementar o algoritmo manualmente — mais codigo, mais risco.
2. **Free tier mais generoso:** 500k comandos/mes (Upstash) vs 30k/mes (Vercel KV Hobby). Com 0 usuarios hoje e crescimento gradual, o headroom do Upstash e ordem de magnitude maior.
3. **Mesma tecnologia por baixo:** Vercel KV usa Upstash nos bastidores. Entao a escolha de "manter no ecossistema Vercel" nao traz vantagem tecnica real, apenas de billing unificado — que nao importa porque estamos no free tier dos dois.
4. **Portabilidade:** Upstash independe de plataforma. Se um dia o projeto sair da Vercel, nao precisa trocar provider.

## Plano de Fallback

Se a cota gratuita do Upstash estourar (muito improvavel com 0-100 usuarios):

- **Curto prazo (ate 24h):** o `checkRateLimit()` da 9.1 envolve a chamada `.limit()` em try/catch. Se a chamada falhar, **fail-open** com log de warning — usuario nao e bloqueado, mas o incidente fica registrado. Isso mantem a feature rodando enquanto @devops investiga.
- **Medio prazo:** trocar para Vercel KV ou outro provider trocando o import em `lib/copilot/rate-limit.ts`. Como o resto do codigo depende apenas da interface `checkRateLimit(userId)`, a troca e local.

## Limites Configurados (FR-7 da spec)

```ts
RATE_LIMIT_PER_MINUTE = 10
RATE_LIMIT_PER_DAY = 200
```

Implementacao usa **dois limitadores** em sliding window: um de `60 s` e outro de `24 h`, ambos consultados a cada request. O mais restritivo decide.

## Env Vars Necessarias

```env
UPSTASH_REDIS_REST_URL=https://<your-db>.upstash.io
UPSTASH_REDIS_REST_TOKEN=<your-token>
```

Obter em https://console.upstash.com (criar uma Redis database free tier).
