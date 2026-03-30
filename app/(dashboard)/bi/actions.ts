'use server';

import { createClient } from '@/lib/supabase/server';
import { getCurrentUsuario } from '@/lib/auth/get-user-role';
import type {
  BIFiltros,
  BIKpis,
  BICategoriaItem,
  BIRankingCaminhaoItem,
  BIRankingMotoristaItem,
  BITendenciaMensalItem,
  BIFilterOptions,
  BIEstimativaParams,
  BIEstimativaResult,
  BIHistoricoRotasParams,
  BIHistoricoRotasResult,
  BIHistoricoRotaItem,
  BIEficienciaItem,
  BIEficienciaMotoristaItem,
  BIManutencaoTruckItem,
  BIManutencaoTipoItem,
  BIMargemMotoristaItem,
} from '@/types/bi';

// ---------------------------------------------------------------------------
// Auth guard — reusable across all BI actions
// ---------------------------------------------------------------------------

async function requireDono() {
  const usuario = await getCurrentUsuario();
  if (!usuario || usuario.role !== 'dono') {
    throw new Error('Acesso negado');
  }
  return usuario;
}

// ---------------------------------------------------------------------------
// Filter options
// ---------------------------------------------------------------------------

export async function getBIFilterOptions(): Promise<{
  data: BIFilterOptions | null;
  error: string | null;
}> {
  try {
    const usuario = await requireDono();
    const supabase = await createClient();

    const [camRes, motRes, catRes] = await Promise.all([
      supabase
        .from('caminhao')
        .select('id, placa, modelo')
        .eq('empresa_id', usuario.empresa_id)
        .eq('ativo', true)
        .order('placa'),
      supabase
        .from('motorista')
        .select('id, nome')
        .eq('empresa_id', usuario.empresa_id)
        .eq('status', 'ativo')
        .order('nome'),
      supabase
        .from('categoria_gasto')
        .select('id, nome, icone, cor')
        .or(`empresa_id.is.null,empresa_id.eq.${usuario.empresa_id}`)
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
// KPIs — Profit-first hero metrics
// ---------------------------------------------------------------------------

export async function getBIKpis(
  filtros: BIFiltros,
): Promise<{ data: BIKpis | null; error: string | null }> {
  try {
    await requireDono();
    const supabase = await createClient();

    // 1. Fetch concluded viagens in the period (receita)
    let viagemQuery = supabase
      .from('viagem')
      .select('id, valor_total')
      .eq('status', 'concluida')
      .gte('data_saida', filtros.periodoInicio)
      .lte('data_saida', filtros.periodoFim);

    if (filtros.caminhaoId) {
      viagemQuery = viagemQuery.eq('caminhao_id', filtros.caminhaoId);
    }
    if (filtros.motoristaId) {
      viagemQuery = viagemQuery.eq('motorista_id', filtros.motoristaId);
    }

    // 2. Fetch all gastos in the period (custos)
    let gastoQuery = supabase
      .from('gasto')
      .select('valor, viagem_id')
      .gte('data', filtros.periodoInicio)
      .lte('data', filtros.periodoFim);

    if (filtros.caminhaoId) {
      gastoQuery = gastoQuery.eq('caminhao_id', filtros.caminhaoId);
    }
    if (filtros.motoristaId) {
      gastoQuery = gastoQuery.eq('motorista_id', filtros.motoristaId);
    }
    if (filtros.categoriaId) {
      gastoQuery = gastoQuery.eq('categoria_id', filtros.categoriaId);
    }

    const [viagemRes, gastoRes] = await Promise.all([viagemQuery, gastoQuery]);

    if (viagemRes.error) throw new Error(viagemRes.error.message);
    if (gastoRes.error) throw new Error(gastoRes.error.message);

    const viagens = viagemRes.data ?? [];
    const gastos = gastoRes.data ?? [];

    // Receita total (fretes concluidos)
    const receitaFrete = viagens.reduce((sum, v) => sum + (v.valor_total ?? 0), 0);
    const viagensConcluidas = viagens.length;

    // Custo total
    const custoTotal = gastos.reduce((sum, g) => sum + g.valor, 0);

    // Lucro bruto
    const lucroBruto = receitaFrete - custoTotal;
    const margemPercentual = receitaFrete > 0
      ? Math.round((lucroBruto / receitaFrete) * 10000) / 100
      : 0;

    // 3. Per-trip margin: for each concluded viagem, sum its linked gastos
    const gastosPorViagem = new Map<string, number>();
    for (const g of gastos) {
      if (g.viagem_id) {
        gastosPorViagem.set(
          g.viagem_id,
          (gastosPorViagem.get(g.viagem_id) ?? 0) + g.valor,
        );
      }
    }

    let somaMargens = 0;
    let somaMargensPct = 0;
    let viagensComMargem = 0;

    for (const v of viagens) {
      const frete = v.valor_total ?? 0;
      const custo = gastosPorViagem.get(v.id) ?? 0;
      const margem = frete - custo;
      somaMargens += margem;
      if (frete > 0) {
        somaMargensPct += (margem / frete) * 100;
      }
      viagensComMargem += 1;
    }

    const margemMediaViagem = viagensComMargem > 0
      ? Math.round(somaMargens / viagensComMargem)
      : 0;
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

export async function getBIMargemMotoristas(
  filtros: BIFiltros,
): Promise<{ data: BIMargemMotoristaItem[] | null; error: string | null }> {
  try {
    await requireDono();
    const supabase = await createClient();

    // 1. Fetch concluded viagens with motorista info
    let viagemQuery = supabase
      .from('viagem')
      .select('id, valor_total, motorista_id, motorista:motorista_id (nome)')
      .eq('status', 'concluida')
      .not('motorista_id', 'is', null)
      .gte('data_saida', filtros.periodoInicio)
      .lte('data_saida', filtros.periodoFim);

    if (filtros.caminhaoId) {
      viagemQuery = viagemQuery.eq('caminhao_id', filtros.caminhaoId);
    }
    if (filtros.motoristaId) {
      viagemQuery = viagemQuery.eq('motorista_id', filtros.motoristaId);
    }

    // 2. Fetch all gastos linked to viagens
    let gastoQuery = supabase
      .from('gasto')
      .select('valor, viagem_id')
      .not('viagem_id', 'is', null)
      .gte('data', filtros.periodoInicio)
      .lte('data', filtros.periodoFim);

    if (filtros.caminhaoId) {
      gastoQuery = gastoQuery.eq('caminhao_id', filtros.caminhaoId);
    }
    if (filtros.motoristaId) {
      gastoQuery = gastoQuery.eq('motorista_id', filtros.motoristaId);
    }
    if (filtros.categoriaId) {
      gastoQuery = gastoQuery.eq('categoria_id', filtros.categoriaId);
    }

    const [viagemRes, gastoRes] = await Promise.all([viagemQuery, gastoQuery]);

    if (viagemRes.error) throw new Error(viagemRes.error.message);
    if (gastoRes.error) throw new Error(gastoRes.error.message);

    const viagens = viagemRes.data ?? [];
    const gastos = gastoRes.data ?? [];

    // Aggregate gastos by viagem_id
    const gastosPorViagem = new Map<string, number>();
    for (const g of gastos) {
      if (g.viagem_id) {
        gastosPorViagem.set(
          g.viagem_id,
          (gastosPorViagem.get(g.viagem_id) ?? 0) + g.valor,
        );
      }
    }

    // Aggregate by motorista
    const byMotorista = new Map<
      string,
      {
        motoristaId: string;
        nome: string;
        viagensConcluidas: number;
        receitaCentavos: number;
        custoCentavos: number;
      }
    >();

    for (const v of viagens) {
      const motId = v.motorista_id!;
      const mot = v.motorista as unknown as { nome: string } | null;
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
        return {
          ...m,
          margemCentavos: margem,
          margemPercentual: pct,
        };
      })
      .sort((a, b) => b.margemCentavos - a.margemCentavos);

    return { data: items, error: null };
  } catch (err) {
    return { data: null, error: err instanceof Error ? err.message : 'Erro' };
  }
}

// ---------------------------------------------------------------------------
// Category breakdown
// ---------------------------------------------------------------------------

export async function getBICategoriasBreakdown(
  filtros: BIFiltros,
): Promise<{ data: BICategoriaItem[] | null; error: string | null }> {
  try {
    await requireDono();
    const supabase = await createClient();

    let query = supabase
      .from('gasto')
      .select(`
        valor,
        categoria_id,
        categoria_gasto (
          id,
          nome,
          icone,
          cor
        )
      `)
      .gte('data', filtros.periodoInicio)
      .lte('data', filtros.periodoFim);

    if (filtros.caminhaoId) {
      query = query.eq('caminhao_id', filtros.caminhaoId);
    }
    if (filtros.motoristaId) {
      query = query.eq('motorista_id', filtros.motoristaId);
    }
    if (filtros.categoriaId) {
      query = query.eq('categoria_id', filtros.categoriaId);
    }

    const { data: gastos, error } = await query;
    if (error) throw new Error(error.message);

    // Aggregate by category
    const byCategory = new Map<
      string,
      {
        categoriaId: string;
        categoriaNome: string;
        categoriaIcone: string | null;
        categoriaCor: string | null;
        total: number;
        qtdLancamentos: number;
      }
    >();

    const totalGeral = (gastos ?? []).reduce((sum, g) => sum + g.valor, 0);

    for (const gasto of gastos ?? []) {
      const cat = gasto.categoria_gasto as unknown as {
        id: string;
        nome: string;
        icone: string | null;
        cor: string | null;
      } | null;

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
      .map((cat) => ({
        ...cat,
        porcentagem: totalGeral > 0 ? (cat.total / totalGeral) * 100 : 0,
      }))
      .sort((a, b) => b.total - a.total);

    return { data: items, error: null };
  } catch (err) {
    return { data: null, error: err instanceof Error ? err.message : 'Erro' };
  }
}

// ---------------------------------------------------------------------------
// Ranking by truck
// ---------------------------------------------------------------------------

export async function getBIRankingCaminhoes(
  filtros: BIFiltros,
): Promise<{ data: BIRankingCaminhaoItem[] | null; error: string | null }> {
  try {
    await requireDono();
    const supabase = await createClient();

    let query = supabase
      .from('gasto')
      .select(`
        valor,
        caminhao_id,
        caminhao (
          placa,
          modelo
        )
      `)
      .gte('data', filtros.periodoInicio)
      .lte('data', filtros.periodoFim)
      .not('caminhao_id', 'is', null);

    if (filtros.caminhaoId) {
      query = query.eq('caminhao_id', filtros.caminhaoId);
    }
    if (filtros.motoristaId) {
      query = query.eq('motorista_id', filtros.motoristaId);
    }
    if (filtros.categoriaId) {
      query = query.eq('categoria_id', filtros.categoriaId);
    }

    const { data: gastos, error } = await query;
    if (error) throw new Error(error.message);

    // Aggregate by truck
    const byTruck = new Map<
      string,
      {
        caminhaoId: string;
        placa: string;
        modelo: string;
        totalGasto: number;
        qtdLancamentos: number;
      }
    >();

    const totalGeral = (gastos ?? []).reduce((sum, g) => sum + g.valor, 0);

    for (const gasto of gastos ?? []) {
      const cam = gasto.caminhao as unknown as {
        placa: string;
        modelo: string;
      } | null;
      const camId = gasto.caminhao_id!;
      const existing = byTruck.get(camId);

      if (existing) {
        existing.totalGasto += gasto.valor;
        existing.qtdLancamentos += 1;
      } else {
        byTruck.set(camId, {
          caminhaoId: camId,
          placa: cam?.placa ?? '---',
          modelo: cam?.modelo ?? '---',
          totalGasto: gasto.valor,
          qtdLancamentos: 1,
        });
      }
    }

    const items: BIRankingCaminhaoItem[] = Array.from(byTruck.values())
      .map((truck) => ({
        ...truck,
        porcentagem: totalGeral > 0 ? (truck.totalGasto / totalGeral) * 100 : 0,
      }))
      .sort((a, b) => b.totalGasto - a.totalGasto);

    return { data: items, error: null };
  } catch (err) {
    return { data: null, error: err instanceof Error ? err.message : 'Erro' };
  }
}

// ---------------------------------------------------------------------------
// Ranking by driver
// ---------------------------------------------------------------------------

export async function getBIRankingMotoristas(
  filtros: BIFiltros,
): Promise<{ data: BIRankingMotoristaItem[] | null; error: string | null }> {
  try {
    await requireDono();
    const supabase = await createClient();

    let query = supabase
      .from('gasto')
      .select(`
        valor,
        motorista_id,
        motorista (
          nome
        )
      `)
      .gte('data', filtros.periodoInicio)
      .lte('data', filtros.periodoFim);

    if (filtros.caminhaoId) {
      query = query.eq('caminhao_id', filtros.caminhaoId);
    }
    if (filtros.motoristaId) {
      query = query.eq('motorista_id', filtros.motoristaId);
    }
    if (filtros.categoriaId) {
      query = query.eq('categoria_id', filtros.categoriaId);
    }

    const { data: gastos, error } = await query;
    if (error) throw new Error(error.message);

    // Aggregate by driver
    const byDriver = new Map<
      string,
      {
        motoristaId: string;
        nome: string;
        totalGasto: number;
        qtdLancamentos: number;
      }
    >();

    const totalGeral = (gastos ?? []).reduce((sum, g) => sum + g.valor, 0);

    for (const gasto of gastos ?? []) {
      const mot = gasto.motorista as unknown as { nome: string } | null;
      const motId = gasto.motorista_id;
      const existing = byDriver.get(motId);

      if (existing) {
        existing.totalGasto += gasto.valor;
        existing.qtdLancamentos += 1;
      } else {
        byDriver.set(motId, {
          motoristaId: motId,
          nome: mot?.nome ?? 'Desconhecido',
          totalGasto: gasto.valor,
          qtdLancamentos: 1,
        });
      }
    }

    const items: BIRankingMotoristaItem[] = Array.from(byDriver.values())
      .map((driver) => ({
        ...driver,
        porcentagem: totalGeral > 0 ? (driver.totalGasto / totalGeral) * 100 : 0,
      }))
      .sort((a, b) => b.totalGasto - a.totalGasto);

    return { data: items, error: null };
  } catch (err) {
    return { data: null, error: err instanceof Error ? err.message : 'Erro' };
  }
}

// ---------------------------------------------------------------------------
// Monthly trend (last 6 months with data)
// ---------------------------------------------------------------------------

const MONTH_LABELS: Record<string, string> = {
  '01': 'Jan',
  '02': 'Fev',
  '03': 'Mar',
  '04': 'Abr',
  '05': 'Mai',
  '06': 'Jun',
  '07': 'Jul',
  '08': 'Ago',
  '09': 'Set',
  '10': 'Out',
  '11': 'Nov',
  '12': 'Dez',
};

export async function getBITendenciaMensal(
  filtros: BIFiltros,
): Promise<{ data: BITendenciaMensalItem[] | null; error: string | null }> {
  try {
    await requireDono();
    const supabase = await createClient();

    // Fetch last 12 months of data to find 6 months with activity
    const twelveMonthsAgo = new Date();
    twelveMonthsAgo.setMonth(twelveMonthsAgo.getMonth() - 12);
    const startDate = twelveMonthsAgo.toISOString().split('T')[0];

    let query = supabase
      .from('gasto')
      .select('valor, data')
      .gte('data', startDate)
      .lte('data', filtros.periodoFim);

    if (filtros.caminhaoId) {
      query = query.eq('caminhao_id', filtros.caminhaoId);
    }
    if (filtros.motoristaId) {
      query = query.eq('motorista_id', filtros.motoristaId);
    }
    if (filtros.categoriaId) {
      query = query.eq('categoria_id', filtros.categoriaId);
    }

    const { data: gastos, error } = await query;
    if (error) throw new Error(error.message);

    // Aggregate by month
    const byMonth = new Map<string, number>();

    for (const gasto of gastos ?? []) {
      const mesAno = gasto.data.substring(0, 7); // "2026-03"
      byMonth.set(mesAno, (byMonth.get(mesAno) ?? 0) + gasto.valor);
    }

    // Sort by date and take last 6
    const items: BITendenciaMensalItem[] = Array.from(byMonth.entries())
      .map(([mesAno, total]) => {
        const [year, month] = mesAno.split('-');
        return {
          mesAno,
          mesAnoLabel: `${MONTH_LABELS[month] ?? month}/${year}`,
          total,
        };
      })
      .sort((a, b) => a.mesAno.localeCompare(b.mesAno))
      .slice(-6);

    return { data: items, error: null };
  } catch (err) {
    return { data: null, error: err instanceof Error ? err.message : 'Erro' };
  }
}

// ---------------------------------------------------------------------------
// Story 5.6 — Estimativa de Custo de Viagem
// ---------------------------------------------------------------------------

/** Default fuel consumption for cegonheiro trucks when no history (km/l). */
const CONSUMO_PADRAO_CEGONHEIRO = 2.5;

/** Default diesel price in centavos (R$ 6,50/l) when no data available. */
const PRECO_DIESEL_PADRAO = 650;

export async function getEstimativaCustoViagem(
  params: BIEstimativaParams,
): Promise<{ data: BIEstimativaResult | null; error: string | null }> {
  try {
    await requireDono();
    const supabase = await createClient();

    let consumoKmL = CONSUMO_PADRAO_CEGONHEIRO;
    let fonteConsumo: BIEstimativaResult['fonteConsumo'] = 'padrao_cegonheiro';

    // Try to get real consumption from truck trip history (hybrid calculation)
    if (params.caminhaoId) {
      // Fetch concluded trips with km data (last 180 days)
      const cutoff = new Date();
      cutoff.setDate(cutoff.getDate() - 180);
      const cutoffStr = cutoff.toISOString().split('T')[0];

      const [tripRes, fuelRes] = await Promise.all([
        supabase
          .from('viagem')
          .select('km_saida, km_chegada')
          .eq('caminhao_id', params.caminhaoId)
          .eq('status', 'concluida')
          .not('km_saida', 'is', null)
          .not('km_chegada', 'is', null)
          .gte('data_saida', cutoffStr)
          .order('data_saida', { ascending: true }),
        supabase
          .from('gasto')
          .select('litros')
          .eq('caminhao_id', params.caminhaoId)
          .not('litros', 'is', null)
          .not('tipo_combustivel', 'is', null)
          .gte('data', cutoffStr),
      ]);

      const trips = tripRes.data ?? [];
      const fuels = fuelRes.data ?? [];

      if (trips.length > 0 && fuels.length > 0) {
        let totalKm = 0;
        for (let i = 0; i < trips.length; i++) {
          const km = (trips[i].km_chegada ?? 0) - (trips[i].km_saida ?? 0);
          if (km > 0) totalKm += km;
          // Add gap km between consecutive trips
          if (i > 0) {
            const gap = (trips[i].km_saida ?? 0) - (trips[i - 1].km_chegada ?? 0);
            if (gap > 0 && gap < 500) totalKm += gap;
          }
        }

        const totalLitros = fuels.reduce((sum, f) => sum + (Number(f.litros) || 0), 0);

        if (totalKm > 0 && totalLitros > 0) {
          const calculated = totalKm / totalLitros;
          if (calculated >= 1.0 && calculated <= 5.0) {
            consumoKmL = Math.round(calculated * 100) / 100;
            fonteConsumo = 'historico_real';
          }
        }
      }
    }

    // Get average fuel price
    let precoMedioLitroCentavos = PRECO_DIESEL_PADRAO;
    let fontePreco: BIEstimativaResult['fontePreco'] = 'padrao';

    // Try real average price from last 30 days
    const { data: mediaPreco } = await supabase
      .from('vw_media_combustivel_regiao')
      .select('preco_medio_litro')
      .eq('tipo_combustivel', params.tipoCombustivel)
      .order('ultima_data', { ascending: false })
      .limit(1)
      .single();

    if (mediaPreco?.preco_medio_litro && Number(mediaPreco.preco_medio_litro) > 0) {
      // preco_medio_litro is in BRL (e.g. 6.50), convert to centavos
      precoMedioLitroCentavos = Math.round(Number(mediaPreco.preco_medio_litro) * 100);
      fontePreco = 'historico';
    } else {
      // Fallback: reference price from combustivel_preco table
      const { data: refPreco } = await supabase
        .from('combustivel_preco')
        .select('preco_centavos')
        .eq('tipo', params.tipoCombustivel)
        .eq('ativo', true)
        .order('data_referencia', { ascending: false })
        .limit(1)
        .single();

      if (refPreco?.preco_centavos && refPreco.preco_centavos > 0) {
        precoMedioLitroCentavos = refPreco.preco_centavos;
        fontePreco = 'tabela';
      }
    }

    const litrosEstimados = params.kmEstimado / consumoKmL;
    const custoEstimadoCentavos = Math.round(litrosEstimados * precoMedioLitroCentavos);

    return {
      data: {
        litrosEstimados: Math.round(litrosEstimados * 1000) / 1000,
        custoEstimadoCentavos,
        consumoKmL,
        fonteConsumo,
        precoMedioLitroCentavos,
        fontePreco,
      },
      error: null,
    };
  } catch (err) {
    return { data: null, error: err instanceof Error ? err.message : 'Erro' };
  }
}

// ---------------------------------------------------------------------------
// Story 5.6 — Historico de Rotas Similares
// ---------------------------------------------------------------------------

export async function getHistoricoRotasSimilares(
  params: BIHistoricoRotasParams,
): Promise<{ data: BIHistoricoRotasResult | null; error: string | null }> {
  try {
    await requireDono();
    const supabase = await createClient();

    const origemTerm = params.origem.trim();
    const destinoTerm = params.destino.trim();

    if (!origemTerm && !destinoTerm) {
      return { data: { viagens: [], comparativo: null }, error: null };
    }

    // Fetch viagens matching origin AND destination (ILIKE partial match)
    let viagemQuery = supabase
      .from('viagem')
      .select(`
        id,
        data_saida,
        km_saida,
        km_chegada,
        valor_total,
        status,
        caminhao:caminhao_id (placa),
        motorista:motorista_id (nome)
      `)
      .eq('status', 'concluida')
      .order('data_saida', { ascending: false })
      .limit(10);

    if (origemTerm) {
      viagemQuery = viagemQuery.ilike('origem', `%${origemTerm}%`);
    }
    if (destinoTerm) {
      viagemQuery = viagemQuery.ilike('destino', `%${destinoTerm}%`);
    }

    const { data: viagens, error: viagemError } = await viagemQuery;
    if (viagemError) throw new Error(viagemError.message);

    if (!viagens || viagens.length === 0) {
      return { data: { viagens: [], comparativo: null }, error: null };
    }

    // For each viagem, fetch aggregated gastos
    const viagemIds = viagens.map((v) => v.id);
    const { data: gastos, error: gastoError } = await supabase
      .from('gasto')
      .select('viagem_id, valor, tipo_combustivel')
      .in('viagem_id', viagemIds);

    if (gastoError) throw new Error(gastoError.message);

    // Aggregate gastos by viagem
    const gastosByViagem = new Map<string, { total: number; combustivel: number }>();
    for (const g of gastos ?? []) {
      if (!g.viagem_id) continue;
      const existing = gastosByViagem.get(g.viagem_id) ?? { total: 0, combustivel: 0 };
      existing.total += g.valor;
      if (g.tipo_combustivel) {
        existing.combustivel += g.valor;
      }
      gastosByViagem.set(g.viagem_id, existing);
    }

    const items: BIHistoricoRotaItem[] = viagens.map((v) => {
      const cam = v.caminhao as unknown as { placa: string } | null;
      const mot = v.motorista as unknown as { nome: string } | null;
      const gastosViagem = gastosByViagem.get(v.id) ?? { total: 0, combustivel: 0 };
      const kmRealizado =
        v.km_saida != null && v.km_chegada != null && v.km_chegada > v.km_saida
          ? v.km_chegada - v.km_saida
          : null;
      const freteCentavos = v.valor_total > 0 ? v.valor_total : null;
      const lucroCentavos = freteCentavos != null ? freteCentavos - gastosViagem.total : null;

      return {
        viagemId: v.id,
        dataSaida: v.data_saida,
        caminhaoPlaca: cam?.placa ?? '---',
        motoristaNome: mot?.nome ?? 'Desconhecido',
        kmRealizado,
        custoTotalCentavos: gastosViagem.total,
        custoCombustivelCentavos: gastosViagem.combustivel,
        freteCentavos,
        lucroCentavos,
      };
    });

    // Build comparative stats
    const custos = items.map((i) => i.custoTotalCentavos).filter((c) => c > 0);
    const comparativo =
      custos.length > 0
        ? {
            totalViagens: custos.length,
            custoMinCentavos: Math.min(...custos),
            custoMaxCentavos: Math.max(...custos),
            custoMedioCentavos: Math.round(
              custos.reduce((sum, c) => sum + c, 0) / custos.length,
            ),
          }
        : null;

    return { data: { viagens: items, comparativo }, error: null };
  } catch (err) {
    return { data: null, error: err instanceof Error ? err.message : 'Erro' };
  }
}

// ---------------------------------------------------------------------------
// Eficiencia de Combustivel — km/L per truck
// ---------------------------------------------------------------------------

/** Classify fuel efficiency for cegonheiro trucks. */
function classificarEficiencia(
  kmPorLitro: number | null,
): BIEficienciaItem['classificacao'] {
  if (kmPorLitro == null) return null;
  if (kmPorLitro > 2.5) return 'bom';
  if (kmPorLitro >= 2.0) return 'medio';
  return 'ruim';
}

/**
 * Hybrid km/L calculation per truck.
 *
 * Layer 1 (most precise): Calculate from concluded trips with km_saida & km_chegada.
 *   - Sum km driven per trip: SUM(km_chegada - km_saida)
 *   - Add "invisible km" gaps between consecutive trips (< 500km positive gaps only)
 *   - Divide by total fuel litros for the truck in the period
 *   - Sanity check: result must be between 1.0 and 5.0 km/L
 *
 * Layer 2 (fallback): Mark as 'estimativa' with null km/L ("Dados insuficientes")
 *
 * Research: docs/research/km-por-litro-metodologia.md
 */
export async function getBIEficienciaCombustivel(
  filtros: BIFiltros,
): Promise<{ data: BIEficienciaItem[] | null; error: string | null }> {
  try {
    await requireDono();
    const supabase = await createClient();

    // 1. Fetch concluded trips with km data in the period, grouped by truck
    let viagemQuery = supabase
      .from('viagem')
      .select('id, caminhao_id, km_saida, km_chegada, data_saida')
      .eq('status', 'concluida')
      .not('km_saida', 'is', null)
      .not('km_chegada', 'is', null)
      .gte('data_saida', filtros.periodoInicio)
      .lte('data_saida', filtros.periodoFim)
      .order('data_saida', { ascending: true });

    if (filtros.caminhaoId) {
      viagemQuery = viagemQuery.eq('caminhao_id', filtros.caminhaoId);
    }
    if (filtros.motoristaId) {
      viagemQuery = viagemQuery.eq('motorista_id', filtros.motoristaId);
    }

    // 2. Fetch fuel expenses in the period
    let gastoQuery = supabase
      .from('gasto')
      .select(`
        valor,
        litros,
        caminhao_id,
        caminhao (
          placa,
          modelo
        )
      `)
      .gte('data', filtros.periodoInicio)
      .lte('data', filtros.periodoFim)
      .not('caminhao_id', 'is', null)
      .not('litros', 'is', null)
      .not('tipo_combustivel', 'is', null);

    if (filtros.caminhaoId) {
      gastoQuery = gastoQuery.eq('caminhao_id', filtros.caminhaoId);
    }
    if (filtros.motoristaId) {
      gastoQuery = gastoQuery.eq('motorista_id', filtros.motoristaId);
    }

    const [viagemRes, gastoRes] = await Promise.all([viagemQuery, gastoQuery]);

    if (viagemRes.error) throw new Error(viagemRes.error.message);
    if (gastoRes.error) throw new Error(gastoRes.error.message);

    const viagens = viagemRes.data ?? [];
    const gastos = gastoRes.data ?? [];

    // 3. Group trips by truck and calculate km (trip + gap)
    const tripsByTruck = new Map<string, Array<{ km_saida: number; km_chegada: number }>>();
    for (const v of viagens) {
      if (v.km_saida == null || v.km_chegada == null) continue;
      if (v.km_chegada <= v.km_saida) continue;
      const camId = v.caminhao_id;
      if (!camId) continue;
      const list = tripsByTruck.get(camId) ?? [];
      list.push({ km_saida: v.km_saida, km_chegada: v.km_chegada });
      tripsByTruck.set(camId, list);
    }

    // Calculate total real km per truck (trip km + invisible gap km)
    const kmByTruck = new Map<string, number>();
    for (const [camId, trips] of tripsByTruck) {
      // trips already sorted by data_saida ASC from query
      let tripKm = 0;
      let gapKm = 0;

      for (let i = 0; i < trips.length; i++) {
        tripKm += trips[i].km_chegada - trips[i].km_saida;

        // Calculate gap between consecutive trips
        if (i > 0) {
          const gap = trips[i].km_saida - trips[i - 1].km_chegada;
          // Only count positive gaps < 500km (larger gaps = data error or different assignment)
          if (gap > 0 && gap < 500) {
            gapKm += gap;
          }
        }
      }

      kmByTruck.set(camId, tripKm + gapKm);
    }

    // 4. Aggregate fuel data by truck
    const fuelByTruck = new Map<
      string,
      {
        placa: string;
        modelo: string;
        totalLitros: number;
        totalGastoCentavos: number;
        totalAbastecimentos: number;
      }
    >();

    for (const gasto of gastos) {
      const cam = gasto.caminhao as unknown as {
        placa: string;
        modelo: string;
      } | null;
      const camId = gasto.caminhao_id!;
      const litros = Number(gasto.litros) || 0;
      const existing = fuelByTruck.get(camId);

      if (existing) {
        existing.totalLitros += litros;
        existing.totalGastoCentavos += gasto.valor;
        existing.totalAbastecimentos += 1;
      } else {
        fuelByTruck.set(camId, {
          placa: cam?.placa ?? '---',
          modelo: cam?.modelo ?? '---',
          totalLitros: litros,
          totalGastoCentavos: gasto.valor,
          totalAbastecimentos: 1,
        });
      }
    }

    // 5. Merge: all trucks that have fuel data
    const allTruckIds = new Set([...fuelByTruck.keys()]);
    const items: BIEficienciaItem[] = [];

    for (const camId of allTruckIds) {
      const fuel = fuelByTruck.get(camId)!;
      const totalKm = kmByTruck.get(camId) ?? 0;

      let kmPorLitro: number | null = null;
      let metodo: BIEficienciaItem['metodo'] = null;

      if (totalKm > 0 && fuel.totalLitros > 0) {
        const raw = totalKm / fuel.totalLitros;
        // Sanity check: cegonheiro between 1.0 and 5.0 km/L
        if (raw >= 1.0 && raw <= 5.0) {
          kmPorLitro = Math.round(raw * 100) / 100;
          metodo = 'viagem';
        } else {
          // Outside sane range — mark as insufficient data
          metodo = 'estimativa';
        }
      } else if (fuel.totalLitros > 0) {
        // No trip km data but has fuel — cannot calculate
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
        classificacao: classificarEficiencia(kmPorLitro),
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
// Eficiencia de Combustivel — km/L per driver
// ---------------------------------------------------------------------------

/**
 * Same hybrid km/L calculation but grouped by driver instead of truck.
 */
export async function getBIEficienciaMotoristas(
  filtros: BIFiltros,
): Promise<{ data: BIEficienciaMotoristaItem[] | null; error: string | null }> {
  try {
    await requireDono();
    const supabase = await createClient();

    // 1. Fetch concluded trips with km data, grouped by driver
    let viagemQuery = supabase
      .from('viagem')
      .select('id, motorista_id, km_saida, km_chegada, data_saida')
      .eq('status', 'concluida')
      .not('km_saida', 'is', null)
      .not('km_chegada', 'is', null)
      .gte('data_saida', filtros.periodoInicio)
      .lte('data_saida', filtros.periodoFim)
      .order('data_saida', { ascending: true });

    if (filtros.caminhaoId) {
      viagemQuery = viagemQuery.eq('caminhao_id', filtros.caminhaoId);
    }
    if (filtros.motoristaId) {
      viagemQuery = viagemQuery.eq('motorista_id', filtros.motoristaId);
    }

    // 2. Fetch fuel expenses in the period
    let gastoQuery = supabase
      .from('gasto')
      .select(`
        valor,
        litros,
        motorista_id,
        motorista (
          nome
        )
      `)
      .gte('data', filtros.periodoInicio)
      .lte('data', filtros.periodoFim)
      .not('motorista_id', 'is', null)
      .not('litros', 'is', null)
      .not('tipo_combustivel', 'is', null);

    if (filtros.caminhaoId) {
      gastoQuery = gastoQuery.eq('caminhao_id', filtros.caminhaoId);
    }
    if (filtros.motoristaId) {
      gastoQuery = gastoQuery.eq('motorista_id', filtros.motoristaId);
    }

    const [viagemRes, gastoRes] = await Promise.all([viagemQuery, gastoQuery]);

    if (viagemRes.error) throw new Error(viagemRes.error.message);
    if (gastoRes.error) throw new Error(gastoRes.error.message);

    const viagens = viagemRes.data ?? [];
    const gastos = gastoRes.data ?? [];

    // 3. Group trips by driver and calculate km (trip + gap)
    const tripsByDriver = new Map<string, Array<{ km_saida: number; km_chegada: number }>>();
    for (const v of viagens) {
      if (v.km_saida == null || v.km_chegada == null) continue;
      if (v.km_chegada <= v.km_saida) continue;
      const motId = v.motorista_id;
      if (!motId) continue;
      const list = tripsByDriver.get(motId) ?? [];
      list.push({ km_saida: v.km_saida, km_chegada: v.km_chegada });
      tripsByDriver.set(motId, list);
    }

    const kmByDriver = new Map<string, number>();
    for (const [motId, trips] of tripsByDriver) {
      let tripKm = 0;
      let gapKm = 0;

      for (let i = 0; i < trips.length; i++) {
        tripKm += trips[i].km_chegada - trips[i].km_saida;

        if (i > 0) {
          const gap = trips[i].km_saida - trips[i - 1].km_chegada;
          if (gap > 0 && gap < 500) {
            gapKm += gap;
          }
        }
      }

      kmByDriver.set(motId, tripKm + gapKm);
    }

    // 4. Aggregate fuel data by driver
    const fuelByDriver = new Map<
      string,
      {
        nome: string;
        totalLitros: number;
        totalGastoCentavos: number;
        totalAbastecimentos: number;
      }
    >();

    for (const gasto of gastos) {
      const mot = gasto.motorista as unknown as { nome: string } | null;
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

    // 5. Merge
    const items: BIEficienciaMotoristaItem[] = [];

    for (const motId of fuelByDriver.keys()) {
      const fuel = fuelByDriver.get(motId)!;
      const totalKm = kmByDriver.get(motId) ?? 0;

      let kmPorLitro: number | null = null;
      let metodo: BIEficienciaMotoristaItem['metodo'] = null;

      if (totalKm > 0 && fuel.totalLitros > 0) {
        const raw = totalKm / fuel.totalLitros;
        if (raw >= 1.0 && raw <= 5.0) {
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
        classificacao: classificarEficiencia(kmPorLitro),
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
// Manutencoes — maintenance tracking per truck
// ---------------------------------------------------------------------------

/** Category names considered maintenance-related. */
const CATEGORIAS_MANUTENCAO = ['Manutencao', 'Pneu'];

export async function getBIManutencoes(
  filtros: BIFiltros,
): Promise<{ data: BIManutencaoTruckItem[] | null; error: string | null }> {
  try {
    await requireDono();
    const supabase = await createClient();

    // First, get the IDs of maintenance categories
    const { data: catData, error: catError } = await supabase
      .from('categoria_gasto')
      .select('id, nome, icone, cor')
      .in('nome', CATEGORIAS_MANUTENCAO);

    if (catError) throw new Error(catError.message);
    if (!catData || catData.length === 0) {
      return { data: [], error: null };
    }

    const catIds = catData.map((c) => c.id);
    const catMap = new Map(catData.map((c) => [c.id, c]));

    // Fetch maintenance gastos in the period
    let query = supabase
      .from('gasto')
      .select(`
        valor,
        data,
        categoria_id,
        caminhao_id,
        caminhao (
          placa,
          modelo
        )
      `)
      .in('categoria_id', catIds)
      .gte('data', filtros.periodoInicio)
      .lte('data', filtros.periodoFim)
      .not('caminhao_id', 'is', null);

    if (filtros.caminhaoId) {
      query = query.eq('caminhao_id', filtros.caminhaoId);
    }
    if (filtros.motoristaId) {
      query = query.eq('motorista_id', filtros.motoristaId);
    }

    const { data: gastos, error } = await query;
    if (error) throw new Error(error.message);

    // Aggregate by truck, with tipo breakdown
    const byTruck = new Map<
      string,
      {
        caminhaoId: string;
        placa: string;
        modelo: string;
        totalCustoCentavos: number;
        totalEventos: number;
        ultimaManutencao: string | null;
        tipoMap: Map<string, { total: number; count: number }>;
      }
    >();

    for (const gasto of gastos ?? []) {
      const cam = gasto.caminhao as unknown as {
        placa: string;
        modelo: string;
      } | null;
      const camId = gasto.caminhao_id!;
      const existing = byTruck.get(camId);

      if (existing) {
        existing.totalCustoCentavos += gasto.valor;
        existing.totalEventos += 1;
        if (
          !existing.ultimaManutencao ||
          gasto.data > existing.ultimaManutencao
        ) {
          existing.ultimaManutencao = gasto.data;
        }
        const tipoEntry = existing.tipoMap.get(gasto.categoria_id) ?? {
          total: 0,
          count: 0,
        };
        tipoEntry.total += gasto.valor;
        tipoEntry.count += 1;
        existing.tipoMap.set(gasto.categoria_id, tipoEntry);
      } else {
        const tipoMap = new Map<string, { total: number; count: number }>();
        tipoMap.set(gasto.categoria_id, {
          total: gasto.valor,
          count: 1,
        });
        byTruck.set(camId, {
          caminhaoId: camId,
          placa: cam?.placa ?? '---',
          modelo: cam?.modelo ?? '---',
          totalCustoCentavos: gasto.valor,
          totalEventos: 1,
          ultimaManutencao: gasto.data,
          tipoMap,
        });
      }
    }

    const items: BIManutencaoTruckItem[] = Array.from(byTruck.values())
      .map((truck) => {
        const tipos: BIManutencaoTipoItem[] = Array.from(
          truck.tipoMap.entries(),
        ).map(([catId, data]) => {
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
          caminhaoId: truck.caminhaoId,
          placa: truck.placa,
          modelo: truck.modelo,
          totalCustoCentavos: truck.totalCustoCentavos,
          totalEventos: truck.totalEventos,
          ultimaManutencao: truck.ultimaManutencao,
          tipos,
        };
      })
      .sort((a, b) => b.totalCustoCentavos - a.totalCustoCentavos);

    return { data: items, error: null };
  } catch (err) {
    return { data: null, error: err instanceof Error ? err.message : 'Erro' };
  }
}
