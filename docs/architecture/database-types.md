# Database Types

## Como regenerar tipos apos migration nova

Apos criar ou alterar uma migration em `supabase/migrations/`:

1. Aplicar a migration no banco remoto:
   ```bash
   npx supabase db push
   ```

2. Regenerar os tipos TypeScript:
   ```bash
   npm run db:types
   ```

3. Verificar que o typecheck passa:
   ```bash
   npm run typecheck
   ```

4. Commitar o arquivo atualizado:
   ```bash
   git add types/database.generated.ts
   ```

## Estrutura de tipos

| Arquivo | Conteudo |
|---------|----------|
| `types/database.generated.ts` | Tipos gerados pelo Supabase CLI (NAO editar manualmente) |
| `types/database.ts` | Tipos manuais canonicos (enums, interfaces de dominio) |
| `types/usuario.ts` | Re-export de Usuario + tipos derivados (input/list) |
| `lib/utils/supabase-types.ts` | Helper `singleRelation` para joins |

## Helper singleRelation

Supabase retorna joins many-to-one como `T | T[]`. O helper normaliza pra `T | null`:

```typescript
import { singleRelation } from '@/lib/utils/supabase-types';

const mot = singleRelation<{ nome: string }>(row.motorista);
// mot: { nome: string } | null
```
