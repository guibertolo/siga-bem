/**
 * Dashboard card showing the count of completed trips for the motorista
 * in the current month.
 * Story S-DASH-1 — Motorista dashboard differentiation.
 */

interface ViagensConcludasCardProps {
  count: number;
}

export function ViagensConcludasCard({ count }: ViagensConcludasCardProps) {
  return (
    <div
      className="rounded-card border border-surface-border bg-surface-card p-6 shadow-sm"
      role="region"
      aria-label={`Viagens concluidas no mes: ${count}`}
    >
      <h3 className="text-lg font-semibold text-primary-900">
        Viagens Concluidas
      </h3>
      <p className="mt-2 text-3xl font-bold text-primary-700 tabular-nums">
        {count}
      </p>
      <p className="mt-1 text-sm text-text-muted">Este mes</p>
    </div>
  );
}
