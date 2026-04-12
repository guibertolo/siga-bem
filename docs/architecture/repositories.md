# Camada de Repositorio

## Padrao

Cada dominio tem um arquivo em `lib/repositories/` que contem toda a logica de leitura (queries Supabase). Server actions delegam pra ca.

```
lib/repositories/
  bi.ts           # KPIs, rankings, tendencias, alertas
  dashboard.ts    # Cards do dashboard, viagem ativa, micro data
  fechamentos.ts  # Lista, pendentes, motoristas pra fechamento
  viagens.ts      # Lista, motoristas ativos, caminhoes ativos
```

## Assinatura padrao

Toda funcao do repositorio recebe:
1. `client: SupabaseClient` (criado na action, respeita RLS do usuario autenticado)
2. `empresaIds: string[]` (1 elemento pra single-empresa, N pra multi)

```typescript
export async function listViagensRepo(
  client: SupabaseClient,
  empresaIds: string[],
  filters?: { status?: string }
) { ... }
```

## Quem chama quem

```
page.tsx (server component)
  -> actions.ts (server action, auth + empresaId)
     -> lib/repositories/*.ts (query pura)

  -> multi-queries.ts (wrapper fino pro modo multi-empresa)
     -> lib/repositories/*.ts (mesma query, empresaIds diferentes)
```

## Regras

- Repositorios NAO fazem autenticacao. Quem autentica e a action.
- Repositorios NAO usam `'use server'`. Sao funcoes normais chamadas de server actions.
- Mutations (create, update, delete) ficam em actions.ts, NAO no repositorio.
- Ao adicionar query nova: criar no repositorio, expor na action e multi-queries.

## Extensao

Pra adicionar um novo dominio:
1. Criar `lib/repositories/{dominio}.ts`
2. Extrair reads de `app/(dashboard)/{dominio}/actions.ts`
3. Fazer multi-queries.ts delegar pro repositorio
4. Rodar testes: `npm test`
