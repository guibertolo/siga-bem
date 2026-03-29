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
import { getViagensEmAndamento } from '@/app/(dashboard)/viagens/actions';
import { getGastosMesAtual } from '@/app/(dashboard)/gastos/actions';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

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
