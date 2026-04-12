/**
 * Dashboard repository — unified read queries for dashboard data.
 *
 * Accepts a SupabaseClient and empresaIds[] so the same logic serves
 * both single-empresa (RLS) and multi-empresa (admin bypass) callers.
 */

import type { SupabaseClient } from '@supabase/supabase-js';
import { singleRelation } from '@/lib/utils/supabase-types';

// ---------------------------------------------------------------------------
// Types (re-exported so consumers keep importing from actions.ts)
// ---------------------------------------------------------------------------

export interface ViagemAtivaItem {
  id: string;
  origem: string;
  destino: string;
  status: string;
  data_saida: string;
  valor_total: number;
  motorista_nome: string;
  caminhao_placa: string;
  caminhao_modelo: string;
  empresa_nome?: string;
}

export interface ViagemAtivaData {
  viagens: ViagemAtivaItem[];
  count: number;
  error: string | null;
}

export interface ProximaViagemItem {
  id: string;
  origem: string;
  destino: string;
  data_saida: string;
  valor_total: number; // centavos
  caminhao_placa: string;
}

export interface MotoristaData {
  ganhosMes: number;           // centavos
  viagensConcludasMes: number;
  proximaViagem: ProximaViagemItem | null;
}

export interface DashboardData {
  viagens: {
    count: number;
    error: string | null;
  };
  gastos: {
    total: number; // centavos
    error: string | null;
  };
  fechamentos: {
    count: number;
    totalCentavos: number;
  };
  receitaCusto: {
    receita: number; // centavos
    custo: number;   // centavos
  };
}

export type MotoristaSituacao = 'em_viagem' | 'livre';
export type CaminhaoSituacao = 'rodando' | 'parado';

export interface MotoristaStatusItem {
  id: string;
  nome: string;
  situacao: MotoristaSituacao;
}

export interface CaminhaoStatusItem {
  id: string;
  placa: string;
  modelo: string;
  situacao: CaminhaoSituacao;
}

export interface DonoMicroData {
  motoristas: MotoristaStatusItem[];
  caminhoes: CaminhaoStatusItem[];
}

// ---------------------------------------------------------------------------
// Repository functions
// ---------------------------------------------------------------------------

/**
 * Fetch viagens em_andamento count for given empresas.
 */
export async function getViagensEmAndamentoRepo(
  client: SupabaseClient,
  empresaIds: string[],
): Promise<{ count: number; error: string | null }> {
  const { count, error } = await client
    .from('viagem')
    .select('id', { count: 'exact', head: true })
    .in('empresa_id', empresaIds)
    .eq('status', 'em_andamento');

  if (error) {
    return { count: 0, error: error.message };
  }

  return { count: count ?? 0, error: null };
}

/**
 * Fetch gastos total for current month for given empresas.
 */
export async function getGastosMesAtualRepo(
  client: SupabaseClient,
  empresaIds: string[],
): Promise<{ total: number; error: string | null }> {
  const now = new Date();
  const primeiroDiaMes = new Date(now.getFullYear(), now.getMonth(), 1)
    .toISOString()
    .split('T')[0];

  const { data, error } = await client
    .from('gasto')
    .select('valor')
    .in('empresa_id', empresaIds)
    .gte('data', primeiroDiaMes);

  if (error) {
    return { total: 0, error: error.message };
  }

  const total = (data ?? []).reduce((sum, g) => sum + g.valor, 0);
  return { total, error: null };
}

/**
 * Fetch fechamentos pendentes (viagens concluidas without acerto).
 */
export async function getFechamentosPendentesRepo(
  client: SupabaseClient,
  empresaIds: string[],
): Promise<{ count: number; totalCentavos: number }> {
  const { data: viagens } = await client
    .from('viagem')
    .select('id, valor_total, percentual_pagamento')
    .in('empresa_id', empresaIds)
    .eq('status', 'concluida');

  if (!viagens || viagens.length === 0) {
    return { count: 0, totalCentavos: 0 };
  }

  const viagemIds = viagens.map((v: { id: string }) => v.id);
  const { data: itens } = await client
    .from('fechamento_item')
    .select('referencia_id')
    .eq('tipo', 'viagem')
    .in('referencia_id', viagemIds);

  const idsComAcerto = new Set((itens ?? []).map((i: { referencia_id: string }) => i.referencia_id));
  const pendentes = viagens.filter((v: { id: string }) => !idsComAcerto.has(v.id));

  const totalCentavos = pendentes.reduce(
    (sum: number, v: { valor_total: number; percentual_pagamento: number }) =>
      sum + Math.round((v.valor_total * v.percentual_pagamento) / 100),
    0,
  );

  return { count: pendentes.length, totalCentavos };
}

/**
 * Fetch receita (viagens concluidas) and custo (gastos) for current month.
 */
export async function getReceitaCustoMesRepo(
  client: SupabaseClient,
  empresaIds: string[],
): Promise<{ receita: number; custo: number }> {
  const now = new Date();
  const inicioMes = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
  const primeiroDiaMes = inicioMes.split('T')[0];

  const [viagensResult, gastosResult] = await Promise.all([
    client
      .from('viagem')
      .select('valor_total')
      .in('empresa_id', empresaIds)
      .eq('status', 'concluida')
      .gte('data_saida', inicioMes),
    client
      .from('gasto')
      .select('valor')
      .in('empresa_id', empresaIds)
      .gte('data', primeiroDiaMes),
  ]);

  const receita = (viagensResult.data ?? []).reduce(
    (sum: number, v: { valor_total: number }) => sum + v.valor_total, 0,
  );
  const custo = (gastosResult.data ?? []).reduce(
    (sum: number, g: { valor: number }) => sum + g.valor, 0,
  );

  return { receita, custo };
}

/**
 * Fetch full dashboard summary data in parallel.
 */
export async function getDashboardDataRepo(
  client: SupabaseClient,
  empresaIds: string[],
): Promise<DashboardData> {
  const [viagens, gastos, fechamentos, receitaCusto] = await Promise.all([
    getViagensEmAndamentoRepo(client, empresaIds),
    getGastosMesAtualRepo(client, empresaIds),
    getFechamentosPendentesRepo(client, empresaIds),
    getReceitaCustoMesRepo(client, empresaIds),
  ]);

  return { viagens, gastos, fechamentos, receitaCusto };
}

/**
 * Fetch viagens em_andamento with full details.
 */
export async function getViagemAtivaRepo(
  client: SupabaseClient,
  empresaIds: string[],
  options?: { motoristaId?: string },
): Promise<ViagemAtivaData> {
  let query = client
    .from('viagem')
    .select(`
      id,
      origem,
      destino,
      status,
      data_saida,
      valor_total,
      motorista ( nome ),
      caminhao ( placa, modelo )
    `, { count: 'exact' })
    .in('empresa_id', empresaIds)
    .eq('status', 'em_andamento');

  if (options?.motoristaId) {
    query = query.eq('motorista_id', options.motoristaId);
  }

  const { data, count, error } = await query
    .order('data_saida', { ascending: true })
    .limit(5);

  if (error) {
    return { viagens: [], count: 0, error: error.message };
  }

  const items: ViagemAtivaItem[] = (data ?? []).map((row) => {
    const mot = singleRelation<{ nome: string }>(row.motorista);
    const cam = singleRelation<{ placa: string; modelo: string }>(row.caminhao);
    return {
      id: row.id,
      origem: row.origem,
      destino: row.destino,
      status: row.status,
      data_saida: row.data_saida,
      valor_total: row.valor_total,
      motorista_nome: mot?.nome ?? 'Desconhecido',
      caminhao_placa: cam?.placa ?? '-',
      caminhao_modelo: cam?.modelo ?? '-',
    };
  });

  return { viagens: items, count: count ?? 0, error: null };
}

/**
 * Fetch motoristas and caminhoes status for Dono micro dashboard.
 */
export async function getDonoMicroDataRepo(
  client: SupabaseClient,
  empresaIds: string[],
): Promise<DonoMicroData> {
  const [motoristasResult, caminhoesResult, viagensAtivas] = await Promise.all([
    client
      .from('motorista')
      .select('id, nome')
      .in('empresa_id', empresaIds)
      .eq('status', 'ativo')
      .order('nome'),
    client
      .from('caminhao')
      .select('id, placa, modelo')
      .in('empresa_id', empresaIds)
      .eq('ativo', true)
      .order('placa'),
    client
      .from('viagem')
      .select('motorista_id, caminhao_id')
      .in('empresa_id', empresaIds)
      .eq('status', 'em_andamento'),
  ]);

  const motoristasEmViagem = new Set(
    (viagensAtivas.data ?? []).map((v) => v.motorista_id),
  );
  const caminhoesRodando = new Set(
    (viagensAtivas.data ?? []).map((v) => v.caminhao_id),
  );

  const motoristas: MotoristaStatusItem[] = (motoristasResult.data ?? []).map((m) => ({
    id: m.id,
    nome: m.nome,
    situacao: motoristasEmViagem.has(m.id) ? 'em_viagem' : 'livre',
  }));

  const caminhoes: CaminhaoStatusItem[] = (caminhoesResult.data ?? []).map((c) => ({
    id: c.id,
    placa: c.placa,
    modelo: c.modelo,
    situacao: caminhoesRodando.has(c.id) ? 'rodando' : 'parado',
  }));

  return { motoristas, caminhoes };
}

/**
 * Fetch motorista-specific dashboard data.
 */
export async function getMotoristaDataRepo(
  client: SupabaseClient,
  motoristaId: string,
): Promise<MotoristaData> {
  const now = new Date();
  const firstDayOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();

  const [earningsResult, countResult, nextTripResult] = await Promise.all([
    client
      .from('viagem')
      .select('valor_total, percentual_pagamento')
      .eq('motorista_id', motoristaId)
      .eq('status', 'concluida')
      .gte('data_chegada_real', firstDayOfMonth),
    client
      .from('viagem')
      .select('id', { count: 'exact', head: true })
      .eq('motorista_id', motoristaId)
      .eq('status', 'concluida')
      .gte('data_chegada_real', firstDayOfMonth),
    client
      .from('viagem')
      .select(`
        id,
        origem,
        destino,
        data_saida,
        valor_total,
        caminhao ( placa )
      `)
      .eq('motorista_id', motoristaId)
      .eq('status', 'planejada')
      .order('data_saida', { ascending: true })
      .limit(1)
      .maybeSingle(),
  ]);

  const ganhosMes = (earningsResult.data ?? []).reduce(
    (sum: number, v: { valor_total: number; percentual_pagamento: number }) =>
      sum + Math.round(v.valor_total * v.percentual_pagamento / 100),
    0,
  );

  const viagensConcludasMes = countResult.count ?? 0;

  let proximaViagem: ProximaViagemItem | null = null;
  if (nextTripResult.data) {
    const row = nextTripResult.data;
    const cam = singleRelation<{ placa: string }>(row.caminhao);
    proximaViagem = {
      id: row.id,
      origem: row.origem,
      destino: row.destino,
      data_saida: row.data_saida,
      valor_total: row.valor_total,
      caminhao_placa: cam?.placa ?? '-',
    };
  }

  return { ganhosMes, viagensConcludasMes, proximaViagem };
}
