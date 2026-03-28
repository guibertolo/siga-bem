import { formatBRL } from '@/lib/utils/currency';
import { getGastosMesAtual } from '@/app/(dashboard)/gastos/actions';

/**
 * Dashboard card showing total gastos for the current month.
 * Server component — fetches data directly.
 * Values computed in centavos, displayed in BRL.
 */
export async function GastoSummaryCard() {
  const { total } = await getGastosMesAtual();

  return (
    <div className="rounded-[--radius-card] border border-surface-border bg-surface-card p-6 shadow-sm">
      <h3 className="text-lg font-semibold text-primary-900">Gastos</h3>
      <p className="mt-2 text-3xl font-bold tabular-nums text-primary-700">
        {formatBRL(total)}
      </p>
      <p className="mt-1 text-sm text-primary-500">Este mes</p>
    </div>
  );
}
