import { createClient } from '@/lib/supabase/server';
import { GastoSummaryCard } from '@/components/dashboard/GastoSummaryCard';
import { ViagemSummaryCard } from '@/components/dashboard/ViagemSummaryCard';
import { FechamentoSummaryCard } from '@/components/dashboard/FechamentoSummaryCard';

export default async function DashboardPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-primary-900">Dashboard</h2>
      <p className="text-primary-700">
        Bem-vindo, {user?.email}
      </p>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        <ViagemSummaryCard />

        <GastoSummaryCard />

        <FechamentoSummaryCard />
      </div>
    </div>
  );
}
