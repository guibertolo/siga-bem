/**
 * Assistente FrotaViva — Tool T8b: custo_por_km (CPK).
 *
 * Calcula o custo por km rodado (CPK) da frota, por caminhao ou por categoria.
 * CPK e o indicador mais completo de eficiencia operacional.
 *
 * Use cases:
 * - "Quanto me custa cada km que rodo?"
 * - "Qual o custo por km de diesel?"
 * - "Qual caminhao tem o maior custo por km?"
 * - "Qual o frete minimo pra eu nao ter prejuizo nessa rota?"
 */

import { z } from 'zod';

import { parsePeriod } from '@/lib/copilot/utils/period';
import { MAX_TOOL_ROWS, ToolExecutionError } from '@/lib/copilot/tools/constants';
import type { ToolContext } from '@/lib/copilot/tools/constants';

export const custoPorKmSchema = z.object({
  periodo: z
    .string()
    .min(1)
    .describe(
      'Expressao em portugues: "este mes", "mes passado", "ultimos 3 meses", etc.',
    ),
  por_caminhao: z
    .boolean()
    .optional()
    .describe('Se true, retorna CPK por caminhao. Se false (default), retorna CPK geral da frota.'),
  por_categoria: z
    .boolean()
    .optional()
    .describe('Se true, retorna CPK detalhado por categoria de gasto (combustivel, pneu, etc).'),
});

export type CustoPorKmInput = z.infer<typeof custoPorKmSchema>;

export interface CustoPorKmResult {
  periodo: { start: string; end: string; label: string };
  frota: {
    km_total: number | null;
    gasto_total_centavos: number;
    receita_total_centavos: number;
    cpk_centavos: number | null;
    receita_por_km_centavos: number | null;
    margem_por_km_centavos: number | null;
  };
  por_categoria: Array<{
    categoria: string;
    total_centavos: number;
    cpk_centavos: number | null;
    percentual_do_total: number;
  }> | null;
  por_caminhao: Array<{
    id: string;
    placa: string;
    modelo: string;
    km_rodado: number | null;
    gasto_centavos: number;
    cpk_centavos: number | null;
    motorista_principal: string | null;
  }> | null;
}

interface ViagemRow {
  caminhao_id: string;
  motorista_id: string;
  valor_total: number;
  km_saida: number | null;
  km_chegada: number | null;
}

interface GastoRow {
  caminhao_id: string | null;
  categoria_id: string | null;
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

interface CategoriaRow {
  id: string;
  nome: string;
}

export async function executeCustoPorKm(
  input: CustoPorKmInput,
  ctx: ToolContext,
): Promise<CustoPorKmResult> {
  try {
    const period = parsePeriod(input.periodo);
    const { supabase, empresaIds } = ctx;

    if (empresaIds.length === 0) {
      return {
        periodo: { start: period.startDate, end: period.endDate, label: period.label },
        frota: { km_total: null, gasto_total_centavos: 0, receita_total_centavos: 0, cpk_centavos: null, receita_por_km_centavos: null, margem_por_km_centavos: null },
        por_categoria: null,
        por_caminhao: null,
      };
    }

    // Parallel fetch
    const viagensPromise = supabase
      .from('viagem')
      .select('caminhao_id, motorista_id, valor_total, km_saida, km_chegada')
      .in('empresa_id', empresaIds)
      .gte('data_saida', period.startDate)
      .lte('data_saida', period.endDate)
      .neq('status', 'cancelada');

    const gastosPromise = supabase
      .from('gasto')
      .select('caminhao_id, categoria_id, valor')
      .in('empresa_id', empresaIds)
      .gte('data', period.startDate)
      .lte('data', period.endDate);

    const categoriasPromise = supabase
      .from('categoria_gasto')
      .select('id, nome')
      .order('nome');

    const caminhoesPromise = supabase
      .from('caminhao')
      .select('id, placa, modelo')
      .in('empresa_id', empresaIds);

    const motoristasPromise = supabase
      .from('motorista')
      .select('id, nome')
      .in('empresa_id', empresaIds);

    const [viagensResult, gastosResult, categoriasResult, caminhoesResult, motoristasResult] =
      await Promise.all([viagensPromise, gastosPromise, categoriasPromise, caminhoesPromise, motoristasPromise]);

    if (viagensResult.error) throw new ToolExecutionError('custo_por_km', `Falha viagens: ${viagensResult.error.message}`, {});
    if (gastosResult.error) throw new ToolExecutionError('custo_por_km', `Falha gastos: ${gastosResult.error.message}`, {});
    if (categoriasResult.error) throw new ToolExecutionError('custo_por_km', `Falha categorias: ${categoriasResult.error.message}`, {});
    if (caminhoesResult.error) throw new ToolExecutionError('custo_por_km', `Falha caminhoes: ${caminhoesResult.error.message}`, {});
    if (motoristasResult.error) throw new ToolExecutionError('custo_por_km', `Falha motoristas: ${motoristasResult.error.message}`, {});

    const viagens = (viagensResult.data ?? []) as ViagemRow[];
    const gastos = (gastosResult.data ?? []) as GastoRow[];
    const categorias = (categoriasResult.data ?? []) as CategoriaRow[];
    const caminhoesList = (caminhoesResult.data ?? []) as CaminhaoRow[];
    const motoristasList = (motoristasResult.data ?? []) as MotoristaRow[];

    // Lookups
    const catLookup = new Map<string, string>();
    for (const c of categorias) catLookup.set(c.id, c.nome);
    const camLookup = new Map<string, CaminhaoRow>();
    for (const c of caminhoesList) camLookup.set(c.id, c);
    const motLookup = new Map<string, string>();
    for (const m of motoristasList) motLookup.set(m.id, m.nome);

    // Frota totals
    let kmTotal = 0;
    let kmValido = false;
    let receitaTotal = 0;
    let gastoTotal = 0;

    // Per caminhao aggregation
    const camKm = new Map<string, number>();
    const camGasto = new Map<string, number>();
    const camMotoristas = new Map<string, Map<string, number>>();

    for (const v of viagens) {
      receitaTotal += v.valor_total;
      if (v.km_saida != null && v.km_chegada != null && v.km_chegada > v.km_saida) {
        const km = v.km_chegada - v.km_saida;
        kmTotal += km;
        kmValido = true;
        camKm.set(v.caminhao_id, (camKm.get(v.caminhao_id) ?? 0) + km);
      }
      // Track motorista per caminhao
      if (!camMotoristas.has(v.caminhao_id)) camMotoristas.set(v.caminhao_id, new Map());
      const mots = camMotoristas.get(v.caminhao_id)!;
      mots.set(v.motorista_id, (mots.get(v.motorista_id) ?? 0) + 1);
    }

    // Per categoria aggregation
    const catTotals = new Map<string, number>();
    for (const g of gastos) {
      gastoTotal += g.valor;
      if (g.caminhao_id) {
        camGasto.set(g.caminhao_id, (camGasto.get(g.caminhao_id) ?? 0) + g.valor);
      }
      const catName = g.categoria_id ? (catLookup.get(g.categoria_id) ?? 'Sem categoria') : 'Sem categoria';
      catTotals.set(catName, (catTotals.get(catName) ?? 0) + g.valor);
    }

    // Build results
    const porCategoria = input.por_categoria ? Array.from(catTotals.entries())
      .map(([categoria, total]) => ({
        categoria,
        total_centavos: total,
        cpk_centavos: kmValido && kmTotal > 0 ? Math.round(total / kmTotal) : null,
        percentual_do_total: gastoTotal > 0 ? Math.round((total / gastoTotal) * 10000) / 100 : 0,
      }))
      .sort((a, b) => b.total_centavos - a.total_centavos) : null;

    const porCaminhao = input.por_caminhao ? Array.from(new Set([...camKm.keys(), ...camGasto.keys()]))
      .filter((id) => camLookup.has(id))
      .map((id) => {
        const meta = camLookup.get(id)!;
        const km = camKm.get(id) ?? 0;
        const gasto = camGasto.get(id) ?? 0;
        // Motorista principal
        let motPrincipal: string | null = null;
        const mots = camMotoristas.get(id);
        if (mots) {
          let maxV = 0;
          for (const [mId, count] of mots) {
            if (count > maxV) { maxV = count; motPrincipal = motLookup.get(mId) ?? null; }
          }
        }
        return {
          id,
          placa: meta.placa,
          modelo: meta.modelo,
          km_rodado: km > 0 ? km : null,
          gasto_centavos: gasto,
          cpk_centavos: km > 0 ? Math.round(gasto / km) : null,
          motorista_principal: motPrincipal,
        };
      })
      .sort((a, b) => (b.cpk_centavos ?? 0) - (a.cpk_centavos ?? 0))
      .slice(0, MAX_TOOL_ROWS) : null;

    return {
      periodo: { start: period.startDate, end: period.endDate, label: period.label },
      frota: {
        km_total: kmValido ? kmTotal : null,
        gasto_total_centavos: gastoTotal,
        receita_total_centavos: receitaTotal,
        cpk_centavos: kmValido && kmTotal > 0 ? Math.round(gastoTotal / kmTotal) : null,
        receita_por_km_centavos: kmValido && kmTotal > 0 ? Math.round(receitaTotal / kmTotal) : null,
        margem_por_km_centavos: kmValido && kmTotal > 0 ? Math.round((receitaTotal - gastoTotal) / kmTotal) : null,
      },
      por_categoria: porCategoria,
      por_caminhao: porCaminhao,
    };
  } catch (error) {
    if (error instanceof ToolExecutionError) throw error;
    throw new ToolExecutionError(
      'custo_por_km',
      `Erro inesperado: ${error instanceof Error ? error.message : 'desconhecido'}`,
      { input },
    );
  }
}
