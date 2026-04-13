/**
 * Assistente FrotaViva — Tool T9: produtividade_frota.
 *
 * Retorna indicadores de produtividade da frota em um periodo:
 * viagens por motorista/caminhao, km rodados, ociosidade,
 * tempo medio de viagem, taxa de cancelamento, receita/km.
 *
 * Use cases:
 * - "Tem caminhao parado?"
 * - "Quantas viagens o Joao fez esse mes?"
 * - "Quantos km minha frota rodou?"
 * - "Quanto tempo leva uma viagem SP-RJ?"
 */

import { z } from 'zod';

import { parsePeriod } from '@/lib/copilot/utils/period';
import { MAX_TOOL_ROWS, ToolExecutionError } from '@/lib/copilot/tools/constants';
import type { ToolContext } from '@/lib/copilot/tools/constants';
import { calcularKmRealCaminhao } from '@/lib/utils/viagem-calc';
import type { ViagemParaGap } from '@/lib/utils/viagem-calc';

export const produtividadeFrotaSchema = z.object({
  periodo: z
    .string()
    .min(1)
    .describe(
      'Expressao em portugues: "este mes", "mes passado", "ultimos 3 meses", etc.',
    ),
  motorista_nome: z
    .string()
    .optional()
    .describe('Filtrar por motorista (nome parcial). Se omitido, retorna toda a frota.'),
  caminhao_placa: z
    .string()
    .optional()
    .describe('Filtrar por caminhao (placa). Se omitido, retorna toda a frota.'),
});

export type ProdutividadeFrotaInput = z.infer<typeof produtividadeFrotaSchema>;

export interface ProdutividadeFrotaResult {
  periodo: { start: string; end: string; label: string };
  resumo_frota: {
    total_viagens_concluidas: number;
    total_viagens_canceladas: number;
    taxa_cancelamento_percentual: number;
    km_total_rodado: number | null;
    receita_total_centavos: number;
    receita_por_km_centavos: number | null;
    taxa_vazio_percentual: number | null;
  };
  por_motorista: Array<{
    id: string;
    nome: string;
    viagens_concluidas: number;
    km_rodado: number | null;
    receita_centavos: number;
    tempo_medio_viagem_dias: number | null;
  }>;
  por_caminhao: Array<{
    id: string;
    placa: string;
    modelo: string;
    viagens_concluidas: number;
    km_rodado: number | null;
    receita_centavos: number;
    dias_parado: number | null;
    motorista_principal: string | null;
  }>;
}

interface ViagemRow {
  id: string;
  motorista_id: string;
  caminhao_id: string;
  valor_total: number;
  km_saida: number | null;
  km_chegada: number | null;
  data_saida: string;
  data_chegada_real: string | null;
  status: string;
}

interface MotoristaRow {
  id: string;
  nome: string;
}

interface CaminhaoRow {
  id: string;
  placa: string;
  modelo: string;
}

function diffDays(from: string, to: string): number {
  const a = new Date(from + 'T00:00:00Z');
  const b = new Date(to + 'T00:00:00Z');
  return Math.round((b.getTime() - a.getTime()) / (1000 * 60 * 60 * 24));
}

function todayIso(): string {
  return new Intl.DateTimeFormat('sv-SE', {
    timeZone: 'America/Sao_Paulo',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date());
}

export async function executeProdutividadeFrota(
  input: ProdutividadeFrotaInput,
  ctx: ToolContext,
): Promise<ProdutividadeFrotaResult> {
  try {
    const period = parsePeriod(input.periodo);
    const { supabase, empresaIds } = ctx;

    const emptyResult: ProdutividadeFrotaResult = {
      periodo: { start: period.startDate, end: period.endDate, label: period.label },
      resumo_frota: {
        total_viagens_concluidas: 0,
        total_viagens_canceladas: 0,
        taxa_cancelamento_percentual: 0,
        km_total_rodado: null,
        receita_total_centavos: 0,
        receita_por_km_centavos: null,
        taxa_vazio_percentual: null,
      },
      por_motorista: [],
      por_caminhao: [],
    };

    if (empresaIds.length === 0) return emptyResult;

    // Fetch viagens (all statuses for cancel rate), motoristas, caminhoes
    let viagemQuery = supabase
      .from('viagem')
      .select('id, motorista_id, caminhao_id, valor_total, km_saida, km_chegada, data_saida, data_chegada_real, status')
      .in('empresa_id', empresaIds)
      .gte('data_saida', period.startDate)
      .lte('data_saida', period.endDate);

    const motoristasPromise = supabase
      .from('motorista')
      .select('id, nome')
      .in('empresa_id', empresaIds)
      .eq('status', 'ativo');

    const caminhoesPromise = supabase
      .from('caminhao')
      .select('id, placa, modelo')
      .in('empresa_id', empresaIds);

    const [viagensResult, motoristasResult, caminhoesResult] = await Promise.all([
      viagemQuery,
      motoristasPromise,
      caminhoesPromise,
    ]);

    if (viagensResult.error) {
      throw new ToolExecutionError('produtividade_frota', `Falha ao carregar viagens: ${viagensResult.error.message}`, {});
    }
    if (motoristasResult.error) {
      throw new ToolExecutionError('produtividade_frota', `Falha ao carregar motoristas: ${motoristasResult.error.message}`, {});
    }
    if (caminhoesResult.error) {
      throw new ToolExecutionError('produtividade_frota', `Falha ao carregar caminhoes: ${caminhoesResult.error.message}`, {});
    }

    let viagens = (viagensResult.data ?? []) as ViagemRow[];
    const motoristas = (motoristasResult.data ?? []) as MotoristaRow[];
    const caminhoes = (caminhoesResult.data ?? []) as CaminhaoRow[];

    // Lookups
    const motoristaLookup = new Map<string, string>();
    for (const m of motoristas) motoristaLookup.set(m.id, m.nome);

    const caminhaoLookup = new Map<string, CaminhaoRow>();
    for (const c of caminhoes) caminhaoLookup.set(c.id, c);

    // Filter by motorista/caminhao if requested
    if (input.motorista_nome) {
      const needle = input.motorista_nome.toLocaleLowerCase('pt-BR');
      const matchedIds = motoristas
        .filter((m) => m.nome.toLocaleLowerCase('pt-BR').includes(needle))
        .map((m) => m.id);
      viagens = viagens.filter((v) => matchedIds.includes(v.motorista_id));
    }
    if (input.caminhao_placa) {
      const needle = input.caminhao_placa.toUpperCase().replace(/[^A-Z0-9]/g, '');
      const matchedIds = caminhoes
        .filter((c) => c.placa.replace(/[^A-Z0-9]/g, '').includes(needle))
        .map((c) => c.id);
      viagens = viagens.filter((v) => matchedIds.includes(v.caminhao_id));
    }

    // Split by status
    const concluidas = viagens.filter((v) => v.status === 'concluida');
    const canceladas = viagens.filter((v) => v.status === 'cancelada');
    const totalViagens = viagens.length;

    // Story 20.1: Group viagens by caminhao for gap-aware km calculation
    let receitaTotal = 0;
    const camViagensProd = new Map<string, ViagemParaGap[]>();

    for (const v of concluidas) {
      receitaTotal += v.valor_total;
      if (!camViagensProd.has(v.caminhao_id)) camViagensProd.set(v.caminhao_id, []);
      camViagensProd.get(v.caminhao_id)!.push({ id: v.id, km_saida: v.km_saida, km_chegada: v.km_chegada });
    }

    let kmTotal = 0;
    let kmValido = false;
    let taxaVazioSum = 0;
    let camComKmCount = 0;
    for (const viagensCam of camViagensProd.values()) {
      const kmReal = calcularKmRealCaminhao(viagensCam);
      if (kmReal.total_km > 0) {
        kmTotal += kmReal.total_km;
        kmValido = true;
        taxaVazioSum += kmReal.taxa_vazio_pct;
        camComKmCount++;
      }
    }
    const taxaVazioMedia = camComKmCount > 0
      ? Math.round((taxaVazioSum / camComKmCount) * 100) / 100
      : null;

    // Por motorista
    const motAgg = new Map<string, { viagens: number; km: number; kmValido: boolean; receita: number; diasViagem: number[]; }>();
    for (const v of concluidas) {
      const agg = motAgg.get(v.motorista_id) ?? { viagens: 0, km: 0, kmValido: false, receita: 0, diasViagem: [] };
      agg.viagens += 1;
      agg.receita += v.valor_total;
      if (v.km_saida != null && v.km_chegada != null && v.km_chegada > v.km_saida) {
        agg.km += v.km_chegada - v.km_saida;
        agg.kmValido = true;
      }
      if (v.data_chegada_real) {
        const dias = diffDays(v.data_saida, v.data_chegada_real);
        if (dias >= 0) agg.diasViagem.push(dias);
      }
      motAgg.set(v.motorista_id, agg);
    }

    const porMotorista = Array.from(motAgg.entries())
      .filter(([id]) => motoristaLookup.has(id))
      .map(([id, agg]) => ({
        id,
        nome: motoristaLookup.get(id) ?? 'desconhecido',
        viagens_concluidas: agg.viagens,
        km_rodado: agg.kmValido ? agg.km : null,
        receita_centavos: agg.receita,
        tempo_medio_viagem_dias: agg.diasViagem.length > 0
          ? Math.round((agg.diasViagem.reduce((a, b) => a + b, 0) / agg.diasViagem.length) * 10) / 10
          : null,
      }))
      .sort((a, b) => b.viagens_concluidas - a.viagens_concluidas)
      .slice(0, MAX_TOOL_ROWS);

    // Por caminhao (com ociosidade)
    const camAgg = new Map<string, { viagens: number; km: number; kmValido: boolean; receita: number; ultimaChegada: string | null; motoristas: Map<string, number>; }>();
    for (const v of concluidas) {
      const agg = camAgg.get(v.caminhao_id) ?? { viagens: 0, km: 0, kmValido: false, receita: 0, ultimaChegada: null, motoristas: new Map() };
      agg.viagens += 1;
      agg.receita += v.valor_total;
      if (v.km_saida != null && v.km_chegada != null && v.km_chegada > v.km_saida) {
        agg.km += v.km_chegada - v.km_saida;
        agg.kmValido = true;
      }
      if (v.data_chegada_real && (!agg.ultimaChegada || v.data_chegada_real > agg.ultimaChegada)) {
        agg.ultimaChegada = v.data_chegada_real;
      }
      agg.motoristas.set(v.motorista_id, (agg.motoristas.get(v.motorista_id) ?? 0) + 1);
      camAgg.set(v.caminhao_id, agg);
    }

    const hoje = todayIso();
    const porCaminhao = Array.from(camAgg.entries())
      .filter(([id]) => caminhaoLookup.has(id))
      .map(([id, agg]) => {
        const meta = caminhaoLookup.get(id);
        // Motorista principal
        let motPrincipal: string | null = null;
        let maxV = 0;
        for (const [motId, count] of agg.motoristas) {
          if (count > maxV) { maxV = count; motPrincipal = motoristaLookup.get(motId) ?? null; }
        }
        // Dias parado desde ultima chegada
        const diasParado = agg.ultimaChegada ? diffDays(agg.ultimaChegada, hoje) : null;

        return {
          id,
          placa: meta?.placa ?? 'desconhecida',
          modelo: meta?.modelo ?? 'desconhecido',
          viagens_concluidas: agg.viagens,
          km_rodado: agg.kmValido ? agg.km : null,
          receita_centavos: agg.receita,
          dias_parado: diasParado !== null && diasParado > 0 ? diasParado : null,
          motorista_principal: motPrincipal,
        };
      })
      .sort((a, b) => b.viagens_concluidas - a.viagens_concluidas)
      .slice(0, MAX_TOOL_ROWS);

    // Caminhoes sem nenhuma viagem no periodo (parados o periodo todo)
    for (const [id, meta] of caminhaoLookup) {
      if (!camAgg.has(id) && porCaminhao.length < MAX_TOOL_ROWS) {
        porCaminhao.push({
          id,
          placa: meta.placa,
          modelo: meta.modelo,
          viagens_concluidas: 0,
          km_rodado: null,
          receita_centavos: 0,
          dias_parado: diffDays(period.startDate, hoje),
          motorista_principal: null,
        });
      }
    }

    return {
      periodo: { start: period.startDate, end: period.endDate, label: period.label },
      resumo_frota: {
        total_viagens_concluidas: concluidas.length,
        total_viagens_canceladas: canceladas.length,
        taxa_cancelamento_percentual: totalViagens > 0
          ? Math.round((canceladas.length / totalViagens) * 10000) / 100
          : 0,
        km_total_rodado: kmValido ? kmTotal : null,
        receita_total_centavos: receitaTotal,
        receita_por_km_centavos: kmValido && kmTotal > 0
          ? Math.round(receitaTotal / kmTotal)
          : null,
        taxa_vazio_percentual: taxaVazioMedia,
      },
      por_motorista: porMotorista,
      por_caminhao: porCaminhao,
    };
  } catch (error) {
    if (error instanceof ToolExecutionError) throw error;
    throw new ToolExecutionError(
      'produtividade_frota',
      `Erro inesperado: ${error instanceof Error ? error.message : 'desconhecido'}`,
      { input },
    );
  }
}
