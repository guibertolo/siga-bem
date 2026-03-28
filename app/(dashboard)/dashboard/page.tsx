import { createClient } from '@/lib/supabase/server';

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
        <div className="rounded-[--radius-card] border border-surface-border bg-surface-card p-6 shadow-sm">
          <h3 className="text-lg font-semibold text-primary-900">Viagens</h3>
          <p className="mt-2 text-3xl font-bold tabular-nums text-primary-700">0</p>
          <p className="mt-1 text-sm text-primary-500">Este mes</p>
        </div>

        <div className="rounded-[--radius-card] border border-surface-border bg-surface-card p-6 shadow-sm">
          <h3 className="text-lg font-semibold text-primary-900">Gastos</h3>
          <p className="mt-2 text-3xl font-bold tabular-nums text-primary-700">R$ 0,00</p>
          <p className="mt-1 text-sm text-primary-500">Este mes</p>
        </div>

        <div className="rounded-[--radius-card] border border-surface-border bg-surface-card p-6 shadow-sm">
          <h3 className="text-lg font-semibold text-primary-900">Motoristas</h3>
          <p className="mt-2 text-3xl font-bold tabular-nums text-primary-700">0</p>
          <p className="mt-1 text-sm text-primary-500">Ativos</p>
        </div>
      </div>
    </div>
  );
}
