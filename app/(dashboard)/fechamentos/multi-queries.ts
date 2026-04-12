/**
 * Multi-empresa fechamentos actions — admin client versions that accept
 * (admin, empresaId) and filter by empresa_id explicitly.
 *
 * Delegates read queries to lib/repositories/fechamentos.ts.
 */

import type { SupabaseClient } from '@supabase/supabase-js';
import { getViagensPendentesAcertoRepo } from '@/lib/repositories/fechamentos';
import type { ViagemPendenteAcerto } from '@/lib/repositories/fechamentos';

// Re-export type for consumers
export type { ViagemPendenteAcerto };

export async function getViagensPendentesAcertoForEmpresa(
  admin: SupabaseClient,
  empresaId: string,
): Promise<{ data: ViagemPendenteAcerto[] | null; error: string | null }> {
  return getViagensPendentesAcertoRepo(admin, [empresaId]);
}
