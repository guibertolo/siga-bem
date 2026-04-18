/**
 * Multi-empresa dashboard queries — accept (client, empresaId) and filter
 * by empresa_id explicitly. Works with both authenticated and admin clients.
 *
 * Delegates read queries to lib/repositories/dashboard.ts.
 */

import type { SupabaseClient } from '@supabase/supabase-js';
import {
  getDashboardDataRepo,
  getViagemAtivaRepo,
  getDonoMicroDataRepo,
} from '@/lib/repositories/dashboard';
import type {
  DashboardData,
  DonoMicroData,
  ViagemAtivaData,
  ViagemAtivaItem,
  MotoristaStatusItem,
  CaminhaoStatusItem,
} from '@/lib/repositories/dashboard';

// Re-export types for consumers that import from this file
export type {
  DashboardData,
  DonoMicroData,
  ViagemAtivaData,
  ViagemAtivaItem,
  MotoristaStatusItem,
  CaminhaoStatusItem,
};

export async function getDashboardDataForEmpresa(
  client: SupabaseClient,
  empresaId: string,
): Promise<DashboardData> {
  return getDashboardDataRepo(client, [empresaId]);
}

export async function getViagemAtivaForEmpresa(
  client: SupabaseClient,
  empresaId: string,
): Promise<ViagemAtivaData> {
  return getViagemAtivaRepo(client, [empresaId]);
}

export async function getDonoMicroDataForEmpresa(
  client: SupabaseClient,
  empresaId: string,
): Promise<DonoMicroData> {
  return getDonoMicroDataRepo(client, [empresaId]);
}
