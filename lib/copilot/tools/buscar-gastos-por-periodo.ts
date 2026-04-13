/**
 * Assistente FrotaViva — Tool T1: buscar_gastos_por_periodo.
 *
 * Story 9.2 (AC-3). Reads from `gasto` + `categoria_gasto` and returns
 * aggregated results for the LLM to format. Monetary values are always
 * INTEGER centavos (CON-9). All filtering respects the current user's
 * RLS context plus a belt-and-suspenders `empresa_id IN (...)` clause.
 */

import { z } from 'zod';

import { parsePeriod } from '@/lib/copilot/utils/period';
import { MAX_TOOL_ROWS, ToolExecutionError } from '@/lib/copilot/tools/constants';
import type { ToolContext } from '@/lib/copilot/tools/constants';

export const buscarGastosPorPeriodoSchema = z.object({
  periodo: z
    .string()
    .min(1)
    .describe(
      'Expressao em portugues: "este mes", "mes passado", "ultima semana", "marco", "ultimos 30 dias", etc.',
    ),
  categoria: z
    .string()
    .optional()
    .describe(
      'Nome da categoria de gasto (ex: "Combustivel", "Manutencao", "Pedagio"). Case-insensitive.',
    ),
  caminhao_id: z.string().uuid().optional(),
  motorista_id: z.string().uuid().optional(),
});

export type BuscarGastosInput = z.infer<typeof buscarGastosPorPeriodoSchema>;

interface GastoRow {
  id: string;
  data: string;
  valor: number;
  descricao: string | null;
  categoria_id: string | null;
  caminhao: { placa: string | null } | null;
  motorista: { nome: string | null } | null;
}

interface CategoriaRow {
  id: string;
  nome: string;
}

export interface BuscarGastosResult {
  periodo: { start: string; end: string; label: string };
  total_centavos: number;
  qtd_gastos: number;
  subtotais_por_categoria: Array<{
    categoria: string;
    total_centavos: number;
    qtd_gastos: number;
  }>;
  gastos: Array<{
    id: string;
    data: string;
    valor_centavos: number;
    descricao: string | null;
    categoria: string;
    caminhao_placa: string | null;
    motorista_nome: string | null;
  }>;
  limite_aplicado: boolean;
}

/**
 * Execute the T1 tool against the RLS-aware Supabase client in ctx.
 *
 * Returns up to MAX_TOOL_ROWS detailed gasto rows plus full aggregates
 * over the matched set. The detail rows are capped so the LLM prompt
 * stays manageable; the aggregates reflect the entire filtered dataset
 * so answers like "quanto gastei de combustivel em marco" remain
 * accurate even when there are more than 50 rows.
 */
export async function executeBuscarGastosPorPeriodo(
  input: BuscarGastosInput,
  ctx: ToolContext,
): Promise<BuscarGastosResult> {
  try {
    const period = parsePeriod(input.periodo);
    const { supabase, empresaIds } = ctx;

    if (empresaIds.length === 0) {
      return {
        periodo: {
          start: period.startDate,
          end: period.endDate,
          label: period.label,
        },
        total_centavos: 0,
        qtd_gastos: 0,
        subtotais_por_categoria: [],
        gastos: [],
        limite_aplicado: false,
      };
    }

    // Step 1: resolve categoria name -> id (if filter provided)
    let categoriaIdFilter: string | null = null;
    const { data: allCategorias, error: catError } = await supabase
      .from('categoria_gasto')
      .select('id, nome')
      .order('nome');

    if (catError) {
      throw new ToolExecutionError(
        'buscar_gastos_por_periodo',
        `Falha ao carregar categorias: ${catError.message}`,
        { empresaIds },
      );
    }

    const categoriaLookup = new Map<string, string>();
    for (const cat of (allCategorias ?? []) as CategoriaRow[]) {
      categoriaLookup.set(cat.id, cat.nome);
    }

    if (input.categoria) {
      const needle = input.categoria.toLocaleLowerCase('pt-BR');
      const match = (allCategorias ?? []).find(
        (c) => (c as CategoriaRow).nome.toLocaleLowerCase('pt-BR') === needle,
      ) as CategoriaRow | undefined;
      if (match) {
        categoriaIdFilter = match.id;
      }
    }

    // Step 2: aggregate totals over the full filtered set (no detail join)
    let aggQuery = supabase
      .from('gasto')
      .select('valor, categoria_id', { count: 'exact' })
      .in('empresa_id', empresaIds)
      .gte('data', period.startDate)
      .lte('data', period.endDate);

    if (categoriaIdFilter) {
      aggQuery = aggQuery.eq('categoria_id', categoriaIdFilter);
    }
    if (input.caminhao_id) {
      aggQuery = aggQuery.eq('caminhao_id', input.caminhao_id);
    }
    if (input.motorista_id) {
      aggQuery = aggQuery.eq('motorista_id', input.motorista_id);
    }

    const aggResult = await aggQuery;
    if (aggResult.error) {
      throw new ToolExecutionError(
        'buscar_gastos_por_periodo',
        `Falha ao agregar gastos: ${aggResult.error.message}`,
        { period, empresaIds },
      );
    }

    let totalCentavos = 0;
    const byCategoria = new Map<
      string,
      { total_centavos: number; qtd_gastos: number }
    >();
    for (const row of aggResult.data ?? []) {
      const valor = (row as { valor: number }).valor;
      const catId = (row as { categoria_id: string | null }).categoria_id;
      totalCentavos += valor;
      const catName = catId
        ? (categoriaLookup.get(catId) ?? 'Sem categoria')
        : 'Sem categoria';
      const existing = byCategoria.get(catName);
      if (existing) {
        existing.total_centavos += valor;
        existing.qtd_gastos += 1;
      } else {
        byCategoria.set(catName, { total_centavos: valor, qtd_gastos: 1 });
      }
    }

    const subtotais = Array.from(byCategoria.entries())
      .map(([categoria, v]) => ({
        categoria,
        total_centavos: v.total_centavos,
        qtd_gastos: v.qtd_gastos,
      }))
      .sort((a, b) => b.total_centavos - a.total_centavos);

    const qtdTotal = aggResult.count ?? aggResult.data?.length ?? 0;

    // Step 3: fetch detail rows (capped by MAX_TOOL_ROWS)
    let detailQuery = supabase
      .from('gasto')
      .select(
        'id, data, valor, descricao, categoria_id, caminhao:caminhao_id ( placa ), motorista:motorista_id ( nome )',
      )
      .in('empresa_id', empresaIds)
      .gte('data', period.startDate)
      .lte('data', period.endDate)
      .order('data', { ascending: false })
      .order('created_at', { ascending: false })
      .limit(MAX_TOOL_ROWS);

    if (categoriaIdFilter) {
      detailQuery = detailQuery.eq('categoria_id', categoriaIdFilter);
    }
    if (input.caminhao_id) {
      detailQuery = detailQuery.eq('caminhao_id', input.caminhao_id);
    }
    if (input.motorista_id) {
      detailQuery = detailQuery.eq('motorista_id', input.motorista_id);
    }

    const detailResult = await detailQuery;
    if (detailResult.error) {
      throw new ToolExecutionError(
        'buscar_gastos_por_periodo',
        `Falha ao buscar detalhes de gastos: ${detailResult.error.message}`,
        { period, empresaIds },
      );
    }

    const rows = (detailResult.data ?? []) as unknown as GastoRow[];
    const gastos = rows.map((row) => ({
      id: row.id,
      data: row.data,
      valor_centavos: row.valor,
      descricao: row.descricao,
      categoria: row.categoria_id
        ? (categoriaLookup.get(row.categoria_id) ?? 'Sem categoria')
        : 'Sem categoria',
      caminhao_placa: row.caminhao?.placa ?? null,
      motorista_nome: row.motorista?.nome ?? null,
    }));

    return {
      periodo: {
        start: period.startDate,
        end: period.endDate,
        label: period.label,
      },
      total_centavos: totalCentavos,
      qtd_gastos: qtdTotal,
      subtotais_por_categoria: subtotais,
      gastos,
      limite_aplicado: qtdTotal > MAX_TOOL_ROWS,
    };
  } catch (error) {
    if (error instanceof ToolExecutionError) {
      throw error;
    }
    throw new ToolExecutionError(
      'buscar_gastos_por_periodo',
      `Erro inesperado: ${error instanceof Error ? error.message : 'desconhecido'}`,
      { input },
    );
  }
}
