/**
 * Dashboard data fetching — consolidates all summary card queries
 * into a single Promise.all() to eliminate sequential round-trips.
 *
 * Performance fix: previously each card (ViagemSummaryCard,
 * GastoSummaryCard, FechamentoSummaryCard) made its own independent
 * server queries (7+ round-trips). Now a single getDashboardData()
 * call fetches everything in parallel (3 concurrent queries).
 */

import { createClient } from '@/lib/supabase/server';
import { getCurrentUsuario } from '@/lib/auth/get-user-role';
import { getViagensEmAndamento } from '@/app/(dashboard)/viagens/actions';
import { getGastosMesAtual } from '@/app/(dashboard)/gastos/actions';

// ---------------------------------------------------------------------------
// Types
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
}

// ---------------------------------------------------------------------------
// Dono Micro — Motoristas & Caminhoes status
// ---------------------------------------------------------------------------

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
// Data fetching
// ---------------------------------------------------------------------------

async function getFechamentosPendentes(): Promise<{
  count: number;
  totalCentavos: number;
}> {
  const supabase = await createClient();

  const [countResult, valueResult] = await Promise.all([
    supabase
      .from('fechamento')
      .select('id', { count: 'exact', head: true })
      .eq('status', 'aberto'),
    supabase
      .from('fechamento')
      .select('saldo_motorista')
      .eq('status', 'aberto'),
  ]);

  const count = countResult.count ?? 0;
  const totalCentavos = (valueResult.data ?? []).reduce(
    (sum: number, f: { saldo_motorista: number }) => sum + f.saldo_motorista,
    0,
  );

  return { count, totalCentavos };
}

/**
 * Fetch all dashboard summary data in parallel.
 * Consolidates 3 card queries into a single Promise.all().
 */
export async function getDashboardData(): Promise<DashboardData> {
  const [viagens, gastos, fechamentos] = await Promise.all([
    getViagensEmAndamento(),
    getGastosMesAtual(),
    getFechamentosPendentes(),
  ]);

  return { viagens, gastos, fechamentos };
}

/**
 * Fetch viagens em_andamento with full details for the active trip card.
 * Motorista sees only their own trip. Dono/admin sees all (up to 5).
 */
export async function getViagemAtiva(): Promise<ViagemAtivaData> {
  const usuario = await getCurrentUsuario();
  if (!usuario) {
    return { viagens: [], count: 0, error: 'Nao autenticado' };
  }

  const supabase = await createClient();

  let query = supabase
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
    .eq('status', 'em_andamento');

  // Motorista sees only their own trips
  if (usuario.role === 'motorista' && usuario.motorista_id) {
    query = query.eq('motorista_id', usuario.motorista_id);
  }

  const { data, count, error } = await query
    .order('data_saida', { ascending: true })
    .limit(5);

  if (error) {
    return { viagens: [], count: 0, error: error.message };
  }

  const items: ViagemAtivaItem[] = (data ?? []).map((row) => {
    const mot = row.motorista as unknown as { nome: string } | null;
    const cam = row.caminhao as unknown as { placa: string; modelo: string } | null;

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
 * Fetch motoristas and caminhoes status for the Dono micro dashboard.
 * Returns each motorista/caminhao with their current situation
 * (em_viagem/livre or rodando/parado) based on active viagens.
 *
 * Only accessible by dono/admin roles.
 */
export async function getDonoMicroData(): Promise<DonoMicroData> {
  const usuario = await getCurrentUsuario();
  if (!usuario || !['dono', 'admin'].includes(usuario.role)) {
    return { motoristas: [], caminhoes: [] };
  }

  const supabase = await createClient();

  // Fetch active viagem motorista_ids and caminhao_ids in one query
  const [motoristasResult, caminhoesResult, viagensAtivas] = await Promise.all([
    supabase
      .from('motorista')
      .select('id, nome')
      .eq('status', 'ativo')
      .order('nome'),
    supabase
      .from('caminhao')
      .select('id, placa, modelo')
      .eq('ativo', true)
      .order('placa'),
    supabase
      .from('viagem')
      .select('motorista_id, caminhao_id')
      .eq('status', 'em_andamento'),
  ]);

  const motoristasEmViagem = new Set(
    (viagensAtivas.data ?? []).map((v) => v.motorista_id),
  );
  const caminhoesRodando = new Set(
    (viagensAtivas.data ?? []).map((v) => v.caminhao_id),
  );

  const motoristas: MotoristaStatusItem[] = (motoristasResult.data ?? []).map(
    (m) => ({
      id: m.id,
      nome: m.nome,
      situacao: motoristasEmViagem.has(m.id) ? 'em_viagem' : 'livre',
    }),
  );

  const caminhoes: CaminhaoStatusItem[] = (caminhoesResult.data ?? []).map(
    (c) => ({
      id: c.id,
      placa: c.placa,
      modelo: c.modelo,
      situacao: caminhoesRodando.has(c.id) ? 'rodando' : 'parado',
    }),
  );

  return { motoristas, caminhoes };
}

// ---------------------------------------------------------------------------
// Motorista Dashboard — Earnings, Completed Trips, Next Trip
// ---------------------------------------------------------------------------

/**
 * Fetch motorista-specific dashboard data: monthly earnings, completed trip
 * count, and next planned trip. Executes 3 queries in parallel.
 *
 * Story S-DASH-1 — Motorista dashboard differentiation.
 *
 * @param motoristaId - The motorista's UUID (from usuario.motorista_id)
 */
export async function getMotoristaData(motoristaId: string): Promise<MotoristaData> {
  const supabase = await createClient();

  // First day of current month in ISO format
  const now = new Date();
  const firstDayOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();

  const [earningsResult, countResult, nextTripResult] = await Promise.all([
    // 1. Sum of (valor_total * percentual_pagamento / 100) for completed trips this month
    supabase
      .from('viagem')
      .select('valor_total, percentual_pagamento')
      .eq('motorista_id', motoristaId)
      .eq('status', 'concluida')
      .gte('data_chegada_real', firstDayOfMonth),

    // 2. Count of completed trips this month
    supabase
      .from('viagem')
      .select('id', { count: 'exact', head: true })
      .eq('motorista_id', motoristaId)
      .eq('status', 'concluida')
      .gte('data_chegada_real', firstDayOfMonth),

    // 3. Next planned trip (first by data_saida ascending)
    supabase
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

  // Calculate earnings: SUM(ROUND(valor_total * percentual_pagamento / 100))
  const ganhosMes = (earningsResult.data ?? []).reduce(
    (sum: number, v: { valor_total: number; percentual_pagamento: number }) =>
      sum + Math.round(v.valor_total * v.percentual_pagamento / 100),
    0,
  );

  const viagensConcludasMes = countResult.count ?? 0;

  let proximaViagem: ProximaViagemItem | null = null;
  if (nextTripResult.data) {
    const row = nextTripResult.data;
    const cam = row.caminhao as unknown as { placa: string } | null;
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
