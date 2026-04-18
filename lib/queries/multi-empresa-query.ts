import type { SupabaseClient } from '@supabase/supabase-js';
import { createClient } from '@/lib/supabase/server';
import { getMultiEmpresaContext } from '@/lib/queries/multi-empresa';

/**
 * Execute a query function across all selected empresas in multi-empresa mode.
 *
 * Uses the authenticated client (session-based, RLS-enabled) to query each
 * empresa. Empresa access is validated server-side via fn_get_query_empresas()
 * RPC, which returns the intersection of selected_empresas with active bindings
 * in usuario_empresa.
 *
 * RLS SELECT policies on viagem, gasto, fechamento, motorista, caminhao allow
 * reading data from ALL empresas the user is bound to (via fn_user_empresa_ids),
 * not just the active one. This enables multi-empresa reads without admin client.
 *
 * SECURITY: Double-validated:
 *   1. getMultiEmpresaContext() validates via getUserEmpresas() (app-side)
 *   2. fn_get_query_empresas() validates via usuario_empresa (SQL-side)
 *   3. RLS policies enforce empresa_id = ANY(fn_user_empresa_ids())
 *
 * @param queryFn - Receives the authenticated client and an empresa_id, returns data
 * @returns Array of results tagged with empresa_id/name
 */
export async function queryMultiEmpresa<T>(
  queryFn: (client: SupabaseClient, empresaId: string) => Promise<T>,
): Promise<Array<{ empresaId: string; empresaName: string; data: T }>> {
  const ctx = await getMultiEmpresaContext();
  const supabase = await createClient();

  if (!ctx.isMultiEmpresa) {
    // Single mode: use authenticated client with active empresa_id
    const empresaId = ctx.activeEmpresaId ?? '';
    if (!empresaId) return [];
    const data = await queryFn(supabase, empresaId);
    return [{
      empresaId,
      empresaName: ctx.empresaNames.get(empresaId) ?? 'Empresa',
      data,
    }];
  }

  // Multi mode: validate empresa IDs server-side via RPC
  const { data: validatedIds, error } = await supabase
    .rpc('fn_get_query_empresas', { selected_empresas: ctx.empresaIds });

  if (error || !validatedIds || !Array.isArray(validatedIds) || validatedIds.length === 0) {
    // Fallback: return empty if no valid empresas (AC: no error, just empty)
    return [];
  }

  const results: Array<{ empresaId: string; empresaName: string; data: T }> = [];

  for (const empresaId of validatedIds as string[]) {
    const data = await queryFn(supabase, empresaId);
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
