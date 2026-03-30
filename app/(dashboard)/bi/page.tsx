import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { Suspense } from 'react';
import { getCurrentUsuario } from '@/lib/auth/get-user-role';

export const metadata: Metadata = {
  title: 'Resultado da Frota',
};
import {
  getBIFilterOptions,
  getBIKpis,
  getBIMargemMotoristas,
  getBICategoriasBreakdown,
  getBIRankingCaminhoes,
  getBIRankingMotoristas,
  getBITendenciaMensal,
  getBIEficienciaCombustivel,
  getBIManutencoes,
} from '@/app/(dashboard)/bi/actions';
import { BiFiltros } from '@/components/bi/BiFiltros';
import { BiKpiCards } from '@/components/bi/BiKpiCards';
import { BiMargemMotoristas } from '@/components/bi/BiMargemMotoristas';
import { BiBreakdownCategorias } from '@/components/bi/BiBreakdownCategorias';
import { BiRankingCaminhoes } from '@/components/bi/BiRankingCaminhoes';
import { BiRankingMotoristas } from '@/components/bi/BiRankingMotoristas';
import { BiTendenciaMensal } from '@/components/bi/BiTendenciaMensal';
import { BiPrevisaoMargens } from '@/components/bi/BiPrevisaoMargens';
import { BiEficienciaCombustivel } from '@/components/bi/BiEficienciaCombustivel';
import { BiManutencoes } from '@/components/bi/BiManutencoes';
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
  const [
    filterOpts,
    kpis,
    margemMotoristas,
    categorias,
    caminhoes,
    motoristas,
    tendencia,
    eficiencia,
    manutencoes,
  ] = await Promise.all([
    getBIFilterOptions(),
    getBIKpis(filtros),
    getBIMargemMotoristas(filtros),
    getBICategoriasBreakdown(filtros),
    getBIRankingCaminhoes(filtros),
    getBIRankingMotoristas(filtros),
    getBITendenciaMensal(filtros),
    getBIEficienciaCombustivel(filtros),
    getBIManutencoes(filtros),
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
          Resultado da Frota
        </h2>
        <p className="text-sm text-primary-500 mt-1">
          Veja o resultado real do seu negocio
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

      {/* 2. Hero KPIs — profit-first cards */}
      <div className="mb-6">
        <BiKpiCards data={kpis.data} />
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
