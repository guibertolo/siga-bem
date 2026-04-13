/**
 * Assistente FrotaViva — buildToolset + re-exports.
 *
 * Story 9.2 (AC-2): ToolContext, MAX_TOOL_ROWS, ToolExecutionError (in constants.ts).
 * Story 9.5 (AC-3): buildToolset() wires all 6 tools to AI SDK v6.
 *
 * Constants/types live in constants.ts to break circular imports
 * (index -> tools -> index). This file re-exports them for backwards compat.
 */

import { tool } from 'ai';

// Re-export constants so existing imports from '@/lib/copilot/tools/index' still work
export { MAX_TOOL_ROWS, ToolExecutionError } from '@/lib/copilot/tools/constants';
export type { ToolContext } from '@/lib/copilot/tools/constants';

import type { ToolContext } from '@/lib/copilot/tools/constants';

import {
  buscarGastosPorPeriodoSchema,
  executeBuscarGastosPorPeriodo,
} from '@/lib/copilot/tools/buscar-gastos-por-periodo';
import {
  listarCaminhoesSchema,
  executeListarCaminhoes,
} from '@/lib/copilot/tools/listar-caminhoes';
import {
  rankingCaminhoesPorLucroSchema,
  executeRankingCaminhoesPorLucro,
} from '@/lib/copilot/tools/ranking-caminhoes-por-lucro';
import {
  rankingViagensPorMargemSchema,
  executeRankingViagensPorMargem,
} from '@/lib/copilot/tools/ranking-viagens-por-margem';
import {
  motoristasCnhVencendoSchema,
  executeMotoristasCnhVencendo,
} from '@/lib/copilot/tools/motoristas-cnh-vencendo';
import {
  resumoDesempenhoPeriodoSchema,
  executeResumoDesempenhoPeriodo,
} from '@/lib/copilot/tools/resumo-desempenho-periodo';
import {
  rankingMotoristasPorGastoSchema,
  executeRankingMotoristasPorGasto,
} from '@/lib/copilot/tools/ranking-motoristas-por-gasto';
import {
  desempenhoMotoristaSchema,
  executeDesempenhoMotorista,
} from '@/lib/copilot/tools/desempenho-motorista';

/**
 * Build the full toolset for `streamText()`, injecting the
 * authenticated ToolContext into each tool's execute function.
 */
function wrapExecute<I, O>(
  name: string,
  fn: (input: I, ctx: ToolContext) => Promise<O>,
  ctx: ToolContext,
): (input: I) => Promise<O> {
  return async (input: I) => {
    try {
      return await fn(input, ctx);
    } catch (error) {
      console.error(`[copilot] tool ${name} failed:`, error instanceof Error ? error.message : error);
      throw error;
    }
  };
}

export function buildToolset(ctx: ToolContext) {
  return {
    buscar_gastos_por_periodo: tool({
      description:
        'Busca gastos (combustivel, pedagio, manutencao, etc) em um periodo. Retorna totais, subtotais por categoria e detalhes.',
      inputSchema: buscarGastosPorPeriodoSchema,
      execute: wrapExecute('buscar_gastos_por_periodo', executeBuscarGastosPorPeriodo, ctx),
    }),
    listar_caminhoes: tool({
      description:
        'Lista os caminhoes da frota com placa, modelo e apelido. Util para resolver placa/nome antes de outras consultas.',
      inputSchema: listarCaminhoesSchema,
      execute: wrapExecute('listar_caminhoes', executeListarCaminhoes, ctx),
    }),
    ranking_caminhoes_por_lucro: tool({
      description:
        'Ranking de caminhoes por lucro (receita de fretes menos gastos) em um periodo. Mostra qual deu mais lucro ou mais prejuizo.',
      inputSchema: rankingCaminhoesPorLucroSchema,
      execute: wrapExecute('ranking_caminhoes_por_lucro', executeRankingCaminhoesPorLucro, ctx),
    }),
    ranking_viagens_por_margem: tool({
      description:
        'Ranking de viagens por margem de lucro percentual em um periodo. Mostra quais viagens foram mais ou menos rentaveis.',
      inputSchema: rankingViagensPorMargemSchema,
      execute: wrapExecute('ranking_viagens_por_margem', executeRankingViagensPorMargem, ctx),
    }),
    motoristas_cnh_vencendo: tool({
      description:
        'Lista motoristas com CNH vencendo nos proximos N dias (default 30) ou ja vencida. Mostra nome, numero da CNH, categoria e dias ate vencer.',
      inputSchema: motoristasCnhVencendoSchema,
      execute: wrapExecute('motoristas_cnh_vencendo', executeMotoristasCnhVencendo, ctx),
    }),
    resumo_desempenho_periodo: tool({
      description:
        'Resumo geral de desempenho da frota em um periodo: total viagens, receita, gastos, lucro, top 3 categorias de gasto, melhor e pior viagem por valor.',
      inputSchema: resumoDesempenhoPeriodoSchema,
      execute: wrapExecute('resumo_desempenho_periodo', executeResumoDesempenhoPeriodo, ctx),
    }),
    ranking_motoristas_por_gasto: tool({
      description:
        'Ranking de motoristas por gasto total em um periodo. Filtravel por categoria (ex: Combustivel, Pneu, Manutencao). Mostra quem gasta mais ou menos, com litros quando aplicavel.',
      inputSchema: rankingMotoristasPorGastoSchema,
      execute: wrapExecute('ranking_motoristas_por_gasto', executeRankingMotoristasPorGasto, ctx),
    }),
    desempenho_motorista: tool({
      description:
        'Perfil completo de desempenho de um motorista em um periodo: receita gerada, gastos, lucro, km rodado, litros consumidos, km/L medio, top categorias de gasto. Busca por nome parcial ou ID.',
      inputSchema: desempenhoMotoristaSchema,
      execute: wrapExecute('desempenho_motorista', executeDesempenhoMotorista, ctx),
    }),
  };
}
