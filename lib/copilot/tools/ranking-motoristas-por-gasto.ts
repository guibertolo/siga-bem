/**
 * Assistente FrotaViva — Tool T7: ranking_motoristas_por_gasto.
 *
 * Ranks motoristas by total gasto in a period, optionally filtered
 * by categoria (ex: "Combustivel", "Pneu", "Manutencao").
 *
 * Use cases:
 * - "Qual motorista gasta mais combustivel?"
 * - "Quem troca mais pneu?"
 * - "Ranking de gastos por motorista esse mes"
 */

import { z } from 'zod';

import { parsePeriod } from '@/lib/copilot/utils/period';
import { MAX_TOOL_ROWS, ToolExecutionError } from '@/lib/copilot/tools/constants';
import type { ToolContext } from '@/lib/copilot/tools/constants';

export const rankingMotoristasPorGastoSchema = z.object({
  periodo: z
    .string()
    .min(1)
    .describe(
      'Expressao em portugues: "este mes", "mes passado", "ultimos 30 dias", etc.',
    ),
  categoria: z
    .string()
    .optional()
    .describe(
      'Filtrar por categoria de gasto (ex: "Combustivel", "Pneu", "Manutencao"). Case-insensitive. Se omitido, soma todos.',
    ),
  ordem: z
    .enum(['crescente', 'decrescente'])
    .optional()
    .describe('crescente = quem gasta menos primeiro. decrescente = quem gasta mais primeiro (default).'),
  top_n: z
    .coerce.number()
    .min(1)
    .max(MAX_TOOL_ROWS)
    .optional()
    .describe(`Quantos motoristas retornar (default 10, max ${MAX_TOOL_ROWS}).`),
});

export type RankingMotoristasPorGastoInput = z.infer<typeof rankingMotoristasPorGastoSchema>;

export interface RankingMotoristasPorGastoResult {
  periodo: { start: string; end: string; label: string };
  categoria_filtro: string | null;
  ordem: 'crescente' | 'decrescente';
  motoristas: Array<{
    id: string;
    nome: string;
    total_reais: number;
    qtd_gastos: number;
    litros_total: number | null;
    km_rodado: number | null;
    km_por_litro: number | null;
    custo_por_km_reais: number | null;
  }>;
}

interface GastoRow {
  motorista_id: string;
  valor: number;
  categoria_id: string | null;
  litros: number | null;
}

interface ViagemRow {
  motorista_id: string;
  km_saida: number | null;
  km_chegada: number | null;
}

interface MotoristaRow {
  id: string;
  nome: string;
}

interface CategoriaRow {
  id: string;
  nome: string;
}

export async function executeRankingMotoristasPorGasto(
  input: RankingMotoristasPorGastoInput,
  ctx: ToolContext,
): Promise<RankingMotoristasPorGastoResult> {
  try {
    const period = parsePeriod(input.periodo);
    const ordem: 'crescente' | 'decrescente' = input.ordem ?? 'decrescente';
    const topN = Math.min(input.top_n ?? 10, MAX_TOOL_ROWS);
    const { supabase, empresaIds } = ctx;

    if (empresaIds.length === 0) {
      return {
        periodo: { start: period.startDate, end: period.endDate, label: period.label },
        categoria_filtro: input.categoria ?? null,
        ordem,
        motoristas: [],
      };
    }

    // Resolve categoria name -> id if provided
    let categoriaIdFilter: string | null = null;
    let categoriaNameResolved: string | null = null;

    if (input.categoria) {
      const { data: allCategorias, error: catError } = await supabase
        .from('categoria_gasto')
        .select('id, nome')
        .order('nome');

      if (catError) {
        throw new ToolExecutionError(
          'ranking_motoristas_por_gasto',
          `Falha ao carregar categorias: ${catError.message}`,
          { empresaIds },
        );
      }

      const needle = input.categoria.toLocaleLowerCase('pt-BR');
      const match = (allCategorias ?? []).find(
        (c: CategoriaRow) => c.nome.toLocaleLowerCase('pt-BR') === needle,
      ) as CategoriaRow | undefined;

      if (match) {
        categoriaIdFilter = match.id;
        categoriaNameResolved = match.nome;
      }
    }

    // Fetch gastos + motoristas + viagens in parallel
    let gastoQuery = supabase
      .from('gasto')
      .select('motorista_id, valor, categoria_id, litros')
      .in('empresa_id', empresaIds)
      .gte('data', period.startDate)
      .lte('data', period.endDate);

    if (categoriaIdFilter) {
      gastoQuery = gastoQuery.eq('categoria_id', categoriaIdFilter);
    }

    const motoristasPromise = supabase
      .from('motorista')
      .select('id, nome')
      .in('empresa_id', empresaIds)
      .eq('status', 'ativo');

    const viagensPromise = supabase
      .from('viagem')
      .select('motorista_id, km_saida, km_chegada')
      .in('empresa_id', empresaIds)
      .gte('data_saida', period.startDate)
      .lte('data_saida', period.endDate)
      .neq('status', 'cancelada');

    const [gastosResult, motoristasResult, viagensResult] = await Promise.all([
      gastoQuery,
      motoristasPromise,
      viagensPromise,
    ]);

    if (gastosResult.error) {
      throw new ToolExecutionError(
        'ranking_motoristas_por_gasto',
        `Falha ao carregar gastos: ${gastosResult.error.message}`,
        { period },
      );
    }
    if (motoristasResult.error) {
      throw new ToolExecutionError(
        'ranking_motoristas_por_gasto',
        `Falha ao carregar motoristas: ${motoristasResult.error.message}`,
        { period },
      );
    }
    if (viagensResult.error) {
      throw new ToolExecutionError(
        'ranking_motoristas_por_gasto',
        `Falha ao carregar viagens: ${viagensResult.error.message}`,
        { period },
      );
    }

    const gastos = (gastosResult.data ?? []) as GastoRow[];
    const motoristasData = (motoristasResult.data ?? []) as MotoristaRow[];
    const viagens = (viagensResult.data ?? []) as ViagemRow[];

    // Aggregate km por motorista
    const kmPorMotorista = new Map<string, number>();
    for (const v of viagens) {
      if (!v.motorista_id) continue;
      if (v.km_saida != null && v.km_chegada != null && v.km_chegada > v.km_saida) {
        kmPorMotorista.set(
          v.motorista_id,
          (kmPorMotorista.get(v.motorista_id) ?? 0) + (v.km_chegada - v.km_saida),
        );
      }
    }

    // Build motorista lookup
    const motoristaLookup = new Map<string, string>();
    for (const m of motoristasData) {
      motoristaLookup.set(m.id, m.nome);
    }

    // Aggregate by motorista
    const aggregates = new Map<string, { total: number; qtd: number; litros: number }>();
    for (const g of gastos) {
      if (!g.motorista_id) continue;
      const existing = aggregates.get(g.motorista_id);
      if (existing) {
        existing.total += g.valor;
        existing.qtd += 1;
        existing.litros += g.litros ?? 0;
      } else {
        aggregates.set(g.motorista_id, {
          total: g.valor,
          qtd: 1,
          litros: g.litros ?? 0,
        });
      }
    }

    // Build result with km/L and R$/km
    const rows = Array.from(aggregates.entries())
      .filter(([motoristaId]) => motoristaLookup.has(motoristaId))
      .map(([motoristaId, agg]) => {
        const km = kmPorMotorista.get(motoristaId) ?? 0;
        const hasKm = km > 0;
        const hasLitros = agg.litros > 0;
        return {
          id: motoristaId,
          nome: motoristaLookup.get(motoristaId) ?? 'desconhecido',
          total_reais: Math.round(agg.total) / 100,
          qtd_gastos: agg.qtd,
          litros_total: hasLitros ? agg.litros : null,
          km_rodado: hasKm ? km : null,
          km_por_litro: hasKm && hasLitros
            ? Math.round((km / agg.litros) * 100) / 100
            : null,
          custo_por_km_reais: hasKm
            ? Math.round((agg.total / km)) / 100
            : null,
        };
      });

    // Sort: se tem km/L, prioriza eficiencia (km/L) sobre valor absoluto.
    // "decrescente" = mais gastao = menor km/L primeiro (pior eficiencia no topo).
    const hasKmL = rows.some((r) => r.km_por_litro !== null);
    if (hasKmL) {
      rows.sort((a, b) => {
        const aKml = a.km_por_litro ?? 999;
        const bKml = b.km_por_litro ?? 999;
        return ordem === 'decrescente' ? aKml - bKml : bKml - aKml;
      });
    } else {
      rows.sort((a, b) =>
        ordem === 'decrescente'
          ? b.total_reais - a.total_reais
          : a.total_reais - b.total_reais,
      );
    }

    return {
      periodo: { start: period.startDate, end: period.endDate, label: period.label },
      categoria_filtro: categoriaNameResolved,
      ordem,
      motoristas: rows.slice(0, topN),
    };
  } catch (error) {
    if (error instanceof ToolExecutionError) throw error;
    throw new ToolExecutionError(
      'ranking_motoristas_por_gasto',
      `Erro inesperado: ${error instanceof Error ? error.message : 'desconhecido'}`,
      { input },
    );
  }
}
