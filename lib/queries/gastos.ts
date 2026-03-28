/**
 * Gastos query module with filtering, pagination, and aggregation.
 * Story 2.3 — Listagem e Filtros de Gastos
 *
 * CRITICAL (CON-003): All monetary values are INTEGER centavos.
 */

import { createClient } from '@/lib/supabase/server';
import type {
  GastoFilters,
  GastoListItemWithFoto,
  GastoListResult,
  GastoSubtotalCategoria,
  GastoFilterOptions,
} from '@/types/gasto';
import type { CategoriaGastoOption } from '@/types/categoria-gasto';

const DEFAULT_PAGE_SIZE = 20;

/**
 * Fetch filtered, paginated gastos with totals and subtotals.
 *
 * RLS via fn_get_motorista_id() already restricts motorista role
 * to their own records — no manual filtering needed.
 */
export async function getGastos(
  filters: GastoFilters,
): Promise<GastoListResult> {
  const supabase = await createClient();

  const pageSize = filters.pageSize || DEFAULT_PAGE_SIZE;
  const page = filters.page || 1;
  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;

  // Build the paginated query with joins
  let query = supabase
    .from('gasto')
    .select(
      `
      id,
      data,
      valor,
      descricao,
      foto_url,
      categoria_gasto ( nome, icone, cor ),
      motorista ( nome ),
      caminhao ( placa )
    `,
      { count: 'exact' },
    )
    .order('data', { ascending: false })
    .order('created_at', { ascending: false });

  // Apply conditional filters — only when values are present
  if (filters.motoristaIds.length > 0) {
    query = query.in('motorista_id', filters.motoristaIds);
  }
  if (filters.caminhaoIds.length > 0) {
    query = query.in('caminhao_id', filters.caminhaoIds);
  }
  if (filters.categoriaIds.length > 0) {
    query = query.in('categoria_id', filters.categoriaIds);
  }
  if (filters.startDate) {
    query = query.gte('data', filters.startDate);
  }
  if (filters.endDate) {
    query = query.lte('data', filters.endDate);
  }

  // Apply pagination range
  query = query.range(from, to);

  const { data, count, error } = await query;

  if (error) {
    throw new Error(`Erro ao buscar gastos: ${error.message}`);
  }

  // Map rows to typed items
  const gastos: GastoListItemWithFoto[] = (data ?? []).map((row) => {
    const cat = row.categoria_gasto as unknown as {
      nome: string;
      icone: string | null;
      cor: string | null;
    } | null;
    const mot = row.motorista as unknown as { nome: string } | null;
    const cam = row.caminhao as unknown as { placa: string } | null;

    return {
      id: row.id,
      data: row.data,
      valor: row.valor,
      descricao: row.descricao,
      foto_url: row.foto_url,
      categoria_nome: cat?.nome ?? 'Sem categoria',
      categoria_icone: cat?.icone ?? null,
      categoria_cor: cat?.cor ?? null,
      motorista_nome: mot?.nome ?? 'Desconhecido',
      caminhao_placa: cam?.placa ?? null,
    };
  });

  // Fetch ALL matching gastos for total value + subtotals (without pagination)
  const { totalValueCentavos, subtotaisByCategoria } =
    await getGastosTotals(filters);

  return {
    gastos,
    totalCount: count ?? 0,
    totalValueCentavos,
    subtotaisByCategoria,
  };
}

/**
 * Fetch totals and subtotals for the filtered set (no pagination).
 * Runs a separate lightweight query for aggregation.
 */
async function getGastosTotals(
  filters: GastoFilters,
): Promise<{
  totalValueCentavos: number;
  subtotaisByCategoria: GastoSubtotalCategoria[];
}> {
  const supabase = await createClient();

  // Fetch valor + categoria data for all matching gastos (no pagination)
  let query = supabase
    .from('gasto')
    .select(
      `
      valor,
      categoria_gasto ( nome, icone, cor )
    `,
    );

  if (filters.motoristaIds.length > 0) {
    query = query.in('motorista_id', filters.motoristaIds);
  }
  if (filters.caminhaoIds.length > 0) {
    query = query.in('caminhao_id', filters.caminhaoIds);
  }
  if (filters.categoriaIds.length > 0) {
    query = query.in('categoria_id', filters.categoriaIds);
  }
  if (filters.startDate) {
    query = query.gte('data', filters.startDate);
  }
  if (filters.endDate) {
    query = query.lte('data', filters.endDate);
  }

  const { data, error } = await query;

  if (error) {
    return { totalValueCentavos: 0, subtotaisByCategoria: [] };
  }

  // Aggregate client-side
  let totalValueCentavos = 0;
  const categoryMap = new Map<
    string,
    {
      categoria_nome: string;
      categoria_icone: string | null;
      categoria_cor: string | null;
      total_centavos: number;
      qtd_gastos: number;
    }
  >();

  for (const row of data ?? []) {
    totalValueCentavos += row.valor;

    const cat = row.categoria_gasto as unknown as {
      nome: string;
      icone: string | null;
      cor: string | null;
    } | null;
    const catName = cat?.nome ?? 'Sem categoria';

    const existing = categoryMap.get(catName);
    if (existing) {
      existing.total_centavos += row.valor;
      existing.qtd_gastos += 1;
    } else {
      categoryMap.set(catName, {
        categoria_nome: catName,
        categoria_icone: cat?.icone ?? null,
        categoria_cor: cat?.cor ?? null,
        total_centavos: row.valor,
        qtd_gastos: 1,
      });
    }
  }

  // Sort by total descending
  const subtotaisByCategoria: GastoSubtotalCategoria[] = Array.from(
    categoryMap.values(),
  ).sort((a, b) => b.total_centavos - a.total_centavos);

  return { totalValueCentavos, subtotaisByCategoria };
}

/**
 * Fetch filter options for the gastos filter form.
 * Motorista role: only their own motorista record returned.
 */
export async function getGastoFilterOptions(
  empresaId: string,
  userRole: string,
  userId: string,
): Promise<GastoFilterOptions> {
  const supabase = await createClient();

  // Fetch motoristas
  let motoristaQuery = supabase
    .from('motorista')
    .select('id, nome')
    .eq('empresa_id', empresaId)
    .eq('status', 'ativo')
    .order('nome');

  if (userRole === 'motorista') {
    motoristaQuery = motoristaQuery.eq('usuario_id', userId);
  }

  // Fetch caminhoes
  const caminhoesQuery = supabase
    .from('caminhao')
    .select('id, placa, modelo')
    .eq('empresa_id', empresaId)
    .eq('ativo', true)
    .order('placa');

  // Fetch categorias (global + empresa)
  const categoriasQuery = supabase
    .from('categoria_gasto')
    .select('id, nome, icone, cor')
    .or(`empresa_id.is.null,empresa_id.eq.${empresaId}`)
    .eq('ativa', true)
    .order('ordem');

  // Execute all three in parallel
  const [motoristaResult, caminhoesResult, categoriasResult] =
    await Promise.all([motoristaQuery, caminhoesQuery, categoriasQuery]);

  return {
    motoristas: (motoristaResult.data ?? []) as Array<{
      id: string;
      nome: string;
    }>,
    caminhoes: (caminhoesResult.data ?? []) as Array<{
      id: string;
      placa: string;
      modelo: string;
    }>,
    categorias: (categoriasResult.data ?? []) as CategoriaGastoOption[],
  };
}
