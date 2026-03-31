import { cache } from 'react';
import { createClient } from '@/lib/supabase/server';
import { getCurrentUsuario } from '@/lib/auth/get-user-role';
import { getUserEmpresas } from '@/lib/queries/empresas';

export interface MultiEmpresaContext {
  /** Whether multi-empresa mode is active */
  isMultiEmpresa: boolean;
  /** IDs to query — either selected_empresas or [active empresa_id] */
  empresaIds: string[];
  /** The active (single) empresa ID for write operations */
  activeEmpresaId: string | null;
  /** Map of empresa_id -> display name for UI labels */
  empresaNames: Map<string, string>;
}

/**
 * Server-side helper to determine which empresa IDs to query.
 * Returns selected_empresas if set (multi mode), otherwise [active empresa_id].
 *
 * Cached per-request via React.cache() to avoid duplicate DB calls.
 */
export const getMultiEmpresaContext = cache(
  async (): Promise<MultiEmpresaContext> => {
    const usuario = await getCurrentUsuario();
    if (!usuario) {
      return {
        isMultiEmpresa: false,
        empresaIds: [],
        activeEmpresaId: null,
        empresaNames: new Map(),
      };
    }

    const supabase = await createClient();

    // Fetch selected_empresas from usuario
    const { data } = await supabase
      .from('usuario')
      .select('selected_empresas')
      .eq('id', usuario.id)
      .single();

    const selectedEmpresas = data?.selected_empresas as string[] | null;
    const isMulti = Array.isArray(selectedEmpresas) && selectedEmpresas.length >= 2;

    const empresaIds = isMulti
      ? selectedEmpresas
      : usuario.empresa_id
        ? [usuario.empresa_id]
        : [];

    // Build name map from user's empresas
    const empresaNames = new Map<string, string>();
    if (isMulti) {
      const allEmpresas = await getUserEmpresas();
      for (const e of allEmpresas) {
        empresaNames.set(
          e.empresa_id,
          e.nome_fantasia ?? e.razao_social,
        );
      }
    }

    return {
      isMultiEmpresa: isMulti,
      empresaIds,
      activeEmpresaId: usuario.empresa_id,
      empresaNames,
    };
  },
);

/**
 * Simple helper: get the empresa IDs for queries.
 * Returns selected_empresas if set, otherwise [active empresa_id].
 */
export async function getQueryEmpresas(): Promise<string[]> {
  const ctx = await getMultiEmpresaContext();
  return ctx.empresaIds;
}

/**
 * Helper to get empresa display name by ID when in multi-empresa mode.
 */
export async function getEmpresaDisplayName(
  empresaId: string,
): Promise<string> {
  const ctx = await getMultiEmpresaContext();
  return ctx.empresaNames.get(empresaId) ?? 'Empresa';
}
