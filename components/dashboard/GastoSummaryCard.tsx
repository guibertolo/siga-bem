import { formatBRL } from '@/lib/utils/currency';

/**
 * Dashboard card showing total gastos for the current month.
 * Pure presentational component — receives data as props.
 * Values in centavos, displayed in BRL.
 */

interface GastoSummaryCardProps {
  total: number; // centavos
}

export function GastoSummaryCard({ total }: GastoSummaryCardProps) {
  return (
    <div className="rounded-card border border-surface-border bg-surface-card p-6 shadow-sm">
      <h3 className="text-lg font-semibold text-primary-900">Gastos</h3>
      <p className="mt-2 text-3xl font-bold text-primary-700 tabular-nums">
        {formatBRL(total)}
      </p>
      <p className="mt-1 text-sm text-slate-500">{"Este m\u00EAs"}</p>
    </div>
  );
}
