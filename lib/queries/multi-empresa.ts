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
 *
 * SECURITY: Antes de retornar, faz uma revalidacao em runtime do vinculo
 * usuario<->empresa contra fn_get_user_empresas() (lista autoritativa de
 * vinculos ATIVOS no momento da query). Isso impede que um vinculo
 * revogado apos o login do usuario continue dando acesso via o cache
 * de selected_empresas na tabela usuario.
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

    // Fetch selected_empresas from usuario (cache potencialmente stale)
    const { data } = await supabase
      .from('usuario')
      .select('selected_empresas')
      .eq('id', usuario.id)
      .single();

    const selectedEmpresasRaw = data?.selected_empresas as string[] | null;

    // Sempre consultar fn_get_user_empresas (lista autoritativa de vinculos
    // ATIVOS) — isso e o guard contra vinculo revogado em runtime. Tambem
    // usamos o resultado para montar o empresaNames, entao o custo e zero
    // quando em multi mode.
    const activeEmpresas = await getUserEmpresas();
    const activeEmpresaIds = new Set(activeEmpresas.map((e) => e.empresa_id));

    // Filtra selected_empresas removendo qualquer empresa sem vinculo ativo.
    const selectedEmpresasFiltered = Array.isArray(selectedEmpresasRaw)
      ? selectedEmpresasRaw.filter((id) => activeEmpresaIds.has(id))
      : null;

    const isMulti =
      Array.isArray(selectedEmpresasFiltered) &&
      selectedEmpresasFiltered.length >= 2;

    // Tambem valida o empresa_id ativo: se o vinculo foi revogado, nao
    // retornamos ele como activeEmpresaId.
    const activeEmpresaId =
      usuario.empresa_id && activeEmpresaIds.has(usuario.empresa_id)
        ? usuario.empresa_id
        : null;

    const empresaIds = isMulti
      ? (selectedEmpresasFiltered as string[])
      : activeEmpresaId
        ? [activeEmpresaId]
        : [];

    // Build name map from user's empresas (sempre, para uso pelo caller)
    const empresaNames = new Map<string, string>();
    for (const e of activeEmpresas) {
      empresaNames.set(e.empresa_id, e.nome_fantasia ?? e.razao_social);
    }

    return {
      isMultiEmpresa: isMulti,
      empresaIds,
      activeEmpresaId,
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
