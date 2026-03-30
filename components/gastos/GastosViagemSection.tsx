import Link from 'next/link';
import { formatBRL } from '@/lib/utils/currency';
import { resolveIcone } from '@/lib/utils/categoria-icone';
import type { GastoViagemItem } from '@/app/(dashboard)/viagens/[id]/actions';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatDate(isoDate: string): string {
  const date = new Date(isoDate + 'T00:00:00');
  const pad = (n: number) => n.toString().padStart(2, '0');
  return `${pad(date.getDate())}/${pad(date.getMonth() + 1)}/${date.getFullYear()}`;
}

/**
 * Render category icon — uses emoji from DB (icone column) or a default.
 */
function CategoryIcon({
  icone,
  cor,
}: {
  icone: string | null;
  cor: string | null;
}) {
  if (icone) {
    return (
      <span
        className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg text-lg"
        style={{ backgroundColor: cor ? `${cor}20` : undefined }}
        aria-hidden="true"
      >
        {resolveIcone(icone)}
      </span>
    );
  }

  // Fallback: generic expense icon
  return (
    <span className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg bg-surface-muted text-primary-500" aria-hidden="true">
      <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
      </svg>
    </span>
  );
}

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface GastosViagemSectionProps {
  gastos: GastoViagemItem[];
  totalCentavos: number;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

/**
 * Displays non-fuel expenses linked to a viagem on the trip detail page.
 * Mobile-first, 48px touch targets, zero English.
 */
export function GastosViagemSection({
  gastos,
  totalCentavos,
}: GastosViagemSectionProps) {
  return (
    <div className="rounded-lg border border-surface-border bg-surface-card p-6">
      <h3 className="mb-4 text-sm font-medium uppercase tracking-wide text-primary-500">
        Despesas desta Viagem
      </h3>

      {/* Empty state */}
      {gastos.length === 0 && (
        <div className="flex flex-col items-center justify-center py-10 text-center">
          <svg
            className="mb-3 h-12 w-12 text-primary-300"
            aria-hidden="true"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.5}
              d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z"
            />
          </svg>
          <p className="text-base font-medium text-primary-700">
            Nenhuma despesa registrada nesta viagem.
          </p>
          <p className="mt-1 text-sm text-primary-500">
            Use Registrar Despesa para adicionar.
          </p>
        </div>
      )}

      {/* Gastos list */}
      {gastos.length > 0 && (
        <div className="space-y-3">
          {gastos.map((gasto) => (
            <div
              key={gasto.id}
              className="flex min-h-[60px] items-center gap-3 rounded-lg border border-surface-border bg-surface-card p-4"
            >
              <CategoryIcon icone={gasto.categoria_icone} cor={gasto.categoria_cor} />

              <div className="flex-1 min-w-0">
                {/* Category + Date */}
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-primary-700">
                    {gasto.categoria_nome}
                  </span>
                  <span className="text-xs text-primary-500">
                    {formatDate(gasto.data)}
                  </span>
                </div>

                {/* Description */}
                {gasto.descricao && (
                  <p className="mt-0.5 truncate text-sm text-primary-500">
                    {gasto.descricao}
                  </p>
                )}
              </div>

              {/* Value */}
              <div className="flex flex-col items-end gap-1">
                <span className="text-base font-bold tabular-nums text-primary-900">
                  {formatBRL(gasto.valor)}
                </span>
                <Link
                  href={`/gastos/${gasto.id}/editar`}
                  className="text-xs text-primary-500 transition-colors hover:text-primary-700"
                >
                  Editar
                </Link>
              </div>
            </div>
          ))}

          {/* Total */}
          <div className="flex items-center justify-between rounded-lg bg-surface-muted px-4 py-3">
            <span className="text-sm font-medium text-primary-700">
              Total de despesas
            </span>
            <span className="text-lg font-bold tabular-nums text-primary-900">
              {formatBRL(totalCentavos)}
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
