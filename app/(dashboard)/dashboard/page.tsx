import { Suspense } from 'react';
import type { Metadata } from 'next';
import { createClient } from '@/lib/supabase/server';
import { getCurrentUsuario } from '@/lib/auth/get-user-role';
import { getMultiEmpresaContext } from '@/lib/queries/multi-empresa';
import { queryMultiEmpresa } from '@/lib/queries/multi-empresa-query';

export const metadata: Metadata = {
  title: 'Inicio',
};

import { ReceitaMesCard } from '@/components/dashboard/ReceitaMesCard';
import { ViagemSummaryCard } from '@/components/dashboard/ViagemSummaryCard';
import { FechamentoSummaryCard } from '@/components/dashboard/FechamentoSummaryCard';
import { ViagemAtivaCard } from '@/components/dashboard/ViagemAtivaCard';
import { MeusGanhosCard } from '@/components/dashboard/MeusGanhosCard';
import { ViagensConcludasCard } from '@/components/dashboard/ViagensConcludasCard';
import { ProximaViagemCard } from '@/components/dashboard/ProximaViagemCard';
import { MotoristasStatusCard } from '@/components/dashboard/MotoristasStatusCard';
import { CaminhoesStatusCard } from '@/components/dashboard/CaminhoesStatusCard';
import { getDashboardData, getViagemAtiva, getMotoristaData, getDonoMicroData } from '@/app/(dashboard)/dashboard/actions';
import {
  getDashboardDataForEmpresa,
  getViagemAtivaForEmpresa,
  getDonoMicroDataForEmpresa,
} from '@/app/(dashboard)/dashboard/multi-actions';
import type { DashboardData, DonoMicroData, ViagemAtivaData } from '@/app/(dashboard)/dashboard/actions';

function CardSkeleton() {
  return <div className="h-32 rounded-xl bg-surface-muted animate-pulse" />;
}

/**
 * Aggregate dashboard data from multiple empresas by summing numeric KPIs.
 */
function aggregateDashboardData(
  results: Array<{ data: DashboardData }>,
): DashboardData {
  return results.reduce<DashboardData>(
    (acc, r) => ({
      viagens: {
        count: acc.viagens.count + r.data.viagens.count,
        error: acc.viagens.error ?? r.data.viagens.error,
      },
      gastos: {
        total: acc.gastos.total + r.data.gastos.total,
        error: acc.gastos.error ?? r.data.gastos.error,
      },
      fechamentos: {
        count: acc.fechamentos.count + r.data.fechamentos.count,
        totalCentavos: acc.fechamentos.totalCentavos + r.data.fechamentos.totalCentavos,
      },
      receitaCusto: {
        receita: acc.receitaCusto.receita + r.data.receitaCusto.receita,
        custo: acc.receitaCusto.custo + r.data.receitaCusto.custo,
      },
    }),
    {
      viagens: { count: 0, error: null },
      gastos: { total: 0, error: null },
      fechamentos: { count: 0, totalCentavos: 0 },
      receitaCusto: { receita: 0, custo: 0 },
    },
  );
}

function aggregateDonoMicroData(
  results: Array<{ data: DonoMicroData }>,
): DonoMicroData {
  return {
    motoristas: results.flatMap((r) => r.data.motoristas),
    caminhoes: results.flatMap((r) => r.data.caminhoes),
  };
}

function aggregateViagemAtiva(
  results: Array<{ empresaName: string; data: ViagemAtivaData }>,
): ViagemAtivaData {
  return {
    viagens: results.flatMap((r) =>
      r.data.viagens.map((v) => ({ ...v, empresa_nome: r.empresaName })),
    ),
    count: results.reduce((sum, r) => sum + r.data.count, 0),
    error: results.find((r) => r.data.error)?.data.error ?? null,
  };
}

export default async function DashboardPage() {
  const currentUsuario = await getCurrentUsuario();
  const isMotorista = currentUsuario?.role === 'motorista';
  const isDono = currentUsuario?.role === 'dono' || currentUsuario?.role === 'admin';
  const multiCtx = await getMultiEmpresaContext();

  let dashboardData: DashboardData | null = null;
  let viagemAtiva: ViagemAtivaData;
  let donoData: DonoMicroData | null = null;

  if (multiCtx.isMultiEmpresa && isDono) {
    // Multi-empresa mode: use admin client with explicit empresa_id filter
    // All queries run in parallel (no fn_switch_empresa needed)
    const [multiDashboard, multiViagem, multiDono] = await Promise.all([
      queryMultiEmpresa((admin, eid) => getDashboardDataForEmpresa(admin, eid)),
      queryMultiEmpresa((admin, eid) => getViagemAtivaForEmpresa(admin, eid)),
      queryMultiEmpresa((admin, eid) => getDonoMicroDataForEmpresa(admin, eid)),
    ]);
    dashboardData = aggregateDashboardData(multiDashboard);
    viagemAtiva = aggregateViagemAtiva(multiViagem);
    donoData = aggregateDonoMicroData(multiDono);
  } else {
    // Single empresa mode: original behavior
    const results = await Promise.all([
      getViagemAtiva(),
      isMotorista ? null : getDashboardData(),
      isDono ? getDonoMicroData() : null,
    ]);
    viagemAtiva = results[0];
    dashboardData = results[1];
    donoData = results[2];
  }

  const motoristaData = isMotorista && currentUsuario?.motorista_id
    ? await getMotoristaData(currentUsuario.motorista_id)
    : null;

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  return (
    <div>
      <h2 className="text-2xl font-bold text-primary-900 mb-1">
        Inicio
      </h2>
      <p className="text-sm text-primary-700 mb-6">
        Bem-vindo, {currentUsuario?.nome ?? user?.email}
      </p>

      <ViagemAtivaCard
        viagens={viagemAtiva.viagens}
        count={viagemAtiva.count}
        isMotorista={isMotorista}
        isMultiEmpresa={multiCtx.isMultiEmpresa}
      />

      {isMotorista && motoristaData ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          <Suspense fallback={<CardSkeleton />}>
            <MeusGanhosCard totalCentavos={motoristaData.ganhosMes} />
          </Suspense>
          <Suspense fallback={<CardSkeleton />}>
            <ViagensConcludasCard count={motoristaData.viagensConcludasMes} />
          </Suspense>
          <Suspense fallback={<CardSkeleton />}>
            <ProximaViagemCard viagem={motoristaData.proximaViagem} />
          </Suspense>
        </div>
      ) : dashboardData ? (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            <Suspense fallback={<CardSkeleton />}>
              <ViagemSummaryCard
                count={dashboardData.viagens.count}
                error={dashboardData.viagens.error}
              />
            </Suspense>
            <Suspense fallback={<CardSkeleton />}>
              <ReceitaMesCard
                receitaCentavos={dashboardData.receitaCusto.receita}
                custoCentavos={dashboardData.receitaCusto.custo}
              />
            </Suspense>
            <Suspense fallback={<CardSkeleton />}>
              <FechamentoSummaryCard
                count={dashboardData.fechamentos.count}
                totalCentavos={dashboardData.fechamentos.totalCentavos}
              />
            </Suspense>
          </div>

          {donoData && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 mt-6">
              <Suspense fallback={<CardSkeleton />}>
                <MotoristasStatusCard motoristas={donoData.motoristas} />
              </Suspense>
              <Suspense fallback={<CardSkeleton />}>
                <CaminhoesStatusCard caminhoes={donoData.caminhoes} />
              </Suspense>
            </div>
          )}
        </>
      ) : null}
    </div>
  );
}
