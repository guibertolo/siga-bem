import type { MotoristaStatusItem } from '@/app/(dashboard)/dashboard/actions';

interface MotoristasStatusCardProps {
  motoristas: MotoristaStatusItem[];
}

export function MotoristasStatusCard({ motoristas }: MotoristasStatusCardProps) {
  const emViagem = motoristas.filter((m) => m.situacao === 'em_viagem').length;
  const total = motoristas.length;

  return (
    <div
      role="region"
      aria-label="Status dos motoristas"
      className="rounded-card border border-surface-border bg-surface-card p-6 shadow-sm"
    >
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-primary-900">Motoristas</h3>
        <span className="text-sm font-medium text-primary-500 tabular-nums">
          {emViagem}/{total} em viagem
        </span>
      </div>

      {total === 0 ? (
        <p className="text-sm text-text-muted">
          Nenhum motorista cadastrado.
        </p>
      ) : (
        <ul className="space-y-2" role="list">
          {motoristas.map((m) => (
            <li
              key={m.id}
              className="flex items-center justify-between gap-3 rounded-lg border border-surface-border bg-surface-card px-4 py-3"
            >
              <span className="min-w-0 truncate text-base font-medium text-primary-900">
                {m.nome}
              </span>
              {m.situacao === 'em_viagem' ? (
                <span className="shrink-0 inline-flex items-center rounded-full bg-alert-success-bg px-3 py-1.5 text-sm font-semibold text-success">
                  Em Viagem
                </span>
              ) : (
                <span className="shrink-0 inline-flex items-center rounded-full bg-surface-muted px-3 py-1.5 text-sm font-semibold text-text-muted">
                  Livre
                </span>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
