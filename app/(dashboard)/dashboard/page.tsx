import { createClient } from '@/lib/supabase/server';
import { GastoSummaryCard } from '@/components/dashboard/GastoSummaryCard';
import { ViagemSummaryCard } from '@/components/dashboard/ViagemSummaryCard';
import { FechamentoSummaryCard } from '@/components/dashboard/FechamentoSummaryCard';

export default async function DashboardPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  return (
    <div>
      <h2
        style={{
          fontSize: '24px',
          fontWeight: 700,
          color: '#1B3A4B',
          marginBottom: '4px',
        }}
      >
        Dashboard
      </h2>
      <p
        style={{
          fontSize: '14px',
          color: '#2C5F7C',
          marginBottom: '24px',
        }}
      >
        Bem-vindo, {user?.email}
      </p>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
          gap: '24px',
        }}
      >
        <ViagemSummaryCard />
        <GastoSummaryCard />
        <FechamentoSummaryCard />
      </div>
    </div>
  );
}
