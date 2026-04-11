/**
 * Assistente FrotaViva — Tool T3: ranking_viagens_por_margem.
 *
 * Story 9.3 (AC-2). Computes per-viagem:
 *   margem_percentual = round(
 *     (valor_frete_centavos - SUM(gastos vinculados a viagem)) * 100
 *     / valor_frete_centavos
 *   )
 *
 * Convention: `margem_percentual` is an **integer 0-100** (rounded).
 * Negative values possible when a viagem lost money. Zero-frete viagens
 * are excluded from the ranking (division by zero + meaningless).
 *
 * Canceled viagens are excluded. Ranking returns top_n according to
 * `ordem` (crescente = pior margem primeiro; default crescente to
 * surface problems first).
 */

import { z } from 'zod';

import { parsePeriod } from '@/lib/copilot/utils/period';
import { MAX_TOOL_ROWS, ToolExecutionError } from '@/lib/copilot/tools/index';
import type { ToolContext } from '@/lib/copilot/tools/index';

/**
 * Safety cap on how many viagens we pull into memory before ranking.
 * A month with ~500 viagens is well above typical FrotaViva tenants.
 * If a tenant exceeds this, the ranking is still returned but flagged.
 */
const RANKING_LOAD_CAP = 500;

export const rankingViagensPorMargemSchema = z.object({
  periodo: z
    .string()
    .min(1)
    .describe('Expressao em portugues: "este mes", "mes passado", etc.'),
  ordem: z
    .enum(['crescente', 'decrescente'])
    .optional()
    .describe(
      'crescente = pior margem primeiro (default). decrescente = maior margem primeiro.',
    ),
  top_n: z
    .number()
    .int()
    .min(1)
    .max(MAX_TOOL_ROWS)
    .optional()
    .describe(`Quantas viagens retornar (default 5, max ${MAX_TOOL_ROWS}).`),
});

export type RankingViagensInput = z.infer<typeof rankingViagensPorMargemSchema>;

export interface RankingViagensResult {
  periodo: { start: string; end: string; label: string };
  ordem: 'crescente' | 'decrescente';
  viagens: Array<{
    id: string;
    origem: string;
    destino: string;
    data_saida: string;
    valor_frete_centavos: number;
    gasto_total_centavos: number;
    lucro_centavos: number;
    margem_percentual: number; // integer 0-100 (may be negative)
  }>;
  limite_carregamento_atingido: boolean;
}

interface ViagemRow {
  id: string;
  origem: string;
  destino: string;
  data_saida: string;
  valor_frete_centavos: number;
  status: string;
}

interface GastoViagemRow {
  viagem_id: string | null;
  valor: number;
}

export async function executeRankingViagensPorMargem(
  input: RankingViagensInput,
  ctx: ToolContext,
): Promise<RankingViagensResult> {
  try {
    const period = parsePeriod(input.periodo);
    const ordem: 'crescente' | 'decrescente' = input.ordem ?? 'crescente';
    const topN = Math.min(input.top_n ?? 5, MAX_TOOL_ROWS);
    const { supabase, empresaIds } = ctx;

    if (empresaIds.length === 0) {
      return {
        periodo: {
          start: period.startDate,
          end: period.endDate,
          label: period.label,
        },
        ordem,
        viagens: [],
        limite_carregamento_atingido: false,
      };
    }

    const viagensPromise = supabase
      .from('viagem')
      .select(
        'id, origem, destino, data_saida, valor_frete_centavos, status',
        { count: 'exact' },
      )
      .in('empresa_id', empresaIds)
      .gte('data_saida', period.startDate)
      .lte('data_saida', period.endDate)
      .neq('status', 'cancelada')
      .gt('valor_frete_centavos', 0)
      .limit(RANKING_LOAD_CAP);

    const gastosPromise = supabase
      .from('gasto')
      .select('viagem_id, valor')
      .in('empresa_id', empresaIds)
      .gte('data', period.startDate)
      .lte('data', period.endDate)
      .not('viagem_id', 'is', null);

    const [viagensResult, gastosResult] = await Promise.all([
      viagensPromise,
      gastosPromise,
    ]);

    if (viagensResult.error) {
      throw new ToolExecutionError(
        'ranking_viagens_por_margem',
        `Falha ao carregar viagens: ${viagensResult.error.message}`,
        { period },
      );
    }
    if (gastosResult.error) {
      throw new ToolExecutionError(
        'ranking_viagens_por_margem',
        `Falha ao carregar gastos: ${gastosResult.error.message}`,
        { period },
      );
    }

    const viagens = (viagensResult.data ?? []) as ViagemRow[];
    const gastos = (gastosResult.data ?? []) as GastoViagemRow[];
    const totalViagensInPeriod =
      viagensResult.count ?? viagens.length;

    // Aggregate gasto totals per viagem_id
    const gastoPorViagem = new Map<string, number>();
    for (const g of gastos) {
      if (!g.viagem_id) continue;
      gastoPorViagem.set(
        g.viagem_id,
        (gastoPorViagem.get(g.viagem_id) ?? 0) + g.valor,
      );
    }

    // Compute margem per viagem
    const rows = viagens.map((v) => {
      const gastoTotal = gastoPorViagem.get(v.id) ?? 0;
      const lucro = v.valor_frete_centavos - gastoTotal;
      const margem = Math.round((lucro * 100) / v.valor_frete_centavos);
      return {
        id: v.id,
        origem: v.origem,
        destino: v.destino,
        data_saida: v.data_saida,
        valor_frete_centavos: v.valor_frete_centavos,
        gasto_total_centavos: gastoTotal,
        lucro_centavos: lucro,
        margem_percentual: margem,
      };
    });

    rows.sort((a, b) =>
      ordem === 'crescente'
        ? a.margem_percentual - b.margem_percentual
        : b.margem_percentual - a.margem_percentual,
    );

    return {
      periodo: {
        start: period.startDate,
        end: period.endDate,
        label: period.label,
      },
      ordem,
      viagens: rows.slice(0, topN),
      limite_carregamento_atingido: totalViagensInPeriod > RANKING_LOAD_CAP,
    };
  } catch (error) {
    if (error instanceof ToolExecutionError) {
      throw error;
    }
    throw new ToolExecutionError(
      'ranking_viagens_por_margem',
      `Erro inesperado: ${error instanceof Error ? error.message : 'desconhecido'}`,
      { input },
    );
  }
}
