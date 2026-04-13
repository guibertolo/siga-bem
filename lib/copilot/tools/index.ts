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
import {
  produtividadeFrotaSchema,
  executeProdutividadeFrota,
} from '@/lib/copilot/tools/produtividade-frota';
import {
  fechamentosPendentesSchema,
  executeFechamentosPendentes,
} from '@/lib/copilot/tools/fechamentos-pendentes';
import {
  custoPorKmSchema,
  executeCustoPorKm,
} from '@/lib/copilot/tools/custo-por-km';
import {
  comparativoTemporalSchema,
  executeComparativoTemporal,
} from '@/lib/copilot/tools/comparativo-temporal';
import {
  rentabilidadeRotaSchema,
  executeRentabilidadeRota,
} from '@/lib/copilot/tools/rentabilidade-rota';

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
      description: 'Gastos por periodo e categoria.',
      inputSchema: buscarGastosPorPeriodoSchema,
      execute: wrapExecute('buscar_gastos_por_periodo', executeBuscarGastosPorPeriodo, ctx),
    }),
    listar_caminhoes: tool({
      description: 'Lista caminhoes da frota (placa, modelo).',
      inputSchema: listarCaminhoesSchema,
      execute: wrapExecute('listar_caminhoes', executeListarCaminhoes, ctx),
    }),
    ranking_caminhoes_por_lucro: tool({
      description: 'Ranking caminhoes por lucro/prejuizo no periodo.',
      inputSchema: rankingCaminhoesPorLucroSchema,
      execute: wrapExecute('ranking_caminhoes_por_lucro', executeRankingCaminhoesPorLucro, ctx),
    }),
    ranking_viagens_por_margem: tool({
      description: 'Ranking viagens por margem de lucro no periodo.',
      inputSchema: rankingViagensPorMargemSchema,
      execute: wrapExecute('ranking_viagens_por_margem', executeRankingViagensPorMargem, ctx),
    }),
    motoristas_cnh_vencendo: tool({
      description: 'Motoristas com CNH vencendo ou vencida.',
      inputSchema: motoristasCnhVencendoSchema,
      execute: wrapExecute('motoristas_cnh_vencendo', executeMotoristasCnhVencendo, ctx),
    }),
    resumo_desempenho_periodo: tool({
      description: 'Resumo da frota: viagens, receita, gastos, lucro, top categorias.',
      inputSchema: resumoDesempenhoPeriodoSchema,
      execute: wrapExecute('resumo_desempenho_periodo', executeResumoDesempenhoPeriodo, ctx),
    }),
    ranking_motoristas_por_gasto: tool({
      description: 'Ranking motoristas por gasto. Filtra por categoria (Combustivel, Pneu, etc). Inclui km/L e R$/km.',
      inputSchema: rankingMotoristasPorGastoSchema,
      execute: wrapExecute('ranking_motoristas_por_gasto', executeRankingMotoristasPorGasto, ctx),
    }),
    desempenho_motorista: tool({
      description: 'Perfil de um motorista: receita, gastos, lucro, km, km/L. Busca por nome.',
      inputSchema: desempenhoMotoristaSchema,
      execute: wrapExecute('desempenho_motorista', executeDesempenhoMotorista, ctx),
    }),
    produtividade_frota: tool({
      description: 'Produtividade: viagens, km, caminhao parado, cancelamentos, receita/km.',
      inputSchema: produtividadeFrotaSchema,
      execute: wrapExecute('produtividade_frota', executeProdutividadeFrota, ctx),
    }),
    fechamentos_pendentes: tool({
      description: 'Acertos pendentes: quanto devo pro motorista, saldo.',
      inputSchema: fechamentosPendentesSchema,
      execute: wrapExecute('fechamentos_pendentes', executeFechamentosPendentes, ctx),
    }),
    custo_por_km: tool({
      description: 'Custo por km (CPK): gasto/km, receita/km, margem/km. Por caminhao e categoria.',
      inputSchema: custoPorKmSchema,
      execute: wrapExecute('custo_por_km', executeCustoPorKm, ctx),
    }),
    comparativo_temporal: tool({
      description: 'Compara dois periodos: receita, gastos, lucro, margem, viagens, km/L, variacao %. Use para "subiu ou caiu", "esse mes vs mes passado", "como ta comparado".',
      inputSchema: comparativoTemporalSchema,
      execute: wrapExecute('comparativo_temporal', executeComparativoTemporal, ctx),
    }),
    rentabilidade_por_rota: tool({
      description: 'Rentabilidade por rota (origem->destino): lucro, margem, frete medio, km. Use para "qual rota compensa", "trajeto mais lucrativo", "rentabilidade por rota".',
      inputSchema: rentabilidadeRotaSchema,
      execute: wrapExecute('rentabilidade_por_rota', executeRentabilidadeRota, ctx),
    }),
  };
}
