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
