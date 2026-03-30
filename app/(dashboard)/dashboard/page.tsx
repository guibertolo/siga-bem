import { Suspense } from 'react';
import type { Metadata } from 'next';
import { createClient } from '@/lib/supabase/server';
import { getCurrentUsuario } from '@/lib/auth/get-user-role';

export const metadata: Metadata = {
  title: 'Inicio',
};

import { GastoSummaryCard } from '@/components/dashboard/GastoSummaryCard';
import { ViagemSummaryCard } from '@/components/dashboard/ViagemSummaryCard';
import { FechamentoSummaryCard } from '@/components/dashboard/FechamentoSummaryCard';
import { ViagemAtivaCard } from '@/components/dashboard/ViagemAtivaCard';
import { MeusGanhosCard } from '@/components/dashboard/MeusGanhosCard';
import { ViagensConcludasCard } from '@/components/dashboard/ViagensConcludasCard';
import { ProximaViagemCard } from '@/components/dashboard/ProximaViagemCard';
import { MotoristasStatusCard } from '@/components/dashboard/MotoristasStatusCard';
import { CaminhoesStatusCard } from '@/components/dashboard/CaminhoesStatusCard';
import { getDashboardData, getViagemAtiva, getMotoristaData, getDonoMicroData } from '@/app/(dashboard)/dashboard/actions';

function CardSkeleton() {
  return <div className="h-32 rounded-xl bg-surface-muted animate-pulse" />;
}

export default async function DashboardPage() {
  const currentUsuario = await getCurrentUsuario();
  const isMotorista = currentUsuario?.role === 'motorista';
  const isDono = currentUsuario?.role === 'dono' || currentUsuario?.role === 'admin';

  // Optimize data fetching: motorista does NOT need dono data (gastos, fechamentos)
  // and dono does NOT need motorista data (earnings, next trip)
  const [supabase, viagemAtiva, dashboardData, motoristaData, donoData] = await Promise.all([
    createClient(),
    getViagemAtiva(),
    isMotorista ? null : getDashboardData(),
    isMotorista && currentUsuario?.motorista_id
      ? getMotoristaData(currentUsuario.motorista_id)
      : null,
    isDono ? getDonoMicroData() : null,
  ]);
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
              <GastoSummaryCard total={dashboardData.gastos.total} />
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
