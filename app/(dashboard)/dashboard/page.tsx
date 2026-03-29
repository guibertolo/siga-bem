import { createClient } from '@/lib/supabase/server';
import { GastoSummaryCard } from '@/components/dashboard/GastoSummaryCard';
import { ViagemSummaryCard } from '@/components/dashboard/ViagemSummaryCard';
import { FechamentoSummaryCard } from '@/components/dashboard/FechamentoSummaryCard';

export default async function DashboardPage() {
  const supabase = await createClient();
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
        <ViagemSummaryCard />
        <GastoSummaryCard />
        <FechamentoSummaryCard />
      </div>
    </div>
  );
}
