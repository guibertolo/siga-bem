'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import { singleRelation } from '@/lib/utils/supabase-types';
import { getCurrentUsuario } from '@/lib/auth/get-user-role';
import type {
  BIFiltros,
  BIEstimativaParams,
  BIEstimativaResult,
  BIHistoricoRotasParams,
  BIHistoricoRotasResult,
  BIHistoricoRotaItem,
  BIBenchmarkSetor,
  BIBenchmarkProprio,
} from '@/types/bi';
import {
  getBIFilterOptionsRepo,
  getBIKpisRepo,
  getBIMargemMotoristasRepo,
  getBICategoriasBreakdownRepo,
  getBIRankingCaminhoesRepo,
  getBIRankingMotoristasRepo,
  getBITendenciaMensalRepo,
  getBIEficienciaCombustivelRepo,
  getBIEficienciaMotoristasRepo,
  getBIManutencoesRepo,
  getBIAlertasRepo,
} from '@/lib/repositories/bi';

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
// Read operations — delegate to repository
// ---------------------------------------------------------------------------

export async function getBIFilterOptions() {
  try {
    const usuario = await requireDono();
    const supabase = await createClient();
    return getBIFilterOptionsRepo(supabase, [usuario.empresa_id!]);
  } catch (err) {
    return { data: null, error: err instanceof Error ? err.message : 'Erro' };
  }
}

export async function getBIKpis(filtros: BIFiltros) {
  try {
    const usuario = await requireDono();
    const supabase = await createClient();
    return getBIKpisRepo(supabase, [usuario.empresa_id!], filtros);
  } catch (err) {
    return { data: null, error: err instanceof Error ? err.message : 'Erro' };
  }
}

export async function getBIMargemMotoristas(filtros: BIFiltros) {
  try {
    const usuario = await requireDono();
    const supabase = await createClient();
    return getBIMargemMotoristasRepo(supabase, [usuario.empresa_id!], filtros);
  } catch (err) {
    return { data: null, error: err instanceof Error ? err.message : 'Erro' };
  }
}

export async function getBICategoriasBreakdown(filtros: BIFiltros) {
  try {
    const usuario = await requireDono();
    const supabase = await createClient();
    return getBICategoriasBreakdownRepo(supabase, [usuario.empresa_id!], filtros);
  } catch (err) {
    return { data: null, error: err instanceof Error ? err.message : 'Erro' };
  }
}

export async function getBIRankingCaminhoes(filtros: BIFiltros) {
  try {
    const usuario = await requireDono();
    const supabase = await createClient();
    return getBIRankingCaminhoesRepo(supabase, [usuario.empresa_id!], filtros);
  } catch (err) {
    return { data: null, error: err instanceof Error ? err.message : 'Erro' };
  }
}

export async function getBIRankingMotoristas(filtros: BIFiltros) {
  try {
    const usuario = await requireDono();
    const supabase = await createClient();
    return getBIRankingMotoristasRepo(supabase, [usuario.empresa_id!], filtros);
  } catch (err) {
    return { data: null, error: err instanceof Error ? err.message : 'Erro' };
  }
}

export async function getBITendenciaMensal(filtros: BIFiltros) {
  try {
    const usuario = await requireDono();
    const supabase = await createClient();
    return getBITendenciaMensalRepo(supabase, [usuario.empresa_id!], filtros);
  } catch (err) {
    return { data: null, error: err instanceof Error ? err.message : 'Erro' };
  }
}

export async function getBIEficienciaCombustivel(filtros: BIFiltros) {
  try {
    const usuario = await requireDono();
    const supabase = await createClient();
    return getBIEficienciaCombustivelRepo(supabase, [usuario.empresa_id!], filtros);
  } catch (err) {
    return { data: null, error: err instanceof Error ? err.message : 'Erro' };
  }
}

export async function getBIEficienciaMotoristas(filtros: BIFiltros) {
  try {
    const usuario = await requireDono();
    const supabase = await createClient();
    return getBIEficienciaMotoristasRepo(supabase, [usuario.empresa_id!], filtros);
  } catch (err) {
    return { data: null, error: err instanceof Error ? err.message : 'Erro' };
  }
}

export async function getBIManutencoes(filtros: BIFiltros) {
  try {
    const usuario = await requireDono();
    const supabase = await createClient();
    return getBIManutencoesRepo(supabase, [usuario.empresa_id!], filtros);
  } catch (err) {
    return { data: null, error: err instanceof Error ? err.message : 'Erro' };
  }
}

export async function getBIAlertas(filtros: BIFiltros) {
  try {
    const usuario = await requireDono();
    const supabase = await createClient();
    return getBIAlertasRepo(supabase, [usuario.empresa_id!], filtros);
  } catch (err) {
    return { data: null, error: err instanceof Error ? err.message : 'Erro' };
  }
}

// ---------------------------------------------------------------------------
// Mutations — stay in actions.ts
// ---------------------------------------------------------------------------

/**
 * Dismiss an alert — marks it as verified by the dono.
 */
export async function dispensarAlerta(
  tipo: string,
  entidade: string,
): Promise<{ success: boolean; error?: string }> {
  try {
    const usuario = await requireDono();
    const supabase = await createClient();

    const { error } = await supabase
      .from('alerta_dispensado')
      .upsert({
        empresa_id: usuario.empresa_id,
        tipo,
        entidade,
        dispensado_por: usuario.id,
        dispensado_em: new Date().toISOString(),
      }, { onConflict: 'empresa_id,tipo,entidade' });

    if (error) return { success: false, error: error.message };

    revalidatePath('/bi');
    return { success: true };
  } catch {
    return { success: false, error: 'Erro ao dispensar alerta' };
  }
}

export async function reativarAlerta(
  tipo: string,
  entidade: string,
): Promise<{ success: boolean; error?: string }> {
  try {
    const usuario = await requireDono();
    const supabase = await createClient();

    const { error } = await supabase
      .from('alerta_dispensado')
      .delete()
      .eq('empresa_id', usuario.empresa_id)
      .eq('tipo', tipo)
      .eq('entidade', entidade);

    if (error) return { success: false, error: error.message };

    revalidatePath('/bi');
    return { success: true };
  } catch {
    return { success: false, error: 'Erro ao reativar alerta' };
  }
}

// ---------------------------------------------------------------------------
// Unique read functions that stay in actions (complex/specialized logic)
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

    if (params.caminhaoId) {
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

    let precoMedioLitroCentavos = PRECO_DIESEL_PADRAO;
    let fontePreco: BIEstimativaResult['fontePreco'] = 'padrao';

    const { data: mediaPreco } = await supabase
      .from('vw_media_combustivel_regiao')
      .select('preco_medio_litro')
      .eq('tipo_combustivel', params.tipoCombustivel)
      .order('ultima_data', { ascending: false })
      .limit(1)
      .single();

    if (mediaPreco?.preco_medio_litro && Number(mediaPreco.preco_medio_litro) > 0) {
      precoMedioLitroCentavos = Math.round(Number(mediaPreco.preco_medio_litro) * 100);
      fontePreco = 'historico';
    } else {
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

    const viagemIds = viagens.map((v) => v.id);
    const { data: gastos, error: gastoError } = await supabase
      .from('gasto')
      .select('viagem_id, valor, tipo_combustivel')
      .in('viagem_id', viagemIds);

    if (gastoError) throw new Error(gastoError.message);

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
      const cam = singleRelation<{ placa: string }>(v.caminhao);
      const mot = singleRelation<{ nome: string }>(v.motorista);
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
// Benchmarking Setor
// ---------------------------------------------------------------------------

export async function getBenchmarkSetor(): Promise<{
  data: {
    setor: BIBenchmarkSetor[];
    proprio: BIBenchmarkProprio[];
  } | null;
  error: string | null;
}> {
  try {
    const usuario = await requireDono();
    const supabase = await createClient();

    const { data: setorRows, error: setorErr } = await supabase
      .from('benchmarking_setor')
      .select('*');

    if (setorErr) throw new Error(setorErr.message);

    const setor: BIBenchmarkSetor[] = (setorRows ?? []).map((row) => ({
      tipoCegonha: row.tipo_cegonha,
      totalEmpresas: row.total_empresas,
      medianaKml: row.mediana_kml != null ? Number(row.mediana_kml) : null,
      medianaCustoPorKm: row.mediana_custo_por_km_centavos,
      medianaPctCombustivelFrete:
        row.mediana_pct_combustivel_frete != null
          ? Number(row.mediana_pct_combustivel_frete)
          : null,
      medianaMargemViagem:
        row.mediana_margem_viagem_pct != null
          ? Number(row.mediana_margem_viagem_pct)
          : null,
      medianaManutencoesPorCaminhao:
        row.mediana_manutencoes_por_caminhao != null
          ? Number(row.mediana_manutencoes_por_caminhao)
          : null,
      atualizadoEm: row.atualizado_em,
    }));

    if (!usuario.empresa_id) {
      return { data: { setor, proprio: [] }, error: null };
    }
    const proprio = await calcularMetricasProprias(supabase, usuario.empresa_id);

    return { data: { setor, proprio }, error: null };
  } catch (err) {
    return { data: null, error: err instanceof Error ? err.message : 'Erro' };
  }
}

/**
 * Calculate the current empresa's own fleet metrics grouped by tipo_cegonha.
 */
async function calcularMetricasProprias(
  supabase: Awaited<ReturnType<typeof createClient>>,
  empresaId: string,
): Promise<BIBenchmarkProprio[]> {
  const { data: caminhoes } = await supabase
    .from('caminhao')
    .select('id, tipo_cegonha')
    .eq('empresa_id', empresaId)
    .eq('ativo', true);

  if (!caminhoes || caminhoes.length === 0) return [];

  const tipoMap = new Map<string, string[]>();
  for (const c of caminhoes) {
    const ids = tipoMap.get(c.tipo_cegonha) ?? [];
    ids.push(c.id);
    tipoMap.set(c.tipo_cegonha, ids);
  }

  const oneYearAgo = new Date();
  oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);
  const dataInicio = oneYearAgo.toISOString().split('T')[0];

  const { data: viagens } = await supabase
    .from('viagem')
    .select('id, caminhao_id, km_saida, km_chegada, valor_total')
    .eq('status', 'concluida')
    .gte('data_saida', dataInicio);

  if (!viagens || viagens.length === 0) return [];

  const viagemIds = viagens.map((v) => v.id);

  const { data: gastos } = await supabase
    .from('gasto')
    .select('valor, viagem_id, litros, categoria_id, caminhao_id')
    .in('viagem_id', viagemIds);

  const { data: catCombustivel } = await supabase
    .from('categoria_gasto')
    .select('id')
    .ilike('nome', 'combustivel')
    .limit(1)
    .single();

  const combustivelCatId = catCombustivel?.id ?? null;

  const { data: catManutencao } = await supabase
    .from('categoria_gasto')
    .select('id')
    .ilike('nome', 'manutencao')
    .limit(1)
    .single();

  const manutencaoCatId = catManutencao?.id ?? null;

  const resultados: BIBenchmarkProprio[] = [];

  for (const [tipo, caminhaoIds] of tipoMap) {
    const camSet = new Set(caminhaoIds);

    const viagensTipo = viagens.filter((v) => camSet.has(v.caminhao_id));
    if (viagensTipo.length === 0) {
      resultados.push({
        tipoCegonha: tipo,
        kml: null,
        custoPorKm: null,
        pctCombustivelFrete: null,
        margemViagem: null,
        manutencoesPorCaminhao: null,
      });
      continue;
    }

    const viagemIdsTipo = new Set(viagensTipo.map((v) => v.id));
    const gastosTipo = (gastos ?? []).filter(
      (g) => g.viagem_id && viagemIdsTipo.has(g.viagem_id),
    );

    let totalKm = 0;
    let totalLitros = 0;
    for (const v of viagensTipo) {
      if (v.km_saida != null && v.km_chegada != null && v.km_chegada > v.km_saida) {
        totalKm += v.km_chegada - v.km_saida;
      }
    }
    for (const g of gastosTipo) {
      if (g.litros != null && Number(g.litros) > 0) {
        totalLitros += Number(g.litros);
      }
    }
    const kml = totalLitros > 0 && totalKm > 0
      ? Math.round((totalKm / totalLitros) * 100) / 100
      : null;

    const totalGasto = gastosTipo.reduce((sum, g) => sum + g.valor, 0);
    const custoPorKm = totalKm > 0
      ? Math.round(totalGasto / totalKm)
      : null;

    const totalFrete = viagensTipo.reduce((sum, v) => sum + (v.valor_total ?? 0), 0);
    const totalCombustivel = gastosTipo
      .filter((g) => combustivelCatId && g.categoria_id === combustivelCatId)
      .reduce((sum, g) => sum + g.valor, 0);
    const pctCombustivelFrete = totalFrete > 0
      ? Math.round((totalCombustivel / totalFrete) * 1000) / 10
      : null;

    const margemViagem = totalFrete > 0
      ? Math.round(((totalFrete - totalGasto) / totalFrete) * 1000) / 10
      : null;

    const totalManutencoes = (gastos ?? []).filter(
      (g) =>
        manutencaoCatId &&
        g.categoria_id === manutencaoCatId &&
        g.caminhao_id &&
        camSet.has(g.caminhao_id),
    ).length;
    const manutencoesPorCaminhao = caminhaoIds.length > 0
      ? Math.round((totalManutencoes / caminhaoIds.length) * 10) / 10
      : null;

    resultados.push({
      tipoCegonha: tipo,
      kml,
      custoPorKm,
      pctCombustivelFrete,
      margemViagem,
      manutencoesPorCaminhao,
    });
  }

  return resultados;
}
