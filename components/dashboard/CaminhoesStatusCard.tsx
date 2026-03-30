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
        <h3 className="text-lg font-semibold text-primary-900">Caminhoes</h3>
        <span className="text-sm font-medium text-primary-600 tabular-nums">
          {rodando}/{total} rodando
        </span>
      </div>

      {total === 0 ? (
        <p className="text-sm text-text-muted">
          Nenhum caminhao cadastrado.
        </p>
      ) : (
        <ul className="space-y-2" role="list">
          {caminhoes.map((c) => (
            <li
              key={c.id}
              className="flex items-center justify-between gap-3 rounded-lg border border-surface-border bg-white/60 px-4 py-3 dark:bg-white/5"
            >
              <div className="min-w-0 flex-1">
                <span className="block truncate text-base font-bold text-primary-900 tabular-nums dark:text-primary-100">
                  {c.placa}
                </span>
                <span className="block truncate text-sm text-primary-600 dark:text-primary-400">
                  {c.modelo}
                </span>
              </div>
              {c.situacao === 'rodando' ? (
                <span className="shrink-0 inline-flex items-center rounded-full bg-green-100 px-3 py-1.5 text-sm font-semibold text-green-800 dark:bg-green-900/40 dark:text-green-300">
                  Rodando
                </span>
              ) : (
                <span className="shrink-0 inline-flex items-center rounded-full bg-gray-100 px-3 py-1.5 text-sm font-semibold text-gray-600 dark:bg-gray-800 dark:text-gray-400">
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
