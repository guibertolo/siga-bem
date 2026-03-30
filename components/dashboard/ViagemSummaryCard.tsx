interface ViagemSummaryCardProps {
  count: number;
  error: string | null;
}

export function ViagemSummaryCard({ count, error }: ViagemSummaryCardProps) {
  return (
    <div className="rounded-card border border-slate-200 bg-surface-card p-6 shadow-sm">
      <h3 className="text-lg font-semibold text-primary-900">Viagens</h3>
      <p className="mt-2 text-3xl font-bold text-primary-700 tabular-nums">
        {error ? '\u2014' : count}
      </p>
      <p className="mt-1 text-sm text-slate-500">Em viagem</p>
    </div>
  );
}
