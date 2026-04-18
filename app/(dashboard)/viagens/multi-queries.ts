/**
 * Multi-empresa viagens queries — accept (client, empresaId) and filter
 * by empresa_id explicitly. Works with both authenticated and admin clients.
 *
 * Delegates read queries to lib/repositories/viagens.ts.
 */

import type { SupabaseClient } from '@supabase/supabase-js';
import type { ViagemListItem } from '@/types/viagem';
import { listViagensRepo } from '@/lib/repositories/viagens';

export async function listViagensForEmpresa(
  client: SupabaseClient,
  empresaId: string,
): Promise<{ data: ViagemListItem[]; total: number }> {
  const result = await listViagensRepo(client, [empresaId], { pageSize: 100 });

  return {
    data: result.data ?? [],
    total: result.total,
  };
}
