import { getViagensEmAndamento } from '@/app/(dashboard)/viagens/actions';

export async function ViagemSummaryCard() {
  const { count, error } = await getViagensEmAndamento();

  return (
    <div className="rounded-[--radius-card] border border-surface-border bg-surface-card p-6 shadow-sm">
      <h3 className="text-lg font-semibold text-primary-900">Viagens</h3>
      <p className="mt-2 text-3xl font-bold tabular-nums text-primary-700">
        {error ? '—' : count}
      </p>
      <p className="mt-1 text-sm text-primary-500">Em andamento</p>
    </div>
  );
}
