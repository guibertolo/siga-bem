/**
 * Multi-empresa fechamentos queries — accept (client, empresaId) and filter
 * by empresa_id explicitly. Works with both authenticated and admin clients.
 *
 * Delegates read queries to lib/repositories/fechamentos.ts.
 */

import type { SupabaseClient } from '@supabase/supabase-js';
import { getViagensPendentesAcertoRepo } from '@/lib/repositories/fechamentos';
import type { ViagemPendenteAcerto } from '@/lib/repositories/fechamentos';

// Re-export type for consumers
export type { ViagemPendenteAcerto };

export async function getViagensPendentesAcertoForEmpresa(
  client: SupabaseClient,
  empresaId: string,
): Promise<{ data: ViagemPendenteAcerto[] | null; error: string | null }> {
  return getViagensPendentesAcertoRepo(client, [empresaId]);
}
