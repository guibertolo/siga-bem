/**
 * Multi-empresa dashboard actions — admin client versions that accept
 * (admin, empresaId) and filter by empresa_id explicitly.
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
  admin: SupabaseClient,
  empresaId: string,
): Promise<DashboardData> {
  return getDashboardDataRepo(admin, [empresaId]);
}

export async function getViagemAtivaForEmpresa(
  admin: SupabaseClient,
  empresaId: string,
): Promise<ViagemAtivaData> {
  return getViagemAtivaRepo(admin, [empresaId]);
}

export async function getDonoMicroDataForEmpresa(
  admin: SupabaseClient,
  empresaId: string,
): Promise<DonoMicroData> {
  return getDonoMicroDataRepo(admin, [empresaId]);
}
