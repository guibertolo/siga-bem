/**
 * Multi-empresa BI actions — admin client versions that accept
 * (admin, empresaId) and filter by empresa_id explicitly.
 *
 * Delegates read queries to lib/repositories/bi.ts.
 */

import type { SupabaseClient } from '@supabase/supabase-js';
import type {
  BIFiltros,
  BIKpis,
  BICategoriaItem,
  BIRankingCaminhaoItem,
  BIEficienciaItem,
  BIEficienciaMotoristaItem,
  BIManutencaoTruckItem,
  BITendenciaMensalItem,
  BIFilterOptions,
  BIMargemMotoristaItem,
  BIAlerta,
} from '@/types/bi';
import {
  getBIFilterOptionsRepo,
  getBIKpisRepo,
  getBIMargemMotoristasRepo,
  getBICategoriasBreakdownRepo,
  getBIRankingCaminhoesRepo,
  getBIEficienciaCombustivelRepo,
  getBIEficienciaMotoristasRepo,
  getBITendenciaMensalRepo,
  getBIManutencoesRepo,
  getBIAlertasRepo,
} from '@/lib/repositories/bi';

export async function getBIFilterOptionsForEmpresa(
  admin: SupabaseClient,
  empresaId: string,
): Promise<{ data: BIFilterOptions | null; error: string | null }> {
  return getBIFilterOptionsRepo(admin, [empresaId]);
}

export async function getBIKpisForEmpresa(
  admin: SupabaseClient,
  empresaId: string,
  filtros: BIFiltros,
): Promise<{ data: BIKpis | null; error: string | null }> {
  return getBIKpisRepo(admin, [empresaId], filtros);
}

export async function getBIMargemMotoristasForEmpresa(
  admin: SupabaseClient,
  empresaId: string,
  filtros: BIFiltros,
): Promise<{ data: BIMargemMotoristaItem[] | null; error: string | null }> {
  return getBIMargemMotoristasRepo(admin, [empresaId], filtros);
}

export async function getBICategoriasBreakdownForEmpresa(
  admin: SupabaseClient,
  empresaId: string,
  filtros: BIFiltros,
): Promise<{ data: BICategoriaItem[] | null; error: string | null }> {
  return getBICategoriasBreakdownRepo(admin, [empresaId], filtros);
}

export async function getBIRankingCaminhoesForEmpresa(
  admin: SupabaseClient,
  empresaId: string,
  filtros: BIFiltros,
): Promise<{ data: BIRankingCaminhaoItem[] | null; error: string | null }> {
  return getBIRankingCaminhoesRepo(admin, [empresaId], filtros);
}

export async function getBIEficienciaMotoristasForEmpresa(
  admin: SupabaseClient,
  empresaId: string,
  filtros: BIFiltros,
): Promise<{ data: BIEficienciaMotoristaItem[] | null; error: string | null }> {
  return getBIEficienciaMotoristasRepo(admin, [empresaId], filtros);
}

export async function getBITendenciaMensalForEmpresa(
  admin: SupabaseClient,
  empresaId: string,
  filtros: BIFiltros,
): Promise<{ data: BITendenciaMensalItem[] | null; error: string | null }> {
  return getBITendenciaMensalRepo(admin, [empresaId], filtros);
}

export async function getBIEficienciaCombustivelForEmpresa(
  admin: SupabaseClient,
  empresaId: string,
  filtros: BIFiltros,
): Promise<{ data: BIEficienciaItem[] | null; error: string | null }> {
  return getBIEficienciaCombustivelRepo(admin, [empresaId], filtros);
}

export async function getBIManutencoesForEmpresa(
  admin: SupabaseClient,
  empresaId: string,
  filtros: BIFiltros,
): Promise<{ data: BIManutencaoTruckItem[] | null; error: string | null }> {
  return getBIManutencoesRepo(admin, [empresaId], filtros);
}

export async function getBIAlertasForEmpresa(
  admin: SupabaseClient,
  empresaId: string,
  filtros: BIFiltros,
): Promise<{ data: BIAlerta[] | null; verificados?: BIAlerta[]; error: string | null }> {
  return getBIAlertasRepo(admin, [empresaId], filtros);
}
