/**
 * Assistente FrotaViva — Tool T2: ranking_caminhoes_por_lucro.
 *
 * Story 9.3 (AC-1). Computes per-caminhao:
 *   lucro_centavos = SUM(viagem.valor_total no periodo)
 *                  - SUM(gasto.valor no periodo)
 *
 * Returns caminhoes ordered by lucro_centavos. Only caminhoes that had
 * at least one viagem OR one gasto in the period are included — this
 * keeps the ranking focused on what actually moved in the window.
 *
 * Canceled viagens (status = 'cancelada') are excluded from receita.
 */

import { z } from 'zod';

import { parsePeriod } from '@/lib/copilot/utils/period';
import { MAX_TOOL_ROWS, ToolExecutionError } from '@/lib/copilot/tools/constants';
import type { ToolContext } from '@/lib/copilot/tools/constants';

export const rankingCaminhoesPorLucroSchema = z.object({
  periodo: z
    .string()
    .min(1)
    .describe(
      'Expressao em portugues: "este mes", "mes passado", "ultimos 30 dias", etc.',
    ),
  ordem: z
    .enum(['crescente', 'decrescente'])
    .optional()
    .describe(
      'crescente = prejuizo primeiro (default). decrescente = maior lucro primeiro.',
    ),
  top_n: z
    .coerce.number()
    .min(1)
    .max(MAX_TOOL_ROWS)
    .optional()
    .describe(`Quantos caminhoes retornar (default 5, max ${MAX_TOOL_ROWS}).`),
});

export type RankingCaminhoesInput = z.infer<
  typeof rankingCaminhoesPorLucroSchema
>;

export interface RankingCaminhoesResult {
  periodo: { start: string; end: string; label: string };
  ordem: 'crescente' | 'decrescente';
  caminhoes: Array<{
    id: string;
    placa: string;
    modelo: string;
    receita_centavos: number;
    gasto_centavos: number;
    lucro_centavos: number;
    qtd_viagens: number;
    motorista_principal: string | null;
  }>;
}

interface ViagemRow {
  caminhao_id: string | null;
  motorista_id: string | null;
  valor_total: number;
  status: string;
}

interface GastoRow {
  caminhao_id: string | null;
  valor: number;
}

interface CaminhaoRow {
  id: string;
  placa: string;
  modelo: string;
}

interface MotoristaRow {
  id: string;
  nome: string;
}

interface CaminhaoAggregate {
  receita_centavos: number;
  gasto_centavos: number;
  qtd_viagens: number;
  motorista_viagens: Map<string, number>;
}

export async function executeRankingCaminhoesPorLucro(
  input: RankingCaminhoesInput,
  ctx: ToolContext,
): Promise<RankingCaminhoesResult> {
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
        caminhoes: [],
      };
    }

    // Load viagens (non-canceled) in the period, gastos in the period,
    // and all caminhoes for the empresas — in parallel.
    const viagensPromise = supabase
      .from('viagem')
      .select('caminhao_id, motorista_id, valor_total, status')
      .in('empresa_id', empresaIds)
      .gte('data_saida', period.startDate)
      .lte('data_saida', period.endDate)
      .neq('status', 'cancelada');

    const gastosPromise = supabase
      .from('gasto')
      .select('caminhao_id, valor')
      .in('empresa_id', empresaIds)
      .gte('data', period.startDate)
      .lte('data', period.endDate);

    const caminhoesPromise = supabase
      .from('caminhao')
      .select('id, placa, modelo')
      .in('empresa_id', empresaIds);

    const motoristasPromise = supabase
      .from('motorista')
      .select('id, nome')
      .in('empresa_id', empresaIds);

    const [viagensResult, gastosResult, caminhoesResult, motoristasResult] = await Promise.all([
      viagensPromise,
      gastosPromise,
      caminhoesPromise,
      motoristasPromise,
    ]);

    if (viagensResult.error) {
      throw new ToolExecutionError(
        'ranking_caminhoes_por_lucro',
        `Falha ao carregar viagens: ${viagensResult.error.message}`,
        { period },
      );
    }
    if (gastosResult.error) {
      throw new ToolExecutionError(
        'ranking_caminhoes_por_lucro',
        `Falha ao carregar gastos: ${gastosResult.error.message}`,
        { period },
      );
    }
    if (caminhoesResult.error) {
      throw new ToolExecutionError(
        'ranking_caminhoes_por_lucro',
        `Falha ao carregar caminhoes: ${caminhoesResult.error.message}`,
        { period },
      );
    }
    if (motoristasResult.error) {
      throw new ToolExecutionError(
        'ranking_caminhoes_por_lucro',
        `Falha ao carregar motoristas: ${motoristasResult.error.message}`,
        { period },
      );
    }

    const viagens = (viagensResult.data ?? []) as ViagemRow[];
    const gastos = (gastosResult.data ?? []) as GastoRow[];
    const caminhoes = (caminhoesResult.data ?? []) as CaminhaoRow[];
    const motoristas = (motoristasResult.data ?? []) as MotoristaRow[];

    // Build motorista lookup
    const motoristaLookup = new Map<string, string>();
    for (const m of motoristas) {
      motoristaLookup.set(m.id, m.nome);
    }

    // Aggregate by caminhao_id
    const aggregates = new Map<string, CaminhaoAggregate>();
    const touch = (caminhaoId: string) => {
      const existing = aggregates.get(caminhaoId);
      if (existing) return existing;
      const fresh: CaminhaoAggregate = {
        receita_centavos: 0,
        gasto_centavos: 0,
        qtd_viagens: 0,
        motorista_viagens: new Map(),
      };
      aggregates.set(caminhaoId, fresh);
      return fresh;
    };

    for (const v of viagens) {
      if (!v.caminhao_id) continue;
      const agg = touch(v.caminhao_id);
      agg.receita_centavos += v.valor_total;
      agg.qtd_viagens += 1;
      if (v.motorista_id) {
        agg.motorista_viagens.set(
          v.motorista_id,
          (agg.motorista_viagens.get(v.motorista_id) ?? 0) + 1,
        );
      }
    }
    for (const g of gastos) {
      if (!g.caminhao_id) continue;
      const agg = touch(g.caminhao_id);
      agg.gasto_centavos += g.valor;
    }

    // Build metadata lookup
    const caminhaoLookup = new Map<string, CaminhaoRow>();
    for (const c of caminhoes) {
      caminhaoLookup.set(c.id, c);
    }

    // Materialize and sort
    const rows = Array.from(aggregates.entries())
      .filter(([caminhaoId]) => caminhaoLookup.has(caminhaoId))
      .map(([caminhaoId, agg]) => {
        const meta = caminhaoLookup.get(caminhaoId);

        // Find motorista who drove this caminhao the most in the period
        let motoristaPrincipal: string | null = null;
        if (agg.motorista_viagens.size > 0) {
          let maxViagens = 0;
          let maxId = '';
          for (const [motId, count] of agg.motorista_viagens) {
            if (count > maxViagens) {
              maxViagens = count;
              maxId = motId;
            }
          }
          motoristaPrincipal = motoristaLookup.get(maxId) ?? null;
        }

        return {
          id: caminhaoId,
          placa: meta?.placa ?? 'desconhecida',
          modelo: meta?.modelo ?? 'desconhecido',
          receita_centavos: agg.receita_centavos,
          gasto_centavos: agg.gasto_centavos,
          lucro_centavos: agg.receita_centavos - agg.gasto_centavos,
          qtd_viagens: agg.qtd_viagens,
          motorista_principal: motoristaPrincipal,
        };
      });

    rows.sort((a, b) =>
      ordem === 'crescente'
        ? a.lucro_centavos - b.lucro_centavos
        : b.lucro_centavos - a.lucro_centavos,
    );

    return {
      periodo: {
        start: period.startDate,
        end: period.endDate,
        label: period.label,
      },
      ordem,
      caminhoes: rows.slice(0, topN),
    };
  } catch (error) {
    if (error instanceof ToolExecutionError) {
      throw error;
    }
    throw new ToolExecutionError(
      'ranking_caminhoes_por_lucro',
      `Erro inesperado: ${error instanceof Error ? error.message : 'desconhecido'}`,
      { input },
    );
  }
}
