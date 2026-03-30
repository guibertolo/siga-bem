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
import { getDashboardData, getViagemAtiva } from '@/app/(dashboard)/dashboard/actions';

function CardSkeleton() {
  return <div className="h-32 rounded-xl bg-surface-muted animate-pulse" />;
}

export default async function DashboardPage() {
  const [supabase, dashboardData, viagemAtiva, currentUsuario] = await Promise.all([
    createClient(),
    getDashboardData(),
    getViagemAtiva(),
    getCurrentUsuario(),
  ]);
  const { data: { user } } = await supabase.auth.getUser();

  const isMotorista = currentUsuario?.role === 'motorista';

  return (
    <div>
      <h2 className="text-2xl font-bold text-primary-900 mb-1">
        Inicio
      </h2>
      <p className="text-sm text-primary-700 mb-6">
        Bem-vindo, {user?.email}
      </p>

      <ViagemAtivaCard
        viagens={viagemAtiva.viagens}
        count={viagemAtiva.count}
        isMotorista={isMotorista}
      />

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
    </div>
  );
}
