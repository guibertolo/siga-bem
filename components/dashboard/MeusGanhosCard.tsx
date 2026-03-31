import { formatBRL } from '@/lib/utils/currency';

/**
 * Dashboard card showing the motorista's earnings for the current month.
 * Displays SUM(valor_total * percentual_pagamento / 100) of completed trips.
 * Story S-DASH-1 — Motorista dashboard differentiation.
 */

interface MeusGanhosCardProps {
  totalCentavos: number;
}

export function MeusGanhosCard({ totalCentavos }: MeusGanhosCardProps) {
  const hasEarnings = totalCentavos > 0;

  return (
    <div
      className="rounded-card border border-surface-border bg-surface-card p-6 shadow-sm"
      role="region"
      aria-label={
        hasEarnings
          ? `Meus ganhos do mês: ${formatBRL(totalCentavos)}`
          : 'Meus ganhos do mês: nenhuma viagem concluída'
      }
    >
      <h3 className="text-lg font-semibold text-primary-900">Meus Ganhos</h3>
      {hasEarnings ? (
        <p className="mt-2 text-3xl font-bold text-success tabular-nums">
          {formatBRL(totalCentavos)}
        </p>
      ) : (
        <p className="mt-2 text-base text-text-muted">
          Nenhuma viagem concluída este mês
        </p>
      )}
      <p className="mt-1 text-sm text-text-muted">Este mes</p>
    </div>
  );
}
