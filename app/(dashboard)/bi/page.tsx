import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { Suspense } from 'react';
import { getCurrentUsuario } from '@/lib/auth/get-user-role';

export const metadata: Metadata = {
  title: 'Resumo dos Gastos',
};
import {
  getBIFilterOptions,
  getBIKpis,
  getBICategoriasBreakdown,
  getBIRankingCaminhoes,
  getBIRankingMotoristas,
  getBITendenciaMensal,
} from '@/app/(dashboard)/bi/actions';
import { BiFiltros } from '@/components/bi/BiFiltros';
import { BiKpiCards } from '@/components/bi/BiKpiCards';
import { BiBreakdownCategorias } from '@/components/bi/BiBreakdownCategorias';
import { BiRankingCaminhoes } from '@/components/bi/BiRankingCaminhoes';
import { BiRankingMotoristas } from '@/components/bi/BiRankingMotoristas';
import { BiTendenciaMensal } from '@/components/bi/BiTendenciaMensal';
import { BiPrevisaoMargens } from '@/components/bi/BiPrevisaoMargens';
import type { BIFiltros } from '@/types/bi';

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

export default async function BiPage({ searchParams }: BiPageProps) {
  // Access control: ONLY dono
  const usuario = await getCurrentUsuario();
  if (!usuario || usuario.role !== 'dono') {
    redirect('/dashboard');
  }

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

  // Fetch all data in parallel
  const [filterOpts, kpis, categorias, caminhoes, motoristas, tendencia] =
    await Promise.all([
      getBIFilterOptions(),
      getBIKpis(filtros),
      getBICategoriasBreakdown(filtros),
      getBIRankingCaminhoes(filtros),
      getBIRankingMotoristas(filtros),
      getBITendenciaMensal(filtros),
    ]);

  const options = filterOpts.data ?? {
    caminhoes: [],
    motoristas: [],
    categorias: [],
  };

  return (
    <div className="w-full max-w-7xl">
      <div className="mb-6">
        <h2 className="text-2xl sm:text-3xl font-bold text-primary-900">
          Resumo dos Gastos
        </h2>
        <p className="text-sm text-primary-500 mt-1">
          Veja quanto a frota gastou e onde foi o dinheiro
        </p>
      </div>

      {/* Filters */}
      <div className="mb-6">
        <Suspense
          fallback={
            <div className="h-20 animate-pulse rounded-lg bg-gray-100" />
          }
        >
          <BiFiltros options={options} />
        </Suspense>
      </div>

      {/* Resumo em Numeros */}
      <div className="mb-6">
        <BiKpiCards data={kpis.data} />
      </div>

      {/* Category Breakdown */}
      <div className="mb-6">
        <BiBreakdownCategorias data={categorias.data} />
      </div>

      {/* Rankings side by side on desktop */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        <BiRankingCaminhoes data={caminhoes.data} />
        <BiRankingMotoristas data={motoristas.data} />
      </div>

      {/* Monthly Trend */}
      <div className="mb-6">
        <BiTendenciaMensal data={tendencia.data} />
      </div>

      {/* Separator */}
      <div className="mb-6 border-t border-slate-300" />

      {/* Story 5.6: Previsao e Margens */}
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
