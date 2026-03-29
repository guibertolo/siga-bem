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
