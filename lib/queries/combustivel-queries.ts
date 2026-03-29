/**
 * Fuel (abastecimento) query module.
 * Story 5.3 — Lista de Abastecimentos na Viagem
 *
 * CRITICAL (CON-003): All monetary values are INTEGER centavos.
 */

import type { SupabaseClient } from '@supabase/supabase-js';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface AbastecimentoItem {
  id: string;
  data: string;
  valor: number; // centavos
  litros: number;
  tipo_combustivel: string | null;
  posto_local: string | null;
  uf_abastecimento: string | null;
  km_registro: number | null;
  tem_foto: boolean;
}

export interface AbastecimentoListResult {
  data: AbastecimentoItem[];
  error: string | null;
}

// ---------------------------------------------------------------------------
// Query
// ---------------------------------------------------------------------------

/**
 * Fetch all fuel expenses for a trip, ordered by date descending.
 * A fuel expense is any `gasto` row where `litros IS NOT NULL`.
 *
 * RLS automatically filters by role:
 * - motorista sees only their own records
 * - dono/admin sees all records for the empresa
 *
 * Story 5.3 — AC 4, 7, 8, 11
 */
export async function getAbastecimentosPorViagem(
  supabase: SupabaseClient,
  viagemId: string,
): Promise<AbastecimentoListResult> {
  const { data, error } = await supabase
    .from('gasto')
    .select(`
      id,
      data,
      valor,
      litros,
      tipo_combustivel,
      posto_local,
      uf_abastecimento,
      km_registro,
      foto_comprovante (
        id
      )
    `)
    .eq('viagem_id', viagemId)
    .not('litros', 'is', null)
    .order('data', { ascending: false })
    .order('created_at', { ascending: false });

  if (error) {
    return { data: [], error: `Erro ao buscar abastecimentos: ${error.message}` };
  }

  const items: AbastecimentoItem[] = (data ?? []).map((row) => {
    // foto_comprovante comes as an array (one-to-many relation)
    const fotos = row.foto_comprovante as unknown as Array<{ id: string }> | null;

    return {
      id: row.id as string,
      data: row.data as string,
      valor: row.valor as number,
      litros: row.litros as number,
      tipo_combustivel: row.tipo_combustivel as string | null,
      posto_local: row.posto_local as string | null,
      uf_abastecimento: row.uf_abastecimento as string | null,
      km_registro: row.km_registro as number | null,
      tem_foto: Array.isArray(fotos) && fotos.length > 0,
    };
  });

  return { data: items, error: null };
}
