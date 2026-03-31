import type { CaminhaoStatusItem } from '@/app/(dashboard)/dashboard/actions';

interface CaminhoesStatusCardProps {
  caminhoes: CaminhaoStatusItem[];
}

export function CaminhoesStatusCard({ caminhoes }: CaminhoesStatusCardProps) {
  const rodando = caminhoes.filter((c) => c.situacao === 'rodando').length;
  const total = caminhoes.length;

  return (
    <div
      role="region"
      aria-label="Status dos caminhoes"
      className="rounded-card border border-surface-border bg-surface-card p-6 shadow-sm"
    >
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-primary-900">Caminhões</h3>
        <span className="text-sm font-medium text-primary-500 tabular-nums">
          {rodando}/{total} rodando
        </span>
      </div>

      {total === 0 ? (
        <p className="text-sm text-text-muted">
          Nenhum caminhão cadastrado.
        </p>
      ) : (
        <ul className="space-y-2" role="list">
          {caminhoes.map((c, idx) => (
            <li
              key={`cam-${idx}-${c.id}`}
              className="flex items-center justify-between gap-3 rounded-lg border border-surface-border bg-surface-card px-4 py-3"
            >
              <div className="min-w-0 flex-1">
                <span className="block truncate text-base font-bold text-primary-900 tabular-nums">
                  {c.placa}
                </span>
                <span className="block truncate text-sm text-primary-500">
                  {c.modelo}
                </span>
              </div>
              {c.situacao === 'rodando' ? (
                <span className="shrink-0 inline-flex items-center rounded-full bg-alert-success-bg px-3 py-1.5 text-sm font-semibold text-success">
                  Rodando
                </span>
              ) : (
                <span className="shrink-0 inline-flex items-center rounded-full bg-surface-muted px-3 py-1.5 text-sm font-semibold text-text-muted">
                  Parado
                </span>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
