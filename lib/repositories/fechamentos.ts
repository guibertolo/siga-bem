/**
 * Fechamentos repository — unified read queries for fechamento data.
 *
 * CRITICAL: This domain handles money. Query logic, filters, sorts,
 * and calculations are preserved exactly as they were in the original files.
 */

import type { SupabaseClient } from '@supabase/supabase-js';
import { singleRelation } from '@/lib/utils/supabase-types';
import type {
  FechamentoListItem,
  FechamentoDetalhado,
  FechamentoCalculo,
  Fechamento,
  FechamentoItem,
  PreviewFechamento,
  PreviewViagemItem,
  PreviewGastoItem,
} from '@/types/fechamento';
import type { FechamentoStatus } from '@/types/database';
import {
  calcularValorMotorista,
  agruparDespesasPorViagem,
} from '@/lib/business/fechamentos';

// ---------------------------------------------------------------------------
// Types (re-exported so consumers keep importing from actions.ts)
// ---------------------------------------------------------------------------

export interface ViagemPendenteAcerto {
  id: string;
  motorista_id: string;
  motorista_nome: string;
  origem: string;
  destino: string;
  data_saida: string;
  valor_total: number;             // centavos
  percentual_pagamento: number;
  valor_motorista: number;         // centavos
  totalDespesas: number;           // centavos — sum of gastos linked to this viagem
}

// ---------------------------------------------------------------------------
// Repository functions
// ---------------------------------------------------------------------------

/**
 * List motoristas ativos for fechamento select (only dono/admin).
 */
export async function listMotoristasParaFechamentoRepo(
  client: SupabaseClient,
  empresaIds: string[],
): Promise<{
  data: Array<{ id: string; nome: string }> | null;
  error: string | null;
}> {
  const { data, error } = await client
    .from('motorista')
    .select('id, nome')
    .in('empresa_id', empresaIds)
    .eq('status', 'ativo')
    .order('nome');

  if (error) return { data: null, error: error.message };
  return { data, error: null };
}

/**
 * Preview calculation for a fechamento.
 */
export async function previewFechamentoRepo(
  client: SupabaseClient,
  motoristaId: string,
  periodoInicio: string,
  periodoFim: string,
): Promise<{ data: FechamentoCalculo | null; error: string | null }> {
  const { data, error } = await client.rpc('fn_calcular_fechamento', {
    p_motorista_id: motoristaId,
    p_periodo_inicio: periodoInicio,
    p_periodo_fim: periodoFim,
  });

  if (error) {
    return { data: null, error: error.message };
  }

  if (!data || data.length === 0) {
    return {
      data: {
        total_viagens: 0,
        total_gastos: 0,
        saldo_motorista: 0,
        qtd_viagens: 0,
        qtd_gastos: 0,
      },
      error: null,
    };
  }

  const row = data[0];
  return {
    data: {
      total_viagens: row.total_viagens,
      total_gastos: row.total_gastos,
      saldo_motorista: row.saldo_motorista,
      qtd_viagens: Number(row.qtd_viagens),
      qtd_gastos: Number(row.qtd_gastos),
    },
    error: null,
  };
}

/**
 * Detailed preview with line-by-line viagens and gastos.
 */
export async function previewFechamentoDetalhadoRepo(
  client: SupabaseClient,
  motoristaId: string,
  periodoInicio: string,
  periodoFim: string,
): Promise<{ data: PreviewFechamento | null; error: string | null }> {
  const [calcResult, viagensResult, gastosResult] = await Promise.all([
    client.rpc('fn_calcular_fechamento', {
      p_motorista_id: motoristaId,
      p_periodo_inicio: periodoInicio,
      p_periodo_fim: periodoFim,
    }),
    client
      .from('viagem')
      .select('id, origem, destino, valor_total, percentual_pagamento, data_saida')
      .eq('motorista_id', motoristaId)
      .eq('status', 'concluida')
      .gte('data_saida', `${periodoInicio}T00:00:00`)
      .lte('data_saida', `${periodoFim}T23:59:59`)
      .order('data_saida', { ascending: true }),
    client
      .from('gasto')
      .select('id, descricao, valor, data, categoria_gasto(nome)')
      .eq('motorista_id', motoristaId)
      .gte('data', periodoInicio)
      .lte('data', periodoFim)
      .order('data', { ascending: true }),
  ]);

  if (calcResult.error) {
    return { data: null, error: calcResult.error.message };
  }

  const calc = calcResult.data?.[0] ?? {
    total_viagens: 0,
    total_gastos: 0,
    saldo_motorista: 0,
    qtd_viagens: 0,
    qtd_gastos: 0,
  };

  const viagens: PreviewViagemItem[] = (viagensResult.data ?? []).map((v) => ({
    id: v.id,
    origem: v.origem,
    destino: v.destino,
    data_saida: v.data_saida.split('T')[0],
    valor_total: v.valor_total,
    percentual_pagamento: v.percentual_pagamento,
    valor_motorista: calcularValorMotorista(v.valor_total, v.percentual_pagamento),
  }));

  const gastos: PreviewGastoItem[] = (gastosResult.data ?? []).map((g) => {
    const cat = singleRelation<{ nome: string }>(g.categoria_gasto);
    return {
      id: g.id,
      data: g.data,
      categoria: cat?.nome ?? 'Sem categoria',
      descricao: g.descricao,
      valor: g.valor,
    };
  });

  return {
    data: {
      totais: {
        total_viagens: calc.total_viagens,
        total_gastos: calc.total_gastos,
        saldo_motorista: calc.saldo_motorista,
        qtd_viagens: Number(calc.qtd_viagens),
        qtd_gastos: Number(calc.qtd_gastos),
      },
      viagens,
      gastos,
    },
    error: null,
  };
}

/**
 * List viagens concluidas not yet part of any fechamento.
 */
export async function getViagensPendentesAcertoRepo(
  client: SupabaseClient,
  empresaIds: string[],
): Promise<{ data: ViagemPendenteAcerto[] | null; error: string | null }> {
  // 1. Get all concluida viagens
  const { data: viagens, error: viagensError } = await client
    .from('viagem')
    .select('id, motorista_id, origem, destino, data_saida, valor_total, percentual_pagamento, motorista ( nome )')
    .in('empresa_id', empresaIds)
    .eq('status', 'concluida')
    .order('data_saida', { ascending: false });

  if (viagensError) {
    return { data: null, error: viagensError.message };
  }

  if (!viagens || viagens.length === 0) {
    return { data: [], error: null };
  }

  // 2. Get fechamento IDs that are fully paid
  const { data: fechamentosPagos } = await client
    .from('fechamento')
    .select('id')
    .in('empresa_id', empresaIds)
    .eq('status', 'pago');

  const pagoIds = new Set((fechamentosPagos ?? []).map((f) => f.id));

  // 3. Get viagem referencia_ids linked to a PAID fechamento only
  const viagemIds = viagens.map((v) => v.id);
  const { data: itensExistentes, error: itensError } = await client
    .from('fechamento_item')
    .select('referencia_id, fechamento_id')
    .eq('tipo', 'viagem')
    .in('referencia_id', viagemIds);

  if (itensError) {
    return { data: null, error: itensError.message };
  }

  const idsComAcerto = new Set(
    (itensExistentes ?? [])
      .filter((i) => pagoIds.has(i.fechamento_id))
      .map((i) => i.referencia_id),
  );
  const pendenteViagens = viagens.filter((v) => !idsComAcerto.has(v.id));

  // 3. Query total despesas per viagem
  const pendenteIds = pendenteViagens.map((v) => v.id);
  let despesasPorViagem = new Map<string, number>();

  if (pendenteIds.length > 0) {
    const { data: gastosData } = await client
      .from('gasto')
      .select('viagem_id, valor')
      .in('viagem_id', pendenteIds);

    if (gastosData) {
      despesasPorViagem = agruparDespesasPorViagem(gastosData);
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
      valor_motorista: calcularValorMotorista(v.valor_total, v.percentual_pagamento),
      totalDespesas: despesasPorViagem.get(v.id) ?? 0,
    };
  });

  return { data: pendentes, error: null };
}

/**
 * List fechamentos with optional filters.
 */
export async function listFechamentosRepo(
  client: SupabaseClient,
  empresaIds: string[],
  filters?: {
    motorista_id?: string;
    status?: FechamentoStatus;
    page?: number;
    pageSize?: number;
  },
): Promise<{
  data: FechamentoListItem[] | null;
  total: number;
  error: string | null;
}> {
  const page = filters?.page ?? 1;
  const pageSize = filters?.pageSize ?? 20;
  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;

  let query = client
    .from('fechamento')
    .select(`
      id,
      tipo,
      status,
      periodo_inicio,
      periodo_fim,
      total_viagens,
      total_gastos,
      saldo_motorista,
      created_at,
      motorista ( nome )
    `, { count: 'exact' })
    .in('empresa_id', empresaIds);

  if (filters?.motorista_id) {
    query = query.eq('motorista_id', filters.motorista_id);
  }

  if (filters?.status) {
    query = query.eq('status', filters.status);
  }

  query = query
    .order('periodo_inicio', { ascending: false })
    .range(from, to);

  const { data, count, error } = await query;

  if (error) {
    return { data: null, total: 0, error: error.message };
  }

  const items: FechamentoListItem[] = (data ?? []).map((row) => {
    const mot = singleRelation<{ nome: string }>(row.motorista);
    return {
      id: row.id,
      motorista_nome: mot?.nome ?? 'Desconhecido',
      tipo: row.tipo,
      status: row.status,
      periodo_inicio: row.periodo_inicio,
      periodo_fim: row.periodo_fim,
      total_viagens: row.total_viagens,
      total_gastos: row.total_gastos,
      saldo_motorista: row.saldo_motorista,
      created_at: row.created_at,
    };
  });

  return { data: items, total: count ?? 0, error: null };
}

/**
 * Get a single fechamento with its items (detail view).
 */
export async function getFechamentoDetalhadoRepo(
  client: SupabaseClient,
  fechamentoId: string,
): Promise<{ data: FechamentoDetalhado | null; error: string | null }> {
  const { data: fechamento, error: fetchError } = await client
    .from('fechamento')
    .select(`
      *,
      motorista ( nome )
    `)
    .eq('id', fechamentoId)
    .single();

  if (fetchError || !fechamento) {
    return { data: null, error: 'Fechamento não encontrado' };
  }

  const { data: itens, error: itensError } = await client
    .from('fechamento_item')
    .select('*')
    .eq('fechamento_id', fechamentoId)
    .order('data', { ascending: true });

  if (itensError) {
    return { data: null, error: 'Erro ao buscar itens do fechamento' };
  }

  return {
    data: {
      ...(fechamento as Fechamento),
      itens: (itens ?? []) as FechamentoItem[],
    },
    error: null,
  };
}
