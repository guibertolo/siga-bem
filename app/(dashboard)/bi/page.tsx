import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { Suspense } from 'react';
import { getCurrentUsuario } from '@/lib/auth/get-user-role';
import { getMultiEmpresaContext } from '@/lib/queries/multi-empresa';
import { queryMultiEmpresa } from '@/lib/queries/multi-empresa-query';

export const metadata: Metadata = {
  title: 'Resultado da Frota',
};
import {
  getBIFilterOptions,
  getBIKpis,
  getBIMargemMotoristas,
  getBICategoriasBreakdown,
  getBIRankingCaminhoes,
  getBIEficienciaMotoristas,
  getBITendenciaMensal,
  getBIEficienciaCombustivel,
  getBIManutencoes,
  getBIAlertas,
  getBenchmarkSetor,
} from '@/app/(dashboard)/bi/actions';
import {
  getBIFilterOptionsForEmpresa,
  getBIKpisForEmpresa,
  getBIMargemMotoristasForEmpresa,
  getBICategoriasBreakdownForEmpresa,
  getBIRankingCaminhoesForEmpresa,
  getBIEficienciaMotoristasForEmpresa,
  getBITendenciaMensalForEmpresa,
  getBIEficienciaCombustivelForEmpresa,
  getBIManutencoesForEmpresa,
  getBIAlertasForEmpresa,
} from '@/app/(dashboard)/bi/multi-actions';
import { BiFiltros } from '@/components/bi/BiFiltros';
import { BiAlertas } from '@/components/bi/BiAlertas';
import { BiKpiCards } from '@/components/bi/BiKpiCards';
import { BiMargemMotoristas } from '@/components/bi/BiMargemMotoristas';
import { BiBreakdownCategorias } from '@/components/bi/BiBreakdownCategorias';
import { BiRankingCaminhoes } from '@/components/bi/BiRankingCaminhoes';
import { BiRankingMotoristas } from '@/components/bi/BiRankingMotoristas';
import { BiTendenciaMensal } from '@/components/bi/BiTendenciaMensal';
import { BiPrevisaoMargens } from '@/components/bi/BiPrevisaoMargens';
import { BiEficienciaCombustivel } from '@/components/bi/BiEficienciaCombustivel';
import { BiManutencoes } from '@/components/bi/BiManutencoes';
import { BiBenchmarkSetor } from '@/components/bi/BiBenchmarkSetor';
import type { BIFiltros, BIKpis, BITendenciaMensalItem, BICategoriaItem } from '@/types/bi';

interface BiPageProps {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

function parsePeriodoDays(value: string | string[] | undefined): number {
  const str = Array.isArray(value) ? value[0] : value;
  const num = parseInt(str ?? '30', 10);
  if ([30, 90, 180, 365].includes(num)) return num;
  return 30;
}

function parseOptionalString(
  value: string | string[] | undefined,
): string | undefined {
  if (!value) return undefined;
  const str = Array.isArray(value) ? value[0] : value;
  return str || undefined;
}

/**
 * Aggregate KPIs from multiple empresas by summing numeric fields.
 */
function aggregateKpis(
  results: Array<{ data: { data: BIKpis | null; error: string | null } }>,
): BIKpis | null {
  const allData = results.map((r) => r.data.data).filter(Boolean) as BIKpis[];
  if (allData.length === 0) return null;

  const summed = allData.reduce(
    (acc, d) => ({
      receitaFrete: acc.receitaFrete + d.receitaFrete,
      custoTotal: acc.custoTotal + d.custoTotal,
      lucroBruto: acc.lucroBruto + d.lucroBruto,
      viagensConcluidas: acc.viagensConcluidas + d.viagensConcluidas,
    }),
    { receitaFrete: 0, custoTotal: 0, lucroBruto: 0, viagensConcluidas: 0 },
  );

  const margemPercentual = summed.receitaFrete > 0
    ? Math.round((summed.lucroBruto / summed.receitaFrete) * 100)
    : 0;
  const margemMediaViagem = summed.viagensConcluidas > 0
    ? Math.round(summed.lucroBruto / summed.viagensConcluidas)
    : 0;

  return {
    receitaFrete: summed.receitaFrete,
    custoTotal: summed.custoTotal,
    lucroBruto: summed.lucroBruto,
    margemPercentual,
    viagensConcluidas: summed.viagensConcluidas,
    margemMediaViagem,
    margemMediaPercentual: margemPercentual,
  };
}

/**
 * Aggregate tendencia items by mesAno — sum totals for same month across empresas.
 */
function aggregateTendencia(items: BITendenciaMensalItem[]): BITendenciaMensalItem[] {
  const map = new Map<string, BITendenciaMensalItem>();
  for (const item of items) {
    const existing = map.get(item.mesAno);
    if (existing) {
      existing.total += item.total;
    } else {
      map.set(item.mesAno, { ...item });
    }
  }
  return Array.from(map.values());
}

/**
 * Aggregate categoria items by categoriaId — sum totals for same category across empresas.
 */
function aggregateCategorias(items: BICategoriaItem[]): BICategoriaItem[] {
  const map = new Map<string, BICategoriaItem>();
  let grandTotal = 0;
  for (const item of items) {
    grandTotal += item.total;
    const existing = map.get(item.categoriaId);
    if (existing) {
      existing.total += item.total;
      existing.qtdLancamentos += item.qtdLancamentos;
    } else {
      map.set(item.categoriaId, { ...item });
    }
  }
  // Recalculate percentages
  const result = Array.from(map.values());
  for (const cat of result) {
    cat.porcentagem = grandTotal > 0 ? (cat.total / grandTotal) * 100 : 0;
  }
  return result;
}

export default async function BiPage({ searchParams }: BiPageProps) {
  // Access control: ONLY dono
  const usuario = await getCurrentUsuario();
  if (!usuario || usuario.role !== 'dono') {
    redirect('/dashboard');
  }

  const multiCtx = await getMultiEmpresaContext();
  const params = await searchParams;

  // Build date range from periodo
  const periodoDays = parsePeriodoDays(params.periodo);
  const now = new Date();
  const periodoFim = now.toISOString().split('T')[0];
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - periodoDays);
  const periodoInicio = startDate.toISOString().split('T')[0];

  const filtros: BIFiltros = {
    periodoInicio,
    periodoFim,
    caminhaoId: parseOptionalString(params.caminhaoId),
    motoristaId: parseOptionalString(params.motoristaId),
    categoriaId: parseOptionalString(params.categoriaId),
  };

  let filterOpts: Awaited<ReturnType<typeof getBIFilterOptions>>;
  let alertas: Awaited<ReturnType<typeof getBIAlertas>>;
  let kpis: { data: BIKpis | null; error?: string | null };
  let margemMotoristas: Awaited<ReturnType<typeof getBIMargemMotoristas>>;
  let categorias: Awaited<ReturnType<typeof getBICategoriasBreakdown>>;
  let caminhoes: Awaited<ReturnType<typeof getBIRankingCaminhoes>>;
  let motoristas: Awaited<ReturnType<typeof getBIEficienciaMotoristas>>;
  let tendencia: Awaited<ReturnType<typeof getBITendenciaMensal>>;
  let eficiencia: Awaited<ReturnType<typeof getBIEficienciaCombustivel>>;
  let manutencoes: Awaited<ReturnType<typeof getBIManutencoes>>;
  let benchmark: Awaited<ReturnType<typeof getBenchmarkSetor>>;

  if (multiCtx.isMultiEmpresa) {
    // Multi-empresa: use admin client with explicit empresa_id filter
    // Each query runs against the admin client, no fn_switch_empresa needed
    const [
      multiFilterOpts,
      multiAlertas,
      multiKpis,
      multiMargem,
      multiCategorias,
      multiCaminhoes,
      multiMotoristas,
      multiTendencia,
      multiEficiencia,
      multiManutencoes,
      multiBenchmark,
    ] = await Promise.all([
      queryMultiEmpresa((admin, eid) => getBIFilterOptionsForEmpresa(admin, eid)),
      queryMultiEmpresa((admin, eid) => getBIAlertasForEmpresa(admin, eid, filtros)),
      queryMultiEmpresa((admin, eid) => getBIKpisForEmpresa(admin, eid, filtros)),
      queryMultiEmpresa((admin, eid) => getBIMargemMotoristasForEmpresa(admin, eid, filtros)),
      queryMultiEmpresa((admin, eid) => getBICategoriasBreakdownForEmpresa(admin, eid, filtros)),
      queryMultiEmpresa((admin, eid) => getBIRankingCaminhoesForEmpresa(admin, eid, filtros)),
      queryMultiEmpresa((admin, eid) => getBIEficienciaMotoristasForEmpresa(admin, eid, filtros)),
      queryMultiEmpresa((admin, eid) => getBITendenciaMensalForEmpresa(admin, eid, filtros)),
      queryMultiEmpresa((admin, eid) => getBIEficienciaCombustivelForEmpresa(admin, eid, filtros)),
      queryMultiEmpresa((admin, eid) => getBIManutencoesForEmpresa(admin, eid, filtros)),
      queryMultiEmpresa((admin, eid) => {
        // Benchmark is global, just return first empresa's view
        void eid;
        return getBenchmarkSetor();
      }),
    ]);

    // For filter options, merge all and deduplicate by id
    function dedup<T extends { id: string }>(items: T[]): T[] {
      const seen = new Set<string>();
      return items.filter(item => {
        if (seen.has(item.id)) return false;
        seen.add(item.id);
        return true;
      });
    }
    const mergedFilterOpts = {
      caminhoes: dedup(multiFilterOpts.flatMap((r) => r.data.data?.caminhoes ?? [])),
      motoristas: dedup(multiFilterOpts.flatMap((r) => r.data.data?.motoristas ?? [])),
      categorias: dedup(multiFilterOpts.flatMap((r) => r.data.data?.categorias ?? [])),
    };

    filterOpts = { data: mergedFilterOpts, error: null };
    alertas = {
      data: multiAlertas.flatMap((r) => r.data.data ?? []),
      verificados: multiAlertas.flatMap((r) => r.data.verificados ?? []),
      error: null,
    };
    kpis = { data: aggregateKpis(multiKpis), error: null };
    margemMotoristas = { data: multiMargem.flatMap((r) => r.data.data ?? []), error: null };
    // Aggregate categorias by categoriaId (same category across empresas should be summed)
    categorias = {
      data: aggregateCategorias(multiCategorias.flatMap((r) => r.data.data ?? [])),
      error: null,
    };
    caminhoes = { data: multiCaminhoes.flatMap((r) => r.data.data ?? []), error: null };
    motoristas = { data: multiMotoristas.flatMap((r) => r.data.data ?? []), error: null };
    // Aggregate tendencia by mesAno (same month across empresas must be summed, not duplicated)
    tendencia = {
      data: aggregateTendencia(multiTendencia.flatMap((r) => r.data.data ?? [])),
      error: null,
    };
    eficiencia = { data: multiEficiencia.flatMap((r) => r.data.data ?? []), error: null };
    manutencoes = { data: multiManutencoes.flatMap((r) => r.data.data ?? []), error: null };
    benchmark = multiBenchmark[0]?.data ?? { data: null };
  } else {
    // Single empresa: original behavior
    const results = await Promise.all([
      getBIFilterOptions(),
      getBIAlertas(filtros),
      getBIKpis(filtros),
      getBIMargemMotoristas(filtros),
      getBICategoriasBreakdown(filtros),
      getBIRankingCaminhoes(filtros),
      getBIEficienciaMotoristas(filtros),
      getBITendenciaMensal(filtros),
      getBIEficienciaCombustivel(filtros),
      getBIManutencoes(filtros),
      getBenchmarkSetor(),
    ]);

    filterOpts = results[0];
    alertas = results[1];
    kpis = results[2];
    margemMotoristas = results[3];
    categorias = results[4];
    caminhoes = results[5];
    motoristas = results[6];
    tendencia = results[7];
    eficiencia = results[8];
    manutencoes = results[9];
    benchmark = results[10];
  }

  const options = filterOpts.data ?? {
    caminhoes: [],
    motoristas: [],
    categorias: [],
  };

  return (
    <div className="w-full max-w-7xl">
      <div className="mb-6">
        <h2 className="text-2xl sm:text-3xl font-bold text-primary-900">
          Resultado da Frota
        </h2>
        <p className="text-sm text-primary-500 mt-1">
          {multiCtx.isMultiEmpresa
            ? `Dados consolidados de ${multiCtx.empresaIds.length} empresas`
            : 'Veja o resultado real do seu negócio'}
        </p>
      </div>

      {/* 1. Filtros */}
      <div className="mb-6">
        <Suspense
          fallback={
            <div className="h-20 animate-pulse rounded-lg bg-surface-muted" />
          }
        >
          <BiFiltros options={options} />
        </Suspense>
      </div>

      {/* 2. Alertas de Anomalia — first thing the dono sees */}
      <div className="mb-6">
        <BiAlertas data={alertas.data} verificados={alertas.verificados} />
      </div>

      {/* 3. Hero KPIs — profit-first cards */}
      <div className="mb-6">
        <BiKpiCards data={kpis.data} />
      </div>

      {/* 3b. Benchmark Setor — cross-company anonymous comparison */}
      <div className="mb-6">
        <BiBenchmarkSetor
          setor={benchmark.data?.setor ?? null}
          proprio={benchmark.data?.proprio ?? null}
        />
      </div>

      {/* 3. Margem por Motorista */}
      <div className="mb-6">
        <BiMargemMotoristas data={margemMotoristas.data} />
      </div>

      {/* 4. Eficiencia de Combustivel */}
      <div className="mb-6">
        <BiEficienciaCombustivel data={eficiencia.data} />
      </div>

      {/* 5. Manutencoes */}
      <div className="mb-6">
        <BiManutencoes data={manutencoes.data} />
      </div>

      {/* 6. Tendencia Mensal */}
      <div className="mb-6">
        <BiTendenciaMensal data={tendencia.data} />
      </div>

      {/* 7. Rankings side by side on desktop */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        <BiRankingCaminhoes data={caminhoes.data} />
        <BiRankingMotoristas data={motoristas.data} />
      </div>

      {/* 8. Category Breakdown */}
      <div className="mb-6">
        <BiBreakdownCategorias data={categorias.data} />
      </div>

      {/* Separator */}
      <div className="mb-6 border-t border-surface-border" />

      {/* 9. Simulador / Rotas */}
      <div className="mb-6">
        <h2 className="text-2xl sm:text-3xl font-bold text-primary-900">
          Calcular Custo de Viagem
        </h2>
        <p className="text-sm text-primary-500 mt-1">
          Calcule quanto vai gastar numa viagem e veja se o frete compensa
        </p>
      </div>

      <div className="mb-6">
        <BiPrevisaoMargens caminhoes={options.caminhoes} />
      </div>
    </div>
  );
}
