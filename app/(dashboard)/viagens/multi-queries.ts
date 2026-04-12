/**
 * Multi-empresa viagens actions — admin client versions that accept
 * (admin, empresaId) and filter by empresa_id explicitly.
 *
 * Delegates read queries to lib/repositories/viagens.ts.
 */

import type { SupabaseClient } from '@supabase/supabase-js';
import type { ViagemListItem } from '@/types/viagem';
import { listViagensRepo } from '@/lib/repositories/viagens';

export async function listViagensForEmpresa(
  admin: SupabaseClient,
  empresaId: string,
): Promise<{ data: ViagemListItem[]; total: number }> {
  const result = await listViagensRepo(admin, [empresaId], { pageSize: 100 });

  return {
    data: result.data ?? [],
    total: result.total,
  };
}
