/**
 * Dashboard data fetching — consolidates all summary card queries
 * into a single Promise.all() to eliminate sequential round-trips.
 *
 * Delegates read queries to lib/repositories/dashboard.ts.
 */

import { createClient } from '@/lib/supabase/server';
import { getCurrentUsuario } from '@/lib/auth/get-user-role';
import {
  getDashboardDataRepo,
  getViagemAtivaRepo,
  getDonoMicroDataRepo,
  getMotoristaDataRepo,
} from '@/lib/repositories/dashboard';

// ---------------------------------------------------------------------------
// Re-export types so existing consumers don't need import changes
// ---------------------------------------------------------------------------

export type {
  ViagemAtivaItem,
  ViagemAtivaData,
  ProximaViagemItem,
  MotoristaData,
  DashboardData,
  MotoristaSituacao,
  CaminhaoSituacao,
  MotoristaStatusItem,
  CaminhaoStatusItem,
  DonoMicroData,
} from '@/lib/repositories/dashboard';

// ---------------------------------------------------------------------------
// Data fetching — delegates to repository
// ---------------------------------------------------------------------------

/**
 * Fetch all dashboard summary data in parallel.
 * Consolidates card queries into a single Promise.all().
 */
export async function getDashboardData() {
  const supabase = await createClient();
  // RLS handles empresa filtering for the logged-in user
  // We pass a dummy empresaIds since RLS is active; the repo uses .in()
  // but RLS will further restrict. For single-user context this works fine.
  const usuario = await getCurrentUsuario();
  if (!usuario) {
    return {
      viagens: { count: 0, error: 'Não autenticado' },
      gastos: { total: 0, error: 'Não autenticado' },
      fechamentos: { count: 0, totalCentavos: 0 },
      receitaCusto: { receita: 0, custo: 0 },
    };
  }
  return getDashboardDataRepo(supabase, [usuario.empresa_id!]);
}

/**
 * Fetch viagens em_andamento with full details for the active trip card.
 * Motorista sees only their own trip. Dono/admin sees all (up to 5).
 */
export async function getViagemAtiva() {
  const usuario = await getCurrentUsuario();
  if (!usuario) {
    return { viagens: [], count: 0, error: 'Não autenticado' };
  }

  const supabase = await createClient();
  const motoristaId = usuario.role === 'motorista' && usuario.motorista_id
    ? usuario.motorista_id
    : undefined;

  return getViagemAtivaRepo(supabase, [usuario.empresa_id!], { motoristaId });
}

/**
 * Fetch motoristas and caminhoes status for the Dono micro dashboard.
 * Only accessible by dono/admin roles.
 */
export async function getDonoMicroData() {
  const usuario = await getCurrentUsuario();
  if (!usuario || !['dono', 'admin'].includes(usuario.role)) {
    return { motoristas: [], caminhoes: [] };
  }

  const supabase = await createClient();
  return getDonoMicroDataRepo(supabase, [usuario.empresa_id!]);
}

/**
 * Fetch motorista-specific dashboard data.
 */
export async function getMotoristaData(motoristaId: string) {
  const supabase = await createClient();
  return getMotoristaDataRepo(supabase, motoristaId);
}
