import { createClient } from '@/lib/supabase/server';
import { GastoSummaryCard } from '@/components/dashboard/GastoSummaryCard';
import { ViagemSummaryCard } from '@/components/dashboard/ViagemSummaryCard';
import { FechamentoSummaryCard } from '@/components/dashboard/FechamentoSummaryCard';
import { getDashboardData } from '@/app/(dashboard)/dashboard/actions';

export default async function DashboardPage() {
  const [supabase, dashboardData] = await Promise.all([
    createClient(),
    getDashboardData(),
  ]);
  const { data: { user } } = await supabase.auth.getUser();

  return (
    <div>
      <h2 className="text-2xl font-bold text-primary-900 mb-1">
        Dashboard
      </h2>
      <p className="text-sm text-primary-700 mb-6">
        Bem-vindo, {user?.email}
      </p>

      <div className="grid grid-cols-[repeat(auto-fill,minmax(300px,1fr))] gap-6">
        <ViagemSummaryCard
          count={dashboardData.viagens.count}
          error={dashboardData.viagens.error}
        />
        <GastoSummaryCard total={dashboardData.gastos.total} />
        <FechamentoSummaryCard
          count={dashboardData.fechamentos.count}
          totalCentavos={dashboardData.fechamentos.totalCentavos}
        />
      </div>
    </div>
  );
}
