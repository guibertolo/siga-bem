/**
 * Assistente FrotaViva — Tool T5: resumo_desempenho_periodo.
 *
 * Story 9.4 (AC-2). Aggregates viagens + gastos into a single summary
 * object for a given period. Canceled viagens are excluded.
 *
 * RLS enforced via createClient() SSR + belt-and-suspenders empresaIds.
 * Monetary values in INTEGER centavos (CON-9).
 */

import { z } from 'zod';

import { parsePeriod } from '@/lib/copilot/utils/period';
import { ToolExecutionError } from '@/lib/copilot/tools/constants';
import type { ToolContext } from '@/lib/copilot/tools/constants';

export const resumoDesempenhoPeriodoSchema = z.object({
  periodo: z
    .string()
    .min(1)
    .describe(
      'Expressao em portugues: "este mes", "mes passado", "ultimos 30 dias", etc.',
    ),
});

export type ResumoDesempenhoPeriodoInput = z.infer<typeof resumoDesempenhoPeriodoSchema>;

export interface ResumoDesempenhoPeriodoResult {
  periodo: { start: string; end: string; label: string };
  qtd_viagens: number;
  receita_total_centavos: number;
  gasto_total_centavos: number;
  lucro_centavos: number;
  top_3_categorias: Array<{ nome: string; total_centavos: number }>;
  melhor_viagem: {
    id: string;
    origem: string;
    destino: string;
    margem_percentual: number;
  } | null;
  pior_viagem: {
    id: string;
    origem: string;
    destino: string;
    margem_percentual: number;
  } | null;
}

interface ViagemRow {
  id: string;
  origem: string;
  destino: string;
  valor_total: number;
  status: string;
}

interface GastoRow {
  valor: number;
  categoria_id: string | null;
}

interface CategoriaRow {
  id: string;
  nome: string;
}

function computeMargem(frete: number, custo: number): number {
  if (frete === 0) return 0;
  return Math.round(((frete - custo) / frete) * 10000) / 100;
}

export async function executeResumoDesempenhoPeriodo(
  input: ResumoDesempenhoPeriodoInput,
  ctx: ToolContext,
): Promise<ResumoDesempenhoPeriodoResult> {
  try {
    const period = parsePeriod(input.periodo);
    const { supabase, empresaIds } = ctx;

    const emptyResult: ResumoDesempenhoPeriodoResult = {
      periodo: { start: period.startDate, end: period.endDate, label: period.label },
      qtd_viagens: 0,
      receita_total_centavos: 0,
      gasto_total_centavos: 0,
      lucro_centavos: 0,
      top_3_categorias: [],
      melhor_viagem: null,
      pior_viagem: null,
    };

    if (empresaIds.length === 0) {
      return emptyResult;
    }

    // Parallel fetch: viagens, gastos, categorias
    const viagensPromise = supabase
      .from('viagem')
      .select('id, origem, destino, valor_total, status')
      .in('empresa_id', empresaIds)
      .gte('data_saida', period.startDate)
      .lte('data_saida', period.endDate)
      .neq('status', 'cancelada');

    const gastosPromise = supabase
      .from('gasto')
      .select('valor, categoria_id')
      .in('empresa_id', empresaIds)
      .gte('data', period.startDate)
      .lte('data', period.endDate);

    const categoriasPromise = supabase
      .from('categoria_gasto')
      .select('id, nome')
      .order('nome');

    const [viagensResult, gastosResult, categoriasResult] = await Promise.all([
      viagensPromise,
      gastosPromise,
      categoriasPromise,
    ]);

    if (viagensResult.error) {
      throw new ToolExecutionError(
        'resumo_desempenho_periodo',
        `Falha ao carregar viagens: ${viagensResult.error.message}`,
        { period },
      );
    }
    if (gastosResult.error) {
      throw new ToolExecutionError(
        'resumo_desempenho_periodo',
        `Falha ao carregar gastos: ${gastosResult.error.message}`,
        { period },
      );
    }
    if (categoriasResult.error) {
      throw new ToolExecutionError(
        'resumo_desempenho_periodo',
        `Falha ao carregar categorias: ${categoriasResult.error.message}`,
        { period },
      );
    }

    const viagens = (viagensResult.data ?? []) as ViagemRow[];
    const gastos = (gastosResult.data ?? []) as GastoRow[];
    const categorias = (categoriasResult.data ?? []) as CategoriaRow[];

    if (viagens.length === 0 && gastos.length === 0) {
      return emptyResult;
    }

    // Aggregate gastos by categoria (first, needed for margem calc)
    const categoriaLookup = new Map<string, string>();
    for (const cat of categorias) {
      categoriaLookup.set(cat.id, cat.nome);
    }

    let gastoTotal = 0;
    const byCategoria = new Map<string, number>();
    for (const g of gastos) {
      gastoTotal += g.valor;
      const catName = g.categoria_id
        ? (categoriaLookup.get(g.categoria_id) ?? 'Sem categoria')
        : 'Sem categoria';
      byCategoria.set(catName, (byCategoria.get(catName) ?? 0) + g.valor);
    }

    // Aggregate viagens — melhor/pior by valor_total (maior frete = melhor)
    let receitaTotal = 0;
    let melhor: { row: ViagemRow; margem: number } | null = null;
    let pior: { row: ViagemRow; margem: number } | null = null;

    for (const v of viagens) {
      receitaTotal += v.valor_total;
      if (!melhor || v.valor_total > melhor.row.valor_total) {
        melhor = { row: v, margem: 0 };
      }
      if (!pior || v.valor_total < pior.row.valor_total) {
        pior = { row: v, margem: 0 };
      }
    }

    // Global margem applied to best/worst as approximation
    const globalMargem = receitaTotal > 0 ? computeMargem(receitaTotal, gastoTotal) : 0;
    if (melhor) melhor.margem = globalMargem;
    if (pior) pior.margem = globalMargem;

    const top3 = Array.from(byCategoria.entries())
      .map(([nome, total_centavos]) => ({ nome, total_centavos }))
      .sort((a, b) => b.total_centavos - a.total_centavos)
      .slice(0, 3);

    return {
      periodo: { start: period.startDate, end: period.endDate, label: period.label },
      qtd_viagens: viagens.length,
      receita_total_centavos: receitaTotal,
      gasto_total_centavos: gastoTotal,
      lucro_centavos: receitaTotal - gastoTotal,
      top_3_categorias: top3,
      melhor_viagem: melhor
        ? {
            id: melhor.row.id,
            origem: melhor.row.origem,
            destino: melhor.row.destino,
            margem_percentual: melhor.margem,
          }
        : null,
      pior_viagem: pior
        ? {
            id: pior.row.id,
            origem: pior.row.origem,
            destino: pior.row.destino,
            margem_percentual: pior.margem,
          }
        : null,
    };
  } catch (error) {
    if (error instanceof ToolExecutionError) {
      throw error;
    }
    throw new ToolExecutionError(
      'resumo_desempenho_periodo',
      `Erro inesperado: ${error instanceof Error ? error.message : 'desconhecido'}`,
      { input },
    );
  }
}
