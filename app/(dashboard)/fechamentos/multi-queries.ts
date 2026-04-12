/**
 * Multi-empresa fechamentos actions — admin client versions that accept
 * (admin, empresaId) and filter by empresa_id explicitly.
 */

import type { SupabaseClient } from '@supabase/supabase-js';
import { singleRelation } from '@/lib/utils/supabase-types';
import type { ViagemPendenteAcerto } from '@/app/(dashboard)/fechamentos/actions';

export async function getViagensPendentesAcertoForEmpresa(
  admin: SupabaseClient,
  empresaId: string,
): Promise<{ data: ViagemPendenteAcerto[] | null; error: string | null }> {
  // 1. Get all concluida viagens for this empresa
  const { data: viagens, error: viagensError } = await admin
    .from('viagem')
    .select('id, motorista_id, origem, destino, data_saida, valor_total, percentual_pagamento, motorista ( nome )')
    .eq('empresa_id', empresaId)
    .eq('status', 'concluida')
    .order('data_saida', { ascending: false });

  if (viagensError) {
    return { data: null, error: viagensError.message };
  }

  if (!viagens || viagens.length === 0) {
    return { data: [], error: null };
  }

  // 2. Get all viagem referencia_ids that already have a fechamento_item
  const viagemIds = viagens.map((v) => v.id);
  const { data: itensExistentes, error: itensError } = await admin
    .from('fechamento_item')
    .select('referencia_id')
    .eq('tipo', 'viagem')
    .in('referencia_id', viagemIds);

  if (itensError) {
    return { data: null, error: itensError.message };
  }

  const idsComAcerto = new Set((itensExistentes ?? []).map((i) => i.referencia_id));
  const pendenteViagens = viagens.filter((v) => !idsComAcerto.has(v.id));

  // 3. Query total despesas per viagem
  const pendenteIds = pendenteViagens.map((v) => v.id);
  const despesasPorViagem = new Map<string, number>();

  if (pendenteIds.length > 0) {
    const { data: gastosData } = await admin
      .from('gasto')
      .select('viagem_id, valor')
      .in('viagem_id', pendenteIds);

    if (gastosData) {
      for (const g of gastosData) {
        if (g.viagem_id) {
          despesasPorViagem.set(g.viagem_id, (despesasPorViagem.get(g.viagem_id) ?? 0) + g.valor);
        }
      }
    }
  }

  const pendentes: ViagemPendenteAcerto[] = pendenteViagens.map((v) => {
    const mot = singleRelation<{ nome: string }>(v.motorista);
    return {
      id: v.id,
      motorista_id: v.motorista_id,
      motorista_nome: mot?.nome ?? 'Desconhecido',
      origem: v.origem,
      destino: v.destino,
      data_saida: v.data_saida,
      valor_total: v.valor_total,
      percentual_pagamento: v.percentual_pagamento,
      valor_motorista: Math.round((v.valor_total * v.percentual_pagamento) / 100),
      totalDespesas: despesasPorViagem.get(v.id) ?? 0,
    };
  });

  return { data: pendentes, error: null };
}
