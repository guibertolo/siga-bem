import type { SupabaseClient } from '@supabase/supabase-js';
import { createAdminClient } from '@/lib/supabase/admin';
import { getMultiEmpresaContext } from '@/lib/queries/multi-empresa';

/**
 * Execute a query function across all selected empresas in multi-empresa mode.
 *
 * Uses the admin client (service_role) to bypass RLS and query each empresa
 * by explicit `empresa_id` filter. This avoids fn_switch_empresa, React.cache
 * issues, and context-switching bugs.
 *
 * SECURITY: Ownership is validated via getMultiEmpresaContext() which reads
 * selected_empresas from the authenticated user's record (already validated
 * at setSelectedEmpresas time via usuario_empresa).
 *
 * @param queryFn - Receives the admin client and an empresa_id, returns data
 * @returns Array of results tagged with empresa_id/name
 */
export async function queryMultiEmpresa<T>(
  queryFn: (admin: SupabaseClient, empresaId: string) => Promise<T>,
): Promise<Array<{ empresaId: string; empresaName: string; data: T }>> {
  const ctx = await getMultiEmpresaContext();

  if (!ctx.isMultiEmpresa) {
    // Single mode: use admin client with active empresa_id
    const empresaId = ctx.activeEmpresaId ?? '';
    if (!empresaId) return [];
    const admin = createAdminClient();
    const data = await queryFn(admin, empresaId);
    return [{
      empresaId,
      empresaName: ctx.empresaNames.get(empresaId) ?? 'Empresa',
      data,
    }];
  }

  const admin = createAdminClient();
  const results: Array<{ empresaId: string; empresaName: string; data: T }> = [];

  for (const empresaId of ctx.empresaIds) {
    const data = await queryFn(admin, empresaId);
    results.push({
      empresaId,
      empresaName: ctx.empresaNames.get(empresaId) ?? 'Empresa',
      data,
    });
  }

  return results;
}

/**
 * Merge numeric values from multi-empresa results by summing them.
 */
export function sumMultiResults<T extends Record<string, number>>(
  results: Array<{ data: T }>,
  keys: (keyof T)[],
): T {
  const merged = {} as T;
  for (const key of keys) {
    (merged as Record<string, number>)[key as string] = results.reduce(
      (sum, r) => sum + ((r.data[key] as number) ?? 0),
      0,
    );
  }
  return merged;
}

/**
 * Flatten array results from multiple empresas, adding empresa_id and empresa_nome fields.
 */
export function flattenMultiResults<T>(
  results: Array<{ empresaId: string; empresaName: string; data: T[] }>,
): Array<T & { empresa_id: string; empresa_nome: string }> {
  const flattened: Array<T & { empresa_id: string; empresa_nome: string }> = [];

  for (const result of results) {
    for (const item of result.data) {
      flattened.push({
        ...item,
        empresa_id: result.empresaId,
        empresa_nome: result.empresaName,
      });
    }
  }

  return flattened;
}
