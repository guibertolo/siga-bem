/**
 * Multi-empresa BI actions — admin client versions that accept
 * (admin, empresaId) and filter by empresa_id explicitly.
 *
 * These bypass RLS, so ownership MUST be validated by the caller
 * (queryMultiEmpresa validates via getMultiEmpresaContext).
 */

import type { SupabaseClient } from '@supabase/supabase-js';
import { singleRelation } from '@/lib/utils/supabase-types';
import type {
  BIFiltros,
  BIKpis,
  BICategoriaItem,
  BIRankingCaminhaoItem,
  BIEficienciaItem,
  BIEficienciaMotoristaItem,
  BIManutencaoTruckItem,
  BIManutencaoTipoItem,
  BITendenciaMensalItem,
  BIFilterOptions,
  BIMargemMotoristaItem,
  BIAlerta,
} from '@/types/bi';

// ---------------------------------------------------------------------------
// Filter options
// ---------------------------------------------------------------------------

export async function getBIFilterOptionsForEmpresa(
  admin: SupabaseClient,
  empresaId: string,
): Promise<{ data: BIFilterOptions | null; error: string | null }> {
  try {
    const [camRes, motRes, catRes] = await Promise.all([
      admin
        .from('caminhao')
        .select('id, placa, modelo')
        .eq('empresa_id', empresaId)
        .eq('ativo', true)
        .order('placa'),
      admin
        .from('motorista')
        .select('id, nome')
        .eq('empresa_id', empresaId)
        .eq('status', 'ativo')
        .order('nome'),
      admin
        .from('categoria_gasto')
        .select('id, nome, icone, cor')
        .or(`empresa_id.is.null,empresa_id.eq.${empresaId}`)
        .eq('ativa', true)
        .order('ordem'),
    ]);

    return {
      data: {
        caminhoes: camRes.data ?? [],
        motoristas: motRes.data ?? [],
        categorias: catRes.data ?? [],
      },
      error: null,
    };
  } catch (err) {
    return { data: null, error: err instanceof Error ? err.message : 'Erro' };
  }
}

// ---------------------------------------------------------------------------
// KPIs
// ---------------------------------------------------------------------------

export async function getBIKpisForEmpresa(
  admin: SupabaseClient,
  empresaId: string,
  filtros: BIFiltros,
): Promise<{ data: BIKpis | null; error: string | null }> {
  try {
    let viagemQuery = admin
      .from('viagem')
      .select('id, valor_total')
      .eq('empresa_id', empresaId)
      .eq('status', 'concluida')
      .gte('data_saida', filtros.periodoInicio)
      .lte('data_saida', filtros.periodoFim);

    if (filtros.caminhaoId) viagemQuery = viagemQuery.eq('caminhao_id', filtros.caminhaoId);
    if (filtros.motoristaId) viagemQuery = viagemQuery.eq('motorista_id', filtros.motoristaId);

    let gastoQuery = admin
      .from('gasto')
      .select('valor, viagem_id')
      .eq('empresa_id', empresaId)
      .gte('data', filtros.periodoInicio)
      .lte('data', filtros.periodoFim);

    if (filtros.caminhaoId) gastoQuery = gastoQuery.eq('caminhao_id', filtros.caminhaoId);
    if (filtros.motoristaId) gastoQuery = gastoQuery.eq('motorista_id', filtros.motoristaId);
    if (filtros.categoriaId) gastoQuery = gastoQuery.eq('categoria_id', filtros.categoriaId);

    const [viagemRes, gastoRes] = await Promise.all([viagemQuery, gastoQuery]);

    if (viagemRes.error) throw new Error(viagemRes.error.message);
    if (gastoRes.error) throw new Error(gastoRes.error.message);

    const viagens = viagemRes.data ?? [];
    const gastos = gastoRes.data ?? [];

    const receitaFrete = viagens.reduce((sum, v) => sum + (v.valor_total ?? 0), 0);
    const viagensConcluidas = viagens.length;
    const custoTotal = gastos.reduce((sum, g) => sum + g.valor, 0);
    const lucroBruto = receitaFrete - custoTotal;
    const margemPercentual = receitaFrete > 0
      ? Math.round((lucroBruto / receitaFrete) * 10000) / 100
      : 0;

    const gastosPorViagem = new Map<string, number>();
    for (const g of gastos) {
      if (g.viagem_id) {
        gastosPorViagem.set(g.viagem_id, (gastosPorViagem.get(g.viagem_id) ?? 0) + g.valor);
      }
    }

    let somaMargens = 0;
    let somaMargensPct = 0;
    let viagensComMargem = 0;

    for (const v of viagens) {
      const frete = v.valor_total ?? 0;
      const custo = gastosPorViagem.get(v.id) ?? 0;
      somaMargens += frete - custo;
      if (frete > 0) somaMargensPct += ((frete - custo) / frete) * 100;
      viagensComMargem += 1;
    }

    const margemMediaViagem = viagensComMargem > 0 ? Math.round(somaMargens / viagensComMargem) : 0;
    const margemMediaPercentual = viagensComMargem > 0
      ? Math.round((somaMargensPct / viagensComMargem) * 100) / 100
      : 0;

    return {
      data: {
        receitaFrete,
        custoTotal,
        lucroBruto,
        margemPercentual,
        viagensConcluidas,
        margemMediaViagem,
        margemMediaPercentual,
      },
      error: null,
    };
  } catch (err) {
    return { data: null, error: err instanceof Error ? err.message : 'Erro' };
  }
}

// ---------------------------------------------------------------------------
// Margem por Motorista
// ---------------------------------------------------------------------------

export async function getBIMargemMotoristasForEmpresa(
  admin: SupabaseClient,
  empresaId: string,
  filtros: BIFiltros,
): Promise<{ data: BIMargemMotoristaItem[] | null; error: string | null }> {
  try {
    let viagemQuery = admin
      .from('viagem')
      .select('id, valor_total, motorista_id, motorista:motorista_id (nome)')
      .eq('empresa_id', empresaId)
      .eq('status', 'concluida')
      .not('motorista_id', 'is', null)
      .gte('data_saida', filtros.periodoInicio)
      .lte('data_saida', filtros.periodoFim);

    if (filtros.caminhaoId) viagemQuery = viagemQuery.eq('caminhao_id', filtros.caminhaoId);
    if (filtros.motoristaId) viagemQuery = viagemQuery.eq('motorista_id', filtros.motoristaId);

    let gastoQuery = admin
      .from('gasto')
      .select('valor, viagem_id')
      .eq('empresa_id', empresaId)
      .not('viagem_id', 'is', null)
      .gte('data', filtros.periodoInicio)
      .lte('data', filtros.periodoFim);

    if (filtros.caminhaoId) gastoQuery = gastoQuery.eq('caminhao_id', filtros.caminhaoId);
    if (filtros.motoristaId) gastoQuery = gastoQuery.eq('motorista_id', filtros.motoristaId);
    if (filtros.categoriaId) gastoQuery = gastoQuery.eq('categoria_id', filtros.categoriaId);

    const [viagemRes, gastoRes] = await Promise.all([viagemQuery, gastoQuery]);

    if (viagemRes.error) throw new Error(viagemRes.error.message);
    if (gastoRes.error) throw new Error(gastoRes.error.message);

    const viagens = viagemRes.data ?? [];
    const gastos = gastoRes.data ?? [];

    const gastosPorViagem = new Map<string, number>();
    for (const g of gastos) {
      if (g.viagem_id) {
        gastosPorViagem.set(g.viagem_id, (gastosPorViagem.get(g.viagem_id) ?? 0) + g.valor);
      }
    }

    const byMotorista = new Map<string, {
      motoristaId: string;
      nome: string;
      viagensConcluidas: number;
      receitaCentavos: number;
      custoCentavos: number;
    }>();

    for (const v of viagens) {
      const motId = v.motorista_id!;
      const mot = singleRelation<{ nome: string }>(v.motorista);
      const frete = v.valor_total ?? 0;
      const custo = gastosPorViagem.get(v.id) ?? 0;

      const existing = byMotorista.get(motId);
      if (existing) {
        existing.viagensConcluidas += 1;
        existing.receitaCentavos += frete;
        existing.custoCentavos += custo;
      } else {
        byMotorista.set(motId, {
          motoristaId: motId,
          nome: mot?.nome ?? 'Desconhecido',
          viagensConcluidas: 1,
          receitaCentavos: frete,
          custoCentavos: custo,
        });
      }
    }

    const items: BIMargemMotoristaItem[] = Array.from(byMotorista.values())
      .map((m) => {
        const margem = m.receitaCentavos - m.custoCentavos;
        const pct = m.receitaCentavos > 0
          ? Math.round((margem / m.receitaCentavos) * 10000) / 100
          : 0;
        return { ...m, margemCentavos: margem, margemPercentual: pct };
      })
      .sort((a, b) => b.margemCentavos - a.margemCentavos);

    return { data: items, error: null };
  } catch (err) {
    return { data: null, error: err instanceof Error ? err.message : 'Erro' };
  }
}

// ---------------------------------------------------------------------------
// Categories breakdown
// ---------------------------------------------------------------------------

export async function getBICategoriasBreakdownForEmpresa(
  admin: SupabaseClient,
  empresaId: string,
  filtros: BIFiltros,
): Promise<{ data: BICategoriaItem[] | null; error: string | null }> {
  try {
    let query = admin
      .from('gasto')
      .select('valor, categoria_id, categoria_gasto (id, nome, icone, cor)')
      .eq('empresa_id', empresaId)
      .gte('data', filtros.periodoInicio)
      .lte('data', filtros.periodoFim);

    if (filtros.caminhaoId) query = query.eq('caminhao_id', filtros.caminhaoId);
    if (filtros.motoristaId) query = query.eq('motorista_id', filtros.motoristaId);
    if (filtros.categoriaId) query = query.eq('categoria_id', filtros.categoriaId);

    const { data: gastos, error } = await query;
    if (error) throw new Error(error.message);

    const byCategory = new Map<string, {
      categoriaId: string;
      categoriaNome: string;
      categoriaIcone: string | null;
      categoriaCor: string | null;
      total: number;
      qtdLancamentos: number;
    }>();

    const totalGeral = (gastos ?? []).reduce((sum, g) => sum + g.valor, 0);

    for (const gasto of gastos ?? []) {
      const cat = singleRelation<{
        id: string; nome: string; icone: string | null; cor: string | null;
      }>(gasto.categoria_gasto);
      const catId = cat?.id ?? gasto.categoria_id;
      const existing = byCategory.get(catId);

      if (existing) {
        existing.total += gasto.valor;
        existing.qtdLancamentos += 1;
      } else {
        byCategory.set(catId, {
          categoriaId: catId,
          categoriaNome: cat?.nome ?? 'Sem categoria',
          categoriaIcone: cat?.icone ?? null,
          categoriaCor: cat?.cor ?? null,
          total: gasto.valor,
          qtdLancamentos: 1,
        });
      }
    }

    const items: BICategoriaItem[] = Array.from(byCategory.values())
      .map((cat) => ({ ...cat, porcentagem: totalGeral > 0 ? (cat.total / totalGeral) * 100 : 0 }))
      .sort((a, b) => b.total - a.total);

    return { data: items, error: null };
  } catch (err) {
    return { data: null, error: err instanceof Error ? err.message : 'Erro' };
  }
}

// ---------------------------------------------------------------------------
// Ranking Caminhoes
// ---------------------------------------------------------------------------

export async function getBIRankingCaminhoesForEmpresa(
  admin: SupabaseClient,
  empresaId: string,
  filtros: BIFiltros,
): Promise<{ data: BIRankingCaminhaoItem[] | null; error: string | null }> {
  try {
    let query = admin
      .from('gasto')
      .select('valor, caminhao_id, caminhao (placa, modelo)')
      .eq('empresa_id', empresaId)
      .gte('data', filtros.periodoInicio)
      .lte('data', filtros.periodoFim)
      .not('caminhao_id', 'is', null);

    if (filtros.caminhaoId) query = query.eq('caminhao_id', filtros.caminhaoId);
    if (filtros.motoristaId) query = query.eq('motorista_id', filtros.motoristaId);
    if (filtros.categoriaId) query = query.eq('categoria_id', filtros.categoriaId);

    const { data: gastos, error } = await query;
    if (error) throw new Error(error.message);

    const byTruck = new Map<string, {
      caminhaoId: string; placa: string; modelo: string;
      totalGasto: number; qtdLancamentos: number;
    }>();

    const totalGeral = (gastos ?? []).reduce((sum, g) => sum + g.valor, 0);

    for (const gasto of gastos ?? []) {
      const cam = singleRelation<{ placa: string; modelo: string }>(gasto.caminhao);
      const camId = gasto.caminhao_id!;
      const existing = byTruck.get(camId);
      if (existing) {
        existing.totalGasto += gasto.valor;
        existing.qtdLancamentos += 1;
      } else {
        byTruck.set(camId, {
          caminhaoId: camId, placa: cam?.placa ?? '---', modelo: cam?.modelo ?? '---',
          totalGasto: gasto.valor, qtdLancamentos: 1,
        });
      }
    }

    const items: BIRankingCaminhaoItem[] = Array.from(byTruck.values())
      .map((t) => ({ ...t, porcentagem: totalGeral > 0 ? (t.totalGasto / totalGeral) * 100 : 0 }))
      .sort((a, b) => b.totalGasto - a.totalGasto);

    return { data: items, error: null };
  } catch (err) {
    return { data: null, error: err instanceof Error ? err.message : 'Erro' };
  }
}

// ---------------------------------------------------------------------------
// Eficiencia Motoristas
// ---------------------------------------------------------------------------

export async function getBIEficienciaMotoristasForEmpresa(
  admin: SupabaseClient,
  empresaId: string,
  filtros: BIFiltros,
): Promise<{ data: BIEficienciaMotoristaItem[] | null; error: string | null }> {
  try {
    let viagemQuery = admin
      .from('viagem')
      .select('id, motorista_id, km_saida, km_chegada, data_saida')
      .eq('empresa_id', empresaId)
      .eq('status', 'concluida')
      .not('km_saida', 'is', null)
      .not('km_chegada', 'is', null)
      .gte('data_saida', filtros.periodoInicio)
      .lte('data_saida', filtros.periodoFim)
      .order('data_saida', { ascending: true });

    if (filtros.caminhaoId) viagemQuery = viagemQuery.eq('caminhao_id', filtros.caminhaoId);
    if (filtros.motoristaId) viagemQuery = viagemQuery.eq('motorista_id', filtros.motoristaId);

    let gastoQuery = admin
      .from('gasto')
      .select('valor, litros, motorista_id, motorista (nome)')
      .eq('empresa_id', empresaId)
      .gte('data', filtros.periodoInicio)
      .lte('data', filtros.periodoFim)
      .not('motorista_id', 'is', null)
      .not('litros', 'is', null)
      .not('tipo_combustivel', 'is', null);

    if (filtros.caminhaoId) gastoQuery = gastoQuery.eq('caminhao_id', filtros.caminhaoId);
    if (filtros.motoristaId) gastoQuery = gastoQuery.eq('motorista_id', filtros.motoristaId);

    const [viagemRes, gastoRes] = await Promise.all([viagemQuery, gastoQuery]);

    if (viagemRes.error) throw new Error(viagemRes.error.message);
    if (gastoRes.error) throw new Error(gastoRes.error.message);

    const viagens = viagemRes.data ?? [];
    const gastos = gastoRes.data ?? [];

    // Group trips by driver
    const tripsByDriver = new Map<string, Array<{ km_saida: number; km_chegada: number }>>();
    for (const v of viagens) {
      if (v.km_saida == null || v.km_chegada == null || v.km_chegada <= v.km_saida) continue;
      const motId = v.motorista_id;
      if (!motId) continue;
      const list = tripsByDriver.get(motId) ?? [];
      list.push({ km_saida: v.km_saida, km_chegada: v.km_chegada });
      tripsByDriver.set(motId, list);
    }

    const kmByDriver = new Map<string, number>();
    const viagensByDriver = new Map<string, number>();
    for (const [motId, trips] of tripsByDriver) {
      viagensByDriver.set(motId, trips.length);
      let totalKm = 0;
      for (let i = 0; i < trips.length; i++) {
        totalKm += trips[i].km_chegada - trips[i].km_saida;
        if (i > 0) {
          const gap = trips[i].km_saida - trips[i - 1].km_chegada;
          if (gap > 0 && gap < 500) totalKm += gap;
        }
      }
      kmByDriver.set(motId, totalKm);
    }

    // Fuel by driver
    const fuelByDriver = new Map<string, {
      nome: string; totalLitros: number; totalGastoCentavos: number; totalAbastecimentos: number;
    }>();
    for (const gasto of gastos) {
      const mot = singleRelation<{ nome: string }>(gasto.motorista);
      const motId = gasto.motorista_id!;
      const litros = Number(gasto.litros) || 0;
      const existing = fuelByDriver.get(motId);
      if (existing) {
        existing.totalLitros += litros;
        existing.totalGastoCentavos += gasto.valor;
        existing.totalAbastecimentos += 1;
      } else {
        fuelByDriver.set(motId, {
          nome: mot?.nome ?? 'Desconhecido',
          totalLitros: litros,
          totalGastoCentavos: gasto.valor,
          totalAbastecimentos: 1,
        });
      }
    }

    const items: BIEficienciaMotoristaItem[] = [];
    for (const motId of fuelByDriver.keys()) {
      const fuel = fuelByDriver.get(motId)!;
      const totalKm = kmByDriver.get(motId) ?? 0;
      let kmPorLitro: number | null = null;
      let metodo: BIEficienciaMotoristaItem['metodo'] = null;

      if (totalKm > 0 && fuel.totalLitros > 0) {
        const raw = totalKm / fuel.totalLitros;
        if (raw >= 0.3 && raw <= 8.0) {
          kmPorLitro = Math.round(raw * 100) / 100;
          metodo = 'viagem';
        } else {
          metodo = 'estimativa';
        }
      } else if (fuel.totalLitros > 0) {
        metodo = 'estimativa';
      }

      items.push({
        motoristaId: motId,
        nome: fuel.nome,
        kmPorLitro,
        kmTotal: totalKm,
        totalLitros: fuel.totalLitros,
        totalGastoCentavos: fuel.totalGastoCentavos,
        totalAbastecimentos: fuel.totalAbastecimentos,
        totalViagens: viagensByDriver.get(motId) ?? 0,
        classificacao: kmPorLitro == null ? null : kmPorLitro > 2.5 ? 'bom' : kmPorLitro >= 2.0 ? 'medio' : 'ruim',
        metodo,
      });
    }

    items.sort((a, b) => (b.kmPorLitro ?? 0) - (a.kmPorLitro ?? 0));
    return { data: items, error: null };
  } catch (err) {
    return { data: null, error: err instanceof Error ? err.message : 'Erro' };
  }
}

// ---------------------------------------------------------------------------
// Tendencia Mensal
// ---------------------------------------------------------------------------

const MONTH_LABELS: Record<string, string> = {
  '01': 'Jan', '02': 'Fev', '03': 'Mar', '04': 'Abr',
  '05': 'Mai', '06': 'Jun', '07': 'Jul', '08': 'Ago',
  '09': 'Set', '10': 'Out', '11': 'Nov', '12': 'Dez',
};

export async function getBITendenciaMensalForEmpresa(
  admin: SupabaseClient,
  empresaId: string,
  filtros: BIFiltros,
): Promise<{ data: BITendenciaMensalItem[] | null; error: string | null }> {
  try {
    const twelveMonthsAgo = new Date();
    twelveMonthsAgo.setMonth(twelveMonthsAgo.getMonth() - 12);
    const startDate = twelveMonthsAgo.toISOString().split('T')[0];

    let query = admin
      .from('gasto')
      .select('valor, data')
      .eq('empresa_id', empresaId)
      .gte('data', startDate)
      .lte('data', filtros.periodoFim);

    if (filtros.caminhaoId) query = query.eq('caminhao_id', filtros.caminhaoId);
    if (filtros.motoristaId) query = query.eq('motorista_id', filtros.motoristaId);
    if (filtros.categoriaId) query = query.eq('categoria_id', filtros.categoriaId);

    const { data: gastos, error } = await query;
    if (error) throw new Error(error.message);

    const byMonth = new Map<string, number>();
    for (const gasto of gastos ?? []) {
      const mesAno = gasto.data.substring(0, 7);
      byMonth.set(mesAno, (byMonth.get(mesAno) ?? 0) + gasto.valor);
    }

    const items: BITendenciaMensalItem[] = Array.from(byMonth.entries())
      .map(([mesAno, total]) => {
        const [year, month] = mesAno.split('-');
        return { mesAno, mesAnoLabel: `${MONTH_LABELS[month] ?? month}/${year}`, total };
      })
      .sort((a, b) => a.mesAno.localeCompare(b.mesAno))
      .slice(-6);

    return { data: items, error: null };
  } catch (err) {
    return { data: null, error: err instanceof Error ? err.message : 'Erro' };
  }
}

// ---------------------------------------------------------------------------
// Eficiencia Combustivel (per truck)
// ---------------------------------------------------------------------------

export async function getBIEficienciaCombustivelForEmpresa(
  admin: SupabaseClient,
  empresaId: string,
  filtros: BIFiltros,
): Promise<{ data: BIEficienciaItem[] | null; error: string | null }> {
  try {
    let viagemQuery = admin
      .from('viagem')
      .select('id, caminhao_id, km_saida, km_chegada, data_saida')
      .eq('empresa_id', empresaId)
      .eq('status', 'concluida')
      .not('km_saida', 'is', null)
      .not('km_chegada', 'is', null)
      .gte('data_saida', filtros.periodoInicio)
      .lte('data_saida', filtros.periodoFim)
      .order('data_saida', { ascending: true });

    if (filtros.caminhaoId) viagemQuery = viagemQuery.eq('caminhao_id', filtros.caminhaoId);
    if (filtros.motoristaId) viagemQuery = viagemQuery.eq('motorista_id', filtros.motoristaId);

    let gastoQuery = admin
      .from('gasto')
      .select('valor, litros, caminhao_id, caminhao (placa, modelo)')
      .eq('empresa_id', empresaId)
      .gte('data', filtros.periodoInicio)
      .lte('data', filtros.periodoFim)
      .not('caminhao_id', 'is', null)
      .not('litros', 'is', null)
      .not('tipo_combustivel', 'is', null);

    if (filtros.caminhaoId) gastoQuery = gastoQuery.eq('caminhao_id', filtros.caminhaoId);
    if (filtros.motoristaId) gastoQuery = gastoQuery.eq('motorista_id', filtros.motoristaId);

    const [viagemRes, gastoRes] = await Promise.all([viagemQuery, gastoQuery]);

    if (viagemRes.error) throw new Error(viagemRes.error.message);
    if (gastoRes.error) throw new Error(gastoRes.error.message);

    const viagens = viagemRes.data ?? [];
    const gastos = gastoRes.data ?? [];

    // km by truck
    const tripsByTruck = new Map<string, Array<{ km_saida: number; km_chegada: number }>>();
    for (const v of viagens) {
      if (v.km_saida == null || v.km_chegada == null || v.km_chegada <= v.km_saida) continue;
      const camId = v.caminhao_id;
      if (!camId) continue;
      const list = tripsByTruck.get(camId) ?? [];
      list.push({ km_saida: v.km_saida, km_chegada: v.km_chegada });
      tripsByTruck.set(camId, list);
    }

    const kmByTruck = new Map<string, number>();
    for (const [camId, trips] of tripsByTruck) {
      let totalKm = 0;
      for (let i = 0; i < trips.length; i++) {
        totalKm += trips[i].km_chegada - trips[i].km_saida;
        if (i > 0) {
          const gap = trips[i].km_saida - trips[i - 1].km_chegada;
          if (gap > 0 && gap < 500) totalKm += gap;
        }
      }
      kmByTruck.set(camId, totalKm);
    }

    // fuel by truck
    const fuelByTruck = new Map<string, {
      placa: string; modelo: string; totalLitros: number;
      totalGastoCentavos: number; totalAbastecimentos: number;
    }>();
    for (const gasto of gastos) {
      const cam = singleRelation<{ placa: string; modelo: string }>(gasto.caminhao);
      const camId = gasto.caminhao_id!;
      const litros = Number(gasto.litros) || 0;
      const existing = fuelByTruck.get(camId);
      if (existing) {
        existing.totalLitros += litros;
        existing.totalGastoCentavos += gasto.valor;
        existing.totalAbastecimentos += 1;
      } else {
        fuelByTruck.set(camId, {
          placa: cam?.placa ?? '---', modelo: cam?.modelo ?? '---',
          totalLitros: litros, totalGastoCentavos: gasto.valor, totalAbastecimentos: 1,
        });
      }
    }

    const items: BIEficienciaItem[] = [];
    for (const camId of fuelByTruck.keys()) {
      const fuel = fuelByTruck.get(camId)!;
      const totalKm = kmByTruck.get(camId) ?? 0;
      let kmPorLitro: number | null = null;
      let metodo: BIEficienciaItem['metodo'] = null;

      if (totalKm > 0 && fuel.totalLitros > 0) {
        const raw = totalKm / fuel.totalLitros;
        if (raw >= 0.3 && raw <= 8.0) {
          kmPorLitro = Math.round(raw * 100) / 100;
          metodo = 'viagem';
        } else {
          metodo = 'estimativa';
        }
      } else if (fuel.totalLitros > 0) {
        metodo = 'estimativa';
      }

      items.push({
        caminhaoId: camId,
        placa: fuel.placa,
        modelo: fuel.modelo,
        kmPorLitro,
        kmTotal: totalKm,
        totalLitros: fuel.totalLitros,
        totalGastoCentavos: fuel.totalGastoCentavos,
        totalAbastecimentos: fuel.totalAbastecimentos,
        classificacao: kmPorLitro == null ? null : kmPorLitro > 2.5 ? 'bom' : kmPorLitro >= 2.0 ? 'medio' : 'ruim',
        metodo,
      });
    }

    items.sort((a, b) => (b.kmPorLitro ?? 0) - (a.kmPorLitro ?? 0));
    return { data: items, error: null };
  } catch (err) {
    return { data: null, error: err instanceof Error ? err.message : 'Erro' };
  }
}

// ---------------------------------------------------------------------------
// Manutencoes
// ---------------------------------------------------------------------------

const CATEGORIAS_MANUTENCAO = ['Manutencao', 'Pneu'];

export async function getBIManutencoesForEmpresa(
  admin: SupabaseClient,
  empresaId: string,
  filtros: BIFiltros,
): Promise<{ data: BIManutencaoTruckItem[] | null; error: string | null }> {
  try {
    const { data: catData, error: catError } = await admin
      .from('categoria_gasto')
      .select('id, nome, icone, cor')
      .in('nome', CATEGORIAS_MANUTENCAO);

    if (catError) throw new Error(catError.message);
    if (!catData || catData.length === 0) return { data: [], error: null };

    const catIds = catData.map((c) => c.id);
    const catMap = new Map(catData.map((c) => [c.id, c]));

    let query = admin
      .from('gasto')
      .select('valor, data, categoria_id, caminhao_id, caminhao (placa, modelo)')
      .eq('empresa_id', empresaId)
      .in('categoria_id', catIds)
      .gte('data', filtros.periodoInicio)
      .lte('data', filtros.periodoFim)
      .not('caminhao_id', 'is', null);

    if (filtros.caminhaoId) query = query.eq('caminhao_id', filtros.caminhaoId);
    if (filtros.motoristaId) query = query.eq('motorista_id', filtros.motoristaId);

    const { data: gastos, error } = await query;
    if (error) throw new Error(error.message);

    const byTruck = new Map<string, {
      caminhaoId: string; placa: string; modelo: string;
      totalCustoCentavos: number; totalEventos: number;
      ultimaManutencao: string | null;
      tipoMap: Map<string, { total: number; count: number }>;
    }>();

    for (const gasto of gastos ?? []) {
      const cam = singleRelation<{ placa: string; modelo: string }>(gasto.caminhao);
      const camId = gasto.caminhao_id!;
      const existing = byTruck.get(camId);

      if (existing) {
        existing.totalCustoCentavos += gasto.valor;
        existing.totalEventos += 1;
        if (!existing.ultimaManutencao || gasto.data > existing.ultimaManutencao) {
          existing.ultimaManutencao = gasto.data;
        }
        const tipoEntry = existing.tipoMap.get(gasto.categoria_id) ?? { total: 0, count: 0 };
        tipoEntry.total += gasto.valor;
        tipoEntry.count += 1;
        existing.tipoMap.set(gasto.categoria_id, tipoEntry);
      } else {
        const tipoMap = new Map<string, { total: number; count: number }>();
        tipoMap.set(gasto.categoria_id, { total: gasto.valor, count: 1 });
        byTruck.set(camId, {
          caminhaoId: camId, placa: cam?.placa ?? '---', modelo: cam?.modelo ?? '---',
          totalCustoCentavos: gasto.valor, totalEventos: 1,
          ultimaManutencao: gasto.data, tipoMap,
        });
      }
    }

    const items: BIManutencaoTruckItem[] = Array.from(byTruck.values())
      .map((truck) => {
        const tipos: BIManutencaoTipoItem[] = Array.from(truck.tipoMap.entries()).map(([catId, data]) => {
          const cat = catMap.get(catId);
          return {
            categoriaNome: cat?.nome ?? 'Desconhecido',
            categoriaIcone: cat?.icone ?? null,
            categoriaCor: cat?.cor ?? null,
            totalCentavos: data.total,
            qtdEventos: data.count,
          };
        });
        return {
          caminhaoId: truck.caminhaoId, placa: truck.placa, modelo: truck.modelo,
          totalCustoCentavos: truck.totalCustoCentavos, totalEventos: truck.totalEventos,
          ultimaManutencao: truck.ultimaManutencao, tipos,
        };
      })
      .sort((a, b) => b.totalCustoCentavos - a.totalCustoCentavos);

    return { data: items, error: null };
  } catch (err) {
    return { data: null, error: err instanceof Error ? err.message : 'Erro' };
  }
}

// ---------------------------------------------------------------------------
// Alertas
// ---------------------------------------------------------------------------

function calcStats(values: number[]): { mean: number; stdDev: number; smallFleet: boolean } | null {
  if (values.length < 2) return null;
  const mean = values.reduce((a, b) => a + b, 0) / values.length;
  const variance = values.reduce((sum, v) => sum + (v - mean) ** 2, 0) / values.length;
  return { mean, stdDev: Math.sqrt(variance), smallFleet: values.length < 5 };
}

const OUTLIER_FACTOR = 1.5;
const SMALL_FLEET_PCT = 0.30;
const SMALL_FLEET_CRITICAL = 0.50;

export async function getBIAlertasForEmpresa(
  admin: SupabaseClient,
  empresaId: string,
  filtros: BIFiltros,
): Promise<{ data: BIAlerta[] | null; verificados?: BIAlerta[]; error: string | null }> {
  try {
    const alertas: BIAlerta[] = [];

    // 1. Consumo excessivo
    {
      let viagemQuery = admin
        .from('viagem')
        .select('id, caminhao_id, km_saida, km_chegada')
        .eq('empresa_id', empresaId)
        .eq('status', 'concluida')
        .not('km_saida', 'is', null)
        .not('km_chegada', 'is', null)
        .gte('data_saida', filtros.periodoInicio)
        .lte('data_saida', filtros.periodoFim)
        .order('data_saida', { ascending: true });

      if (filtros.caminhaoId) viagemQuery = viagemQuery.eq('caminhao_id', filtros.caminhaoId);
      if (filtros.motoristaId) viagemQuery = viagemQuery.eq('motorista_id', filtros.motoristaId);

      let fuelQuery = admin
        .from('gasto')
        .select('litros, caminhao_id, caminhao (placa)')
        .eq('empresa_id', empresaId)
        .gte('data', filtros.periodoInicio)
        .lte('data', filtros.periodoFim)
        .not('caminhao_id', 'is', null)
        .not('litros', 'is', null)
        .not('tipo_combustivel', 'is', null);

      if (filtros.caminhaoId) fuelQuery = fuelQuery.eq('caminhao_id', filtros.caminhaoId);
      if (filtros.motoristaId) fuelQuery = fuelQuery.eq('motorista_id', filtros.motoristaId);

      const [viagemRes, fuelRes] = await Promise.all([viagemQuery, fuelQuery]);

      if (!viagemRes.error && !fuelRes.error) {
        const tripsByTruck = new Map<string, Array<{ km_saida: number; km_chegada: number }>>();
        for (const v of viagemRes.data ?? []) {
          if (v.km_saida == null || v.km_chegada == null || v.km_chegada <= v.km_saida) continue;
          const camId = v.caminhao_id;
          if (!camId) continue;
          const list = tripsByTruck.get(camId) ?? [];
          list.push({ km_saida: v.km_saida, km_chegada: v.km_chegada });
          tripsByTruck.set(camId, list);
        }

        const kmByTruck = new Map<string, number>();
        for (const [camId, trips] of tripsByTruck) {
          let totalKm = 0;
          for (let i = 0; i < trips.length; i++) {
            totalKm += trips[i].km_chegada - trips[i].km_saida;
            if (i > 0) {
              const gap = trips[i].km_saida - trips[i - 1].km_chegada;
              if (gap > 0 && gap < 500) totalKm += gap;
            }
          }
          kmByTruck.set(camId, totalKm);
        }

        const litrosByTruck = new Map<string, { litros: number; placa: string }>();
        for (const g of fuelRes.data ?? []) {
          const camId = g.caminhao_id!;
          const cam = singleRelation<{ placa: string }>(g.caminhao);
          const litros = Number(g.litros) || 0;
          const existing = litrosByTruck.get(camId);
          if (existing) {
            existing.litros += litros;
          } else {
            litrosByTruck.set(camId, { litros, placa: cam?.placa ?? '---' });
          }
        }

        const kmlValues: Array<{ camId: string; placa: string; kml: number }> = [];
        for (const [camId, fuel] of litrosByTruck) {
          const km = kmByTruck.get(camId) ?? 0;
          if (km > 0 && fuel.litros > 0) {
            const kml = km / fuel.litros;
            if (kml >= 0.5 && kml <= 10) {
              kmlValues.push({ camId, placa: fuel.placa, kml });
            }
          }
        }

        const stats = calcStats(kmlValues.map(v => v.kml));
        if (stats) {
          for (const v of kmlValues) {
            const pctDev = (stats.mean - v.kml) / stats.mean;
            const outlier = stats.smallFleet ? pctDev >= SMALL_FLEET_PCT : v.kml < stats.mean - OUTLIER_FACTOR * stats.stdDev;
            const critical = stats.smallFleet ? pctDev >= SMALL_FLEET_CRITICAL : v.kml < stats.mean - 2 * stats.stdDev;
            if (outlier) {
              alertas.push({
                tipo: 'combustivel',
                severidade: critical ? 'alto' : 'medio',
                titulo: 'Consumo excessivo de combustível',
                descricao: 'Caminhao abaixo da media da frota',
                entidade: v.placa,
                valor: `${v.kml.toFixed(1)} km/L`,
                referencia: `media da frota: ${stats.mean.toFixed(1)} km/L`,
              });
            }
          }
        }
      }
    }

    // 2-3. Manutencao/pneu frequente
    {
      const { data: catData } = await admin
        .from('categoria_gasto')
        .select('id, nome')
        .in('nome', CATEGORIAS_MANUTENCAO);

      if (catData && catData.length > 0) {
        const catIds = catData.map((c) => c.id);
        const pneuCatIds = catData.filter((c) => c.nome === 'Pneu').map((c) => c.id);

        let query = admin
          .from('gasto')
          .select('categoria_id, caminhao_id, caminhao (placa)')
          .eq('empresa_id', empresaId)
          .in('categoria_id', catIds)
          .gte('data', filtros.periodoInicio)
          .lte('data', filtros.periodoFim)
          .not('caminhao_id', 'is', null);

        if (filtros.caminhaoId) query = query.eq('caminhao_id', filtros.caminhaoId);
        if (filtros.motoristaId) query = query.eq('motorista_id', filtros.motoristaId);

        const { data: manutGastos } = await query;

        if (manutGastos) {
          const manutByTruck = new Map<string, { total: number; pneu: number; placa: string }>();
          for (const g of manutGastos) {
            const camId = g.caminhao_id!;
            const cam = singleRelation<{ placa: string }>(g.caminhao);
            const isPneu = pneuCatIds.includes(g.categoria_id);
            const existing = manutByTruck.get(camId);
            if (existing) {
              existing.total += 1;
              if (isPneu) existing.pneu += 1;
            } else {
              manutByTruck.set(camId, { total: 1, pneu: isPneu ? 1 : 0, placa: cam?.placa ?? '---' });
            }
          }

          const allTrucks = Array.from(manutByTruck.values());
          const manutStats = calcStats(allTrucks.map(d => d.total));
          const pneuStats = calcStats(allTrucks.map(d => d.pneu));

          for (const [, data] of manutByTruck) {
            if (manutStats) {
              const pctDev = (data.total - manutStats.mean) / manutStats.mean;
              const outlier = manutStats.smallFleet ? pctDev >= SMALL_FLEET_PCT : data.total > manutStats.mean + OUTLIER_FACTOR * manutStats.stdDev;
              const critical = manutStats.smallFleet ? pctDev >= SMALL_FLEET_CRITICAL : data.total > manutStats.mean + 2 * manutStats.stdDev;
              if (outlier) {
                alertas.push({
                  tipo: 'manutencao',
                  severidade: critical ? 'alto' : 'medio',
                  titulo: 'Manutencao frequente',
                  descricao: 'Caminhao com manutencoes acima da media da frota',
                  entidade: data.placa,
                  valor: `${data.total} manutencoes`,
                  referencia: `media da frota: ${manutStats.mean.toFixed(1)}`,
                });
              }
            }
            if (pneuStats && (pneuStats.smallFleet || pneuStats.stdDev > 0)) {
              const pctDev = pneuStats.mean > 0 ? (data.pneu - pneuStats.mean) / pneuStats.mean : 0;
              const outlier = pneuStats.smallFleet ? pctDev >= SMALL_FLEET_PCT : data.pneu > pneuStats.mean + OUTLIER_FACTOR * pneuStats.stdDev;
              const critical = pneuStats.smallFleet ? pctDev >= SMALL_FLEET_CRITICAL : data.pneu > pneuStats.mean + 2 * pneuStats.stdDev;
              if (outlier) {
                alertas.push({
                  tipo: 'pneu',
                  severidade: critical ? 'alto' : 'medio',
                  titulo: 'Troca de pneu frequente',
                  descricao: 'Caminhao com trocas de pneu acima da media da frota',
                  entidade: data.placa,
                  valor: `${data.pneu} trocas de pneu`,
                  referencia: `media da frota: ${pneuStats.mean.toFixed(1)}`,
                });
              }
            }
          }
        }
      }
    }

    // 4. Gasto acima da media
    {
      let viagemQuery = admin
        .from('viagem')
        .select('id, motorista_id, motorista:motorista_id (nome)')
        .eq('empresa_id', empresaId)
        .eq('status', 'concluida')
        .not('motorista_id', 'is', null)
        .gte('data_saida', filtros.periodoInicio)
        .lte('data_saida', filtros.periodoFim);

      if (filtros.caminhaoId) viagemQuery = viagemQuery.eq('caminhao_id', filtros.caminhaoId);
      if (filtros.motoristaId) viagemQuery = viagemQuery.eq('motorista_id', filtros.motoristaId);

      let gastoQuery = admin
        .from('gasto')
        .select('valor, viagem_id')
        .eq('empresa_id', empresaId)
        .not('viagem_id', 'is', null)
        .gte('data', filtros.periodoInicio)
        .lte('data', filtros.periodoFim);

      if (filtros.caminhaoId) gastoQuery = gastoQuery.eq('caminhao_id', filtros.caminhaoId);
      if (filtros.motoristaId) gastoQuery = gastoQuery.eq('motorista_id', filtros.motoristaId);

      const [viagemRes, gastoRes] = await Promise.all([viagemQuery, gastoQuery]);

      if (!viagemRes.error && !gastoRes.error) {
        const viagens = viagemRes.data ?? [];
        const gastos = gastoRes.data ?? [];

        const gastosPorViagem = new Map<string, number>();
        for (const g of gastos) {
          if (g.viagem_id) {
            gastosPorViagem.set(g.viagem_id, (gastosPorViagem.get(g.viagem_id) ?? 0) + g.valor);
          }
        }

        const byMotorista = new Map<string, { nome: string; custoTotal: number; viagens: number }>();
        for (const v of viagens) {
          const motId = v.motorista_id!;
          const mot = singleRelation<{ nome: string }>(v.motorista);
          const custo = gastosPorViagem.get(v.id) ?? 0;
          const existing = byMotorista.get(motId);
          if (existing) {
            existing.custoTotal += custo;
            existing.viagens += 1;
          } else {
            byMotorista.set(motId, { nome: mot?.nome ?? 'Desconhecido', custoTotal: custo, viagens: 1 });
          }
        }

        const allDrivers = Array.from(byMotorista.values()).filter((d) => d.viagens > 0);
        const totalCusto = allDrivers.reduce((sum, d) => sum + d.custoTotal, 0);
        const totalViagens = allDrivers.reduce((sum, d) => sum + d.viagens, 0);
        const mediaGlobal = totalViagens > 0 ? totalCusto / totalViagens : 0;
        const driverCosts = allDrivers.map(d => d.custoTotal / d.viagens);
        const costStats = calcStats(driverCosts);

        if (costStats && mediaGlobal > 0) {
          for (const [, driver] of byMotorista) {
            if (driver.viagens === 0) continue;
            const custoMedio = driver.custoTotal / driver.viagens;
            const pctDev = (custoMedio - costStats.mean) / costStats.mean;
            const outlier = costStats.smallFleet ? pctDev >= SMALL_FLEET_PCT : custoMedio > costStats.mean + OUTLIER_FACTOR * costStats.stdDev;
            const critical = costStats.smallFleet ? pctDev >= SMALL_FLEET_CRITICAL : custoMedio > costStats.mean + 2 * costStats.stdDev;
            if (outlier) {
              const pctAcima = Math.round(((custoMedio - mediaGlobal) / mediaGlobal) * 100);
              alertas.push({
                tipo: 'gasto_acima_media',
                severidade: critical ? 'alto' : 'medio',
                titulo: 'Custo por viagem acima da media',
                descricao: `Motorista com gasto ${pctAcima}% acima da media da empresa`,
                entidade: driver.nome,
                valor: `R$ ${(custoMedio / 100).toFixed(0)}/viagem`,
                referencia: `media: R$ ${(mediaGlobal / 100).toFixed(0)}/viagem`,
              });
            }
          }
        }
      }
    }

    // Filter dismissed alerts
    const trintaDiasAtras = new Date(Date.now() - 30 * 86400000).toISOString();
    const { data: dispensados } = await admin
      .from('alerta_dispensado')
      .select('tipo, entidade, dispensado_em')
      .eq('empresa_id', empresaId)
      .gte('dispensado_em', trintaDiasAtras);

    const dispensadoSet = new Set(
      (dispensados ?? []).map((d: { tipo: string; entidade: string }) => `${d.tipo}:${d.entidade}`),
    );

    const alertasAtivos = alertas.filter((a) => !dispensadoSet.has(`${a.tipo}:${a.entidade}`));
    const alertasVerificados = alertas.filter((a) => dispensadoSet.has(`${a.tipo}:${a.entidade}`));

    alertasAtivos.sort((a, b) => {
      if (a.severidade === b.severidade) return 0;
      return a.severidade === 'alto' ? -1 : 1;
    });

    return { data: alertasAtivos, verificados: alertasVerificados, error: null };
  } catch (err) {
    return { data: null, error: err instanceof Error ? err.message : 'Erro' };
  }
}
