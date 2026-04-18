/**
 * Assistente FrotaViva — Tool T13: rentabilidade_por_rota.
 *
 * Agrupa viagens por par origem-destino e calcula:
 * - Quantidade de viagens na rota
 * - Receita total (frete)
 * - Gasto total (vinculados a viagem)
 * - Lucro e margem %
 * - Frete medio, gasto medio, km medio
 *
 * Responde: "qual rota da mais lucro?", "qual trajeto compensa mais?",
 * "rentabilidade por rota", "rota mais lucrativa"
 *
 * RLS enforced via createClient() SSR + belt-and-suspenders empresaIds.
 * Monetary values in INTEGER centavos (CON-9).
 */

import { z } from 'zod';

import { parsePeriod } from '@/lib/copilot/utils/period';
import { MAX_TOOL_ROWS, ToolExecutionError } from '@/lib/copilot/tools/constants';
import type { ToolContext } from '@/lib/copilot/tools/constants';

export const rentabilidadeRotaSchema = z.object({
  periodo: z
    .string()
    .min(1)
    .describe(
      'Expressao em portugues: "este mes", "mes passado", "ultimos 3 meses", etc.',
    ),
  top_n: z
    .coerce.number()
    .min(1)
    .max(MAX_TOOL_ROWS)
    .optional()
    .describe(`Quantas rotas retornar (default 10, max ${MAX_TOOL_ROWS}).`),
  ordem: z
    .enum(['lucro', 'margem', 'viagens'])
    .optional()
    .describe('Ordenar por: lucro (default), margem %, ou quantidade de viagens.'),
});

export type RentabilidadeRotaInput = z.infer<typeof rentabilidadeRotaSchema>;

export interface RotaItem {
  rota: string;
  origem: string;
  destino: string;
  qtd_viagens: number;
  receita_total_reais: number;
  gasto_total_reais: number;
  lucro_reais: number;
  margem_percentual: number;
  frete_medio_reais: number;
  gasto_medio_reais: number;
  km_total: number;
  km_medio: number;
}

export interface RentabilidadeRotaResult {
  periodo: { start: string; end: string; label: string };
  ordem: 'lucro' | 'margem' | 'viagens';
  rotas: RotaItem[];
  total_viagens_periodo: number;
}

interface ViagemRow {
  id: string;
  origem: string;
  destino: string;
  valor_total: number;
  km_total: number | null;
}

interface GastoViagemRow {
  viagem_id: string | null;
  valor: number;
}

function toReais(centavos: number): number {
  return Math.round(centavos) / 100;
}

function normalizeCity(city: string): string {
  return city.trim().replace(/\s+/g, ' ');
}

export async function executeRentabilidadeRota(
  input: RentabilidadeRotaInput,
  ctx: ToolContext,
): Promise<RentabilidadeRotaResult> {
  try {
    const period = parsePeriod(input.periodo);
    const topN = Math.min(input.top_n ?? 10, MAX_TOOL_ROWS);
    const ordem = input.ordem ?? 'lucro';
    const { supabase, empresaIds } = ctx;

    const emptyResult: RentabilidadeRotaResult = {
      periodo: { start: period.startDate, end: period.endDate, label: period.label },
      ordem,
      rotas: [],
      total_viagens_periodo: 0,
    };

    if (empresaIds.length === 0) {
      return emptyResult;
    }

    // Fetch viagens + gastos vinculados em paralelo
    const [viagensResult, gastosResult] = await Promise.all([
      supabase
        .from('viagem')
        .select('id, origem, destino, valor_total, km_total')
        .in('empresa_id', empresaIds)
        .gte('data_saida', period.startDate)
        .lte('data_saida', period.endDate)
        .neq('status', 'cancelada')
        .gt('valor_total', 0)
        .limit(500),
      supabase
        .from('gasto')
        .select('viagem_id, valor')
        .in('empresa_id', empresaIds)
        .gte('data', period.startDate)
        .lte('data', period.endDate)
        .not('viagem_id', 'is', null),
    ]);

    if (viagensResult.error) {
      throw new ToolExecutionError(
        'rentabilidade_por_rota',
        `Falha ao carregar viagens: ${viagensResult.error.message}`,
        { period },
      );
    }
    if (gastosResult.error) {
      throw new ToolExecutionError(
        'rentabilidade_por_rota',
        `Falha ao carregar gastos: ${gastosResult.error.message}`,
        { period },
      );
    }

    const viagens = (viagensResult.data ?? []) as ViagemRow[];
    const gastos = (gastosResult.data ?? []) as GastoViagemRow[];

    if (viagens.length === 0) {
      return emptyResult;
    }

    // Aggregate gastos by viagem_id
    const gastoPorViagem = new Map<string, number>();
    for (const g of gastos) {
      if (!g.viagem_id) continue;
      gastoPorViagem.set(
        g.viagem_id,
        (gastoPorViagem.get(g.viagem_id) ?? 0) + g.valor,
      );
    }

    // Group viagens by rota (origem -> destino)
    const rotaMap = new Map<string, {
      origem: string;
      destino: string;
      receita: number;
      gasto: number;
      km: number;
      count: number;
    }>();

    for (const v of viagens) {
      const origem = normalizeCity(v.origem);
      const destino = normalizeCity(v.destino);
      const key = `${origem} → ${destino}`;
      const gastoViagem = gastoPorViagem.get(v.id) ?? 0;
      const km = v.km_total && v.km_total > 0 ? v.km_total : 0;

      const existing = rotaMap.get(key);
      if (existing) {
        existing.receita += v.valor_total;
        existing.gasto += gastoViagem;
        existing.km += km;
        existing.count += 1;
      } else {
        rotaMap.set(key, {
          origem,
          destino,
          receita: v.valor_total,
          gasto: gastoViagem,
          km,
          count: 1,
        });
      }
    }

    // Build result array
    const rotas: RotaItem[] = Array.from(rotaMap.entries()).map(([rota, data]) => {
      const lucro = data.receita - data.gasto;
      const margem = data.receita > 0
        ? Math.round((lucro / data.receita) * 10000) / 100
        : 0;

      return {
        rota,
        origem: data.origem,
        destino: data.destino,
        qtd_viagens: data.count,
        receita_total_reais: toReais(data.receita),
        gasto_total_reais: toReais(data.gasto),
        lucro_reais: toReais(lucro),
        margem_percentual: margem,
        frete_medio_reais: toReais(Math.round(data.receita / data.count)),
        gasto_medio_reais: toReais(Math.round(data.gasto / data.count)),
        km_total: data.km,
        km_medio: data.count > 0 ? Math.round(data.km / data.count) : 0,
      };
    });

    // Sort
    if (ordem === 'margem') {
      rotas.sort((a, b) => b.margem_percentual - a.margem_percentual);
    } else if (ordem === 'viagens') {
      rotas.sort((a, b) => b.qtd_viagens - a.qtd_viagens);
    } else {
      rotas.sort((a, b) => b.lucro_reais - a.lucro_reais);
    }

    return {
      periodo: { start: period.startDate, end: period.endDate, label: period.label },
      ordem,
      rotas: rotas.slice(0, topN),
      total_viagens_periodo: viagens.length,
    };
  } catch (error) {
    if (error instanceof ToolExecutionError) {
      throw error;
    }
    throw new ToolExecutionError(
      'rentabilidade_por_rota',
      `Erro inesperado: ${error instanceof Error ? error.message : 'desconhecido'}`,
      { input },
    );
  }
}
