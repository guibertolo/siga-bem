import Link from 'next/link';
import { formatBRL } from '@/lib/utils/currency';

/**
 * Dashboard card showing pending fechamentos count and total value.
 * Story 4.1 — T7: Card "Fechamentos Pendentes" no dashboard principal.
 * Pure presentational component — receives data as props.
 */

interface FechamentoSummaryCardProps {
  count: number;
  totalCentavos: number;
}

export function FechamentoSummaryCard({ count, totalCentavos }: FechamentoSummaryCardProps) {
  return (
    <Link
      href="/fechamentos?status=aberto"
      className="block rounded-card border border-surface-border bg-surface-card p-6 shadow-sm no-underline text-inherit hover:border-primary-500 transition-colors"
    >
      <h3 className="text-lg font-semibold text-primary-900">Acertos Pendentes</h3>
      <p className="mt-2 text-3xl font-bold text-primary-700 tabular-nums">
        {count}
      </p>
      <p className="mt-1 text-sm text-text-muted">
        {count > 0 ? `Total: ${formatBRL(totalCentavos)}` : 'Nenhum acerto pendente'}
      </p>
    </Link>
  );
}
