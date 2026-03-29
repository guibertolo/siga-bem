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
// KPIs
// ---------------------------------------------------------------------------

export async function getBIKpis(
  filtros: BIFiltros,
): Promise<{ data: BIKpis | null; error: string | null }> {
  try {
    await requireDono();
    const supabase = await createClient();

    // Build gasto query
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

    const { data: gastos, error: gastoError } = await gastoQuery;
    if (gastoError) throw new Error(gastoError.message);

    const totalGastos = (gastos ?? []).reduce((sum, g) => sum + g.valor, 0);
    const totalLancamentos = gastos?.length ?? 0;

    // Count distinct viagens
    const viagemIds = new Set(
      (gastos ?? []).map((g) => g.viagem_id).filter(Boolean),
    );
    const gastoMedioPorViagem =
      viagemIds.size > 0 ? Math.round(totalGastos / viagemIds.size) : 0;

    // Custo por km: fetch viagens with km data in the period
    let custoPorKm: number | null = null;
    let viagemKmQuery = supabase
      .from('viagem')
      .select('km_saida, km_chegada')
      .gte('data_saida', filtros.periodoInicio)
      .lte('data_saida', filtros.periodoFim)
      .not('km_saida', 'is', null)
      .not('km_chegada', 'is', null);

    if (filtros.caminhaoId) {
      viagemKmQuery = viagemKmQuery.eq('caminhao_id', filtros.caminhaoId);
    }
    if (filtros.motoristaId) {
      viagemKmQuery = viagemKmQuery.eq('motorista_id', filtros.motoristaId);
    }

    const { data: viagens } = await viagemKmQuery;
    if (viagens && viagens.length > 0) {
      const totalKm = viagens.reduce((sum, v) => {
        const km = (v.km_chegada ?? 0) - (v.km_saida ?? 0);
        return sum + (km > 0 ? km : 0);
      }, 0);
      if (totalKm > 0) {
        custoPorKm = Math.round(totalGastos / totalKm);
      }
    }

    return {
      data: {
        totalGastos,
        totalLancamentos,
        gastoMedioPorViagem,
        custoPorKm,
      },
      error: null,
    };
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

    // Try to get real consumption from truck history
    if (params.caminhaoId) {
      const { data: caminhaoView } = await supabase
        .from('vw_custo_por_caminhao')
        .select('km_por_litro_estimado')
        .eq('caminhao_id', params.caminhaoId)
        .single();

      if (caminhaoView?.km_por_litro_estimado && caminhaoView.km_por_litro_estimado > 0) {
        consumoKmL = Number(caminhaoView.km_por_litro_estimado);
        fonteConsumo = 'historico_real';
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
