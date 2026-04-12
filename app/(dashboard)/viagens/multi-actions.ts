/**
 * Multi-empresa viagens actions — admin client versions that accept
 * (admin, empresaId) and filter by empresa_id explicitly.
 *
 * These bypass RLS. Ownership MUST be validated by the caller
 * (queryMultiEmpresa validates via getMultiEmpresaContext).
 */

import type { SupabaseClient } from '@supabase/supabase-js';
import { singleRelation } from '@/lib/utils/supabase-types';
import type { ViagemListItem } from '@/types/viagem';

export async function listViagensForEmpresa(
  admin: SupabaseClient,
  empresaId: string,
): Promise<{ data: ViagemListItem[]; total: number }> {
  const { data, count, error } = await admin
    .from('viagem')
    .select(`
      id,
      motorista_id,
      origem,
      destino,
      data_saida,
      valor_total,
      percentual_pagamento,
      status,
      motorista ( nome ),
      caminhao ( placa )
    `, { count: 'exact' })
    .eq('empresa_id', empresaId)
    .order('data_saida', { ascending: false })
    .limit(100);

  if (error) {
    return { data: [], total: 0 };
  }

  const items: ViagemListItem[] = (data ?? []).map((row) => {
    const mot = singleRelation<{ nome: string }>(row.motorista);
    const cam = singleRelation<{ placa: string }>(row.caminhao);

    return {
      id: row.id,
      motorista_id: row.motorista_id,
      origem: row.origem,
      destino: row.destino,
      motorista_nome: mot?.nome ?? 'Desconhecido',
      caminhao_placa: cam?.placa ?? '-',
      data_saida: row.data_saida,
      valor_total: row.valor_total,
      percentual_pagamento: row.percentual_pagamento,
      status: row.status,
    };
  });

  return { data: items, total: count ?? 0 };
}
