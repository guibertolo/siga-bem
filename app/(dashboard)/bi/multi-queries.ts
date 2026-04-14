/**
 * Multi-empresa BI queries — accept (client, empresaId) and filter
 * by empresa_id explicitly. Works with both authenticated and admin clients.
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
  client: SupabaseClient,
  empresaId: string,
): Promise<{ data: BIFilterOptions | null; error: string | null }> {
  return getBIFilterOptionsRepo(client, [empresaId]);
}

export async function getBIKpisForEmpresa(
  client: SupabaseClient,
  empresaId: string,
  filtros: BIFiltros,
): Promise<{ data: BIKpis | null; error: string | null }> {
  return getBIKpisRepo(client, [empresaId], filtros);
}

export async function getBIMargemMotoristasForEmpresa(
  client: SupabaseClient,
  empresaId: string,
  filtros: BIFiltros,
): Promise<{ data: BIMargemMotoristaItem[] | null; error: string | null }> {
  return getBIMargemMotoristasRepo(client, [empresaId], filtros);
}

export async function getBICategoriasBreakdownForEmpresa(
  client: SupabaseClient,
  empresaId: string,
  filtros: BIFiltros,
): Promise<{ data: BICategoriaItem[] | null; error: string | null }> {
  return getBICategoriasBreakdownRepo(client, [empresaId], filtros);
}

export async function getBIRankingCaminhoesForEmpresa(
  client: SupabaseClient,
  empresaId: string,
  filtros: BIFiltros,
): Promise<{ data: BIRankingCaminhaoItem[] | null; error: string | null }> {
  return getBIRankingCaminhoesRepo(client, [empresaId], filtros);
}

export async function getBIEficienciaMotoristasForEmpresa(
  client: SupabaseClient,
  empresaId: string,
  filtros: BIFiltros,
): Promise<{ data: BIEficienciaMotoristaItem[] | null; error: string | null }> {
  return getBIEficienciaMotoristasRepo(client, [empresaId], filtros);
}

export async function getBITendenciaMensalForEmpresa(
  client: SupabaseClient,
  empresaId: string,
  filtros: BIFiltros,
): Promise<{ data: BITendenciaMensalItem[] | null; error: string | null }> {
  return getBITendenciaMensalRepo(client, [empresaId], filtros);
}

export async function getBIEficienciaCombustivelForEmpresa(
  client: SupabaseClient,
  empresaId: string,
  filtros: BIFiltros,
): Promise<{ data: BIEficienciaItem[] | null; error: string | null }> {
  return getBIEficienciaCombustivelRepo(client, [empresaId], filtros);
}

export async function getBIManutencoesForEmpresa(
  client: SupabaseClient,
  empresaId: string,
  filtros: BIFiltros,
): Promise<{ data: BIManutencaoTruckItem[] | null; error: string | null }> {
  return getBIManutencoesRepo(client, [empresaId], filtros);
}

export async function getBIAlertasForEmpresa(
  client: SupabaseClient,
  empresaId: string,
  filtros: BIFiltros,
): Promise<{ data: BIAlerta[] | null; verificados?: BIAlerta[]; error: string | null }> {
  return getBIAlertasRepo(client, [empresaId], filtros);
}
