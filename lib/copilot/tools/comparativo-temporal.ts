/**
 * Assistente FrotaViva — Tool T12: comparativo_temporal.
 *
 * Compares two periods side-by-side (default: este mes vs mes passado).
 * Returns: receita, gastos, lucro, margem, viagens, km/L, top categorias,
 * and variation % for each metric.
 *
 * RLS enforced via createClient() SSR + belt-and-suspenders empresaIds.
 * Monetary values in INTEGER centavos (CON-9).
 */

import { z } from 'zod';

import { parsePeriod } from '@/lib/copilot/utils/period';
import { ToolExecutionError } from '@/lib/copilot/tools/constants';
import type { ToolContext } from '@/lib/copilot/tools/constants';

export const comparativoTemporalSchema = z.object({
  periodo_atual: z
    .string()
    .min(1)
    .describe(
      'Periodo atual em portugues: "este mes", "marco", "ultimos 30 dias", etc.',
    ),
  periodo_anterior: z
    .string()
    .min(1)
    .describe(
      'Periodo de comparacao: "mes passado", "fevereiro", "ano passado", etc.',
    ),
});

export type ComparativoTemporalInput = z.infer<typeof comparativoTemporalSchema>;

interface PeriodSummary {
  label: string;
  start: string;
  end: string;
  qtd_viagens: number;
  receita_reais: number;
  gasto_reais: number;
  lucro_reais: number;
  margem_percentual: number;
  km_total: number;
  litros_total: number;
  km_por_litro: number | null;
  top_categorias: Array<{ nome: string; total_reais: number }>;
}

interface Variacao {
  receita_pct: number | null;
  gasto_pct: number | null;
  lucro_pct: number | null;
  margem_diff: number;
  viagens_pct: number | null;
  km_por_litro_diff: number | null;
}

export interface ComparativoTemporalResult {
  atual: PeriodSummary;
  anterior: PeriodSummary;
  variacao: Variacao;
}

interface ViagemRow {
  valor_total: number;
  status: string;
}

interface GastoRow {
  valor: number;
  categoria_id: string | null;
  litros: number | null;
  km: number | null;
}

interface CategoriaRow {
  id: string;
  nome: string;
}

function pctChange(current: number, previous: number): number | null {
  if (previous === 0) return null;
  return Math.round(((current - previous) / Math.abs(previous)) * 10000) / 100;
}

function toReais(centavos: number): number {
  return Math.round(centavos) / 100;
}

async function fetchPeriodData(
  startDate: string,
  endDate: string,
  label: string,
  ctx: ToolContext,
  categoriaLookup: Map<string, string>,
): Promise<PeriodSummary> {
  const { supabase, empresaIds } = ctx;

  if (empresaIds.length === 0) {
    return {
      label,
      start: startDate,
      end: endDate,
      qtd_viagens: 0,
      receita_reais: 0,
      gasto_reais: 0,
      lucro_reais: 0,
      margem_percentual: 0,
      km_total: 0,
      litros_total: 0,
      km_por_litro: null,
      top_categorias: [],
    };
  }

  const [viagensResult, gastosResult] = await Promise.all([
    supabase
      .from('viagem')
      .select('valor_total, status')
      .in('empresa_id', empresaIds)
      .gte('data_saida', startDate)
      .lte('data_saida', endDate)
      .neq('status', 'cancelada'),
    supabase
      .from('gasto')
      .select('valor, categoria_id, litros, km')
      .in('empresa_id', empresaIds)
      .gte('data', startDate)
      .lte('data', endDate),
  ]);

  if (viagensResult.error) {
    throw new ToolExecutionError(
      'comparativo_temporal',
      `Falha ao carregar viagens: ${viagensResult.error.message}`,
      { startDate, endDate },
    );
  }
  if (gastosResult.error) {
    throw new ToolExecutionError(
      'comparativo_temporal',
      `Falha ao carregar gastos: ${gastosResult.error.message}`,
      { startDate, endDate },
    );
  }

  const viagens = (viagensResult.data ?? []) as ViagemRow[];
  const gastos = (gastosResult.data ?? []) as GastoRow[];

  let receitaTotal = 0;
  for (const v of viagens) {
    receitaTotal += v.valor_total;
  }

  let gastoTotal = 0;
  let kmTotal = 0;
  let litrosTotal = 0;
  const byCategoria = new Map<string, number>();

  for (const g of gastos) {
    gastoTotal += g.valor;
    if (g.km && g.km > 0) kmTotal += g.km;
    if (g.litros && g.litros > 0) litrosTotal += g.litros;

    const catName = g.categoria_id
      ? (categoriaLookup.get(g.categoria_id) ?? 'Sem categoria')
      : 'Sem categoria';
    byCategoria.set(catName, (byCategoria.get(catName) ?? 0) + g.valor);
  }

  const lucro = receitaTotal - gastoTotal;
  const margem = receitaTotal > 0
    ? Math.round(((receitaTotal - gastoTotal) / receitaTotal) * 10000) / 100
    : 0;

  const kmPorLitro = litrosTotal > 0
    ? Math.round((kmTotal / litrosTotal) * 100) / 100
    : null;

  const topCategorias = Array.from(byCategoria.entries())
    .map(([nome, total]) => ({ nome, total_reais: toReais(total) }))
    .sort((a, b) => b.total_reais - a.total_reais)
    .slice(0, 5);

  return {
    label,
    start: startDate,
    end: endDate,
    qtd_viagens: viagens.length,
    receita_reais: toReais(receitaTotal),
    gasto_reais: toReais(gastoTotal),
    lucro_reais: toReais(lucro),
    margem_percentual: margem,
    km_total: kmTotal,
    litros_total: litrosTotal,
    km_por_litro: kmPorLitro,
    top_categorias: topCategorias,
  };
}

export async function executeComparativoTemporal(
  input: ComparativoTemporalInput,
  ctx: ToolContext,
): Promise<ComparativoTemporalResult> {
  try {
    const periodAtual = parsePeriod(input.periodo_atual);
    const periodAnterior = parsePeriod(input.periodo_anterior);

    const { supabase } = ctx;

    // Fetch categorias once (shared between both periods)
    const categoriasResult = await supabase
      .from('categoria_gasto')
      .select('id, nome')
      .order('nome');

    if (categoriasResult.error) {
      throw new ToolExecutionError(
        'comparativo_temporal',
        `Falha ao carregar categorias: ${categoriasResult.error.message}`,
        {},
      );
    }

    const categoriaLookup = new Map<string, string>();
    for (const cat of (categoriasResult.data ?? []) as CategoriaRow[]) {
      categoriaLookup.set(cat.id, cat.nome);
    }

    // Fetch both periods in parallel
    const [atual, anterior] = await Promise.all([
      fetchPeriodData(
        periodAtual.startDate,
        periodAtual.endDate,
        periodAtual.label,
        ctx,
        categoriaLookup,
      ),
      fetchPeriodData(
        periodAnterior.startDate,
        periodAnterior.endDate,
        periodAnterior.label,
        ctx,
        categoriaLookup,
      ),
    ]);

    const variacao: Variacao = {
      receita_pct: pctChange(atual.receita_reais, anterior.receita_reais),
      gasto_pct: pctChange(atual.gasto_reais, anterior.gasto_reais),
      lucro_pct: pctChange(atual.lucro_reais, anterior.lucro_reais),
      margem_diff: Math.round((atual.margem_percentual - anterior.margem_percentual) * 100) / 100,
      viagens_pct: pctChange(atual.qtd_viagens, anterior.qtd_viagens),
      km_por_litro_diff:
        atual.km_por_litro !== null && anterior.km_por_litro !== null
          ? Math.round((atual.km_por_litro - anterior.km_por_litro) * 100) / 100
          : null,
    };

    return { atual, anterior, variacao };
  } catch (error) {
    if (error instanceof ToolExecutionError) {
      throw error;
    }
    throw new ToolExecutionError(
      'comparativo_temporal',
      `Erro inesperado: ${error instanceof Error ? error.message : 'desconhecido'}`,
      { input },
    );
  }
}
