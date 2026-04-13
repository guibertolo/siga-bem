/**
 * Assistente FrotaViva — Tool T8: desempenho_motorista.
 *
 * Returns a complete performance profile for a single motorista:
 * receita gerada, gastos, lucro, km rodado, litros consumidos,
 * km/L medio, top categorias de gasto.
 *
 * Use cases:
 * - "Como esta o desempenho do Joao?"
 * - "Quanto o Carlos gerou de receita esse mes?"
 * - "Qual o consumo do Pedro?"
 */

import { z } from 'zod';

import { parsePeriod } from '@/lib/copilot/utils/period';
import { ToolExecutionError } from '@/lib/copilot/tools/constants';
import type { ToolContext } from '@/lib/copilot/tools/constants';

export const desempenhoMotoristaSchema = z.object({
  motorista_nome: z
    .string()
    .optional()
    .describe('Nome (parcial) do motorista. Case-insensitive. Se omitido, usa motorista_id.'),
  motorista_id: z
    .string()
    .uuid()
    .optional()
    .describe('ID do motorista. Se omitido, busca por nome.'),
  periodo: z
    .string()
    .min(1)
    .describe(
      'Expressao em portugues: "este mes", "mes passado", "ultimos 30 dias", etc.',
    ),
});

export type DesempenhoMotoristaInput = z.infer<typeof desempenhoMotoristaSchema>;

export interface DesempenhoMotoristaResult {
  periodo: { start: string; end: string; label: string };
  motorista: {
    id: string;
    nome: string;
  };
  receita_centavos: number;
  qtd_viagens: number;
  km_rodado: number | null;
  gasto_total_centavos: number;
  lucro_centavos: number;
  litros_total: number | null;
  km_por_litro: number | null;
  top_categorias_gasto: Array<{ nome: string; total_centavos: number; qtd: number }>;
}

interface MotoristaRow {
  id: string;
  nome: string;
}

interface ViagemRow {
  valor_total: number;
  km_saida: number | null;
  km_chegada: number | null;
}

interface GastoRow {
  valor: number;
  categoria_id: string | null;
  litros: number | null;
}

interface CategoriaRow {
  id: string;
  nome: string;
}

export async function executeDesempenhoMotorista(
  input: DesempenhoMotoristaInput,
  ctx: ToolContext,
): Promise<DesempenhoMotoristaResult> {
  try {
    const period = parsePeriod(input.periodo);
    const { supabase, empresaIds } = ctx;

    if (empresaIds.length === 0) {
      throw new ToolExecutionError(
        'desempenho_motorista',
        'Nenhuma empresa selecionada.',
        {},
      );
    }

    // 1. Resolve motorista
    let motoristaId = input.motorista_id ?? null;
    let motoristaNome = '';

    if (!motoristaId && input.motorista_nome) {
      const { data: motoristas, error } = await supabase
        .from('motorista')
        .select('id, nome')
        .in('empresa_id', empresaIds)
        .ilike('nome', `%${input.motorista_nome}%`)
        .eq('status', 'ativo')
        .limit(1);

      if (error) {
        throw new ToolExecutionError(
          'desempenho_motorista',
          `Falha ao buscar motorista: ${error.message}`,
          {},
        );
      }

      const found = (motoristas ?? []) as MotoristaRow[];
      if (found.length === 0) {
        throw new ToolExecutionError(
          'desempenho_motorista',
          `Motorista "${input.motorista_nome}" nao encontrado.`,
          {},
        );
      }
      motoristaId = found[0].id;
      motoristaNome = found[0].nome;
    } else if (motoristaId) {
      const { data, error } = await supabase
        .from('motorista')
        .select('id, nome')
        .eq('id', motoristaId)
        .in('empresa_id', empresaIds)
        .single();

      if (error || !data) {
        throw new ToolExecutionError(
          'desempenho_motorista',
          `Motorista nao encontrado.`,
          { motoristaId },
        );
      }
      motoristaNome = (data as MotoristaRow).nome;
    } else {
      throw new ToolExecutionError(
        'desempenho_motorista',
        'Informe o nome ou id do motorista.',
        {},
      );
    }

    // 2. Fetch viagens, gastos, categorias in parallel
    const viagensPromise = supabase
      .from('viagem')
      .select('valor_total, km_saida, km_chegada')
      .eq('motorista_id', motoristaId)
      .in('empresa_id', empresaIds)
      .gte('data_saida', period.startDate)
      .lte('data_saida', period.endDate)
      .neq('status', 'cancelada');

    const gastosPromise = supabase
      .from('gasto')
      .select('valor, categoria_id, litros')
      .eq('motorista_id', motoristaId)
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
        'desempenho_motorista',
        `Falha ao carregar viagens: ${viagensResult.error.message}`,
        {},
      );
    }
    if (gastosResult.error) {
      throw new ToolExecutionError(
        'desempenho_motorista',
        `Falha ao carregar gastos: ${gastosResult.error.message}`,
        {},
      );
    }
    if (categoriasResult.error) {
      throw new ToolExecutionError(
        'desempenho_motorista',
        `Falha ao carregar categorias: ${categoriasResult.error.message}`,
        {},
      );
    }

    const viagens = (viagensResult.data ?? []) as ViagemRow[];
    const gastos = (gastosResult.data ?? []) as GastoRow[];
    const categorias = (categoriasResult.data ?? []) as CategoriaRow[];

    // 3. Aggregate viagens
    let receita = 0;
    let kmTotal = 0;
    let kmValido = false;

    for (const v of viagens) {
      receita += v.valor_total;
      if (v.km_saida != null && v.km_chegada != null && v.km_chegada > v.km_saida) {
        kmTotal += v.km_chegada - v.km_saida;
        kmValido = true;
      }
    }

    // 4. Aggregate gastos by categoria
    const categoriaLookup = new Map<string, string>();
    for (const cat of categorias) {
      categoriaLookup.set(cat.id, cat.nome);
    }

    let gastoTotal = 0;
    let litrosTotal = 0;
    const byCategoria = new Map<string, { total: number; qtd: number }>();

    for (const g of gastos) {
      gastoTotal += g.valor;
      litrosTotal += g.litros ?? 0;
      const catName = g.categoria_id
        ? (categoriaLookup.get(g.categoria_id) ?? 'Sem categoria')
        : 'Sem categoria';
      const existing = byCategoria.get(catName);
      if (existing) {
        existing.total += g.valor;
        existing.qtd += 1;
      } else {
        byCategoria.set(catName, { total: g.valor, qtd: 1 });
      }
    }

    const topCategorias = Array.from(byCategoria.entries())
      .map(([nome, agg]) => ({ nome, total_centavos: agg.total, qtd: agg.qtd }))
      .sort((a, b) => b.total_centavos - a.total_centavos)
      .slice(0, 5);

    // 5. Compute km/L
    let kmPorLitro: number | null = null;
    if (kmValido && litrosTotal > 0) {
      kmPorLitro = Math.round((kmTotal / litrosTotal) * 100) / 100;
    }

    return {
      periodo: { start: period.startDate, end: period.endDate, label: period.label },
      motorista: { id: motoristaId, nome: motoristaNome },
      receita_centavos: receita,
      qtd_viagens: viagens.length,
      km_rodado: kmValido ? kmTotal : null,
      gasto_total_centavos: gastoTotal,
      lucro_centavos: receita - gastoTotal,
      litros_total: litrosTotal > 0 ? litrosTotal : null,
      km_por_litro: kmPorLitro,
      top_categorias_gasto: topCategorias,
    };
  } catch (error) {
    if (error instanceof ToolExecutionError) throw error;
    throw new ToolExecutionError(
      'desempenho_motorista',
      `Erro inesperado: ${error instanceof Error ? error.message : 'desconhecido'}`,
      { input },
    );
  }
}
