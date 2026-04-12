'use client';

import { useState } from 'react';
import Link from 'next/link';
import { formatBRL } from '@/lib/utils/currency';
import { resolveIcone } from '@/lib/utils/categoria-icone';
import type { GastoViagemItem } from '@/app/(dashboard)/viagens/[id]/actions';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatDateTime(iso: string): string {
  const date = new Date(iso);
  const pad = (n: number) => n.toString().padStart(2, '0');
  return `${pad(date.getDate())}/${pad(date.getMonth() + 1)}/${date.getFullYear()} ${pad(date.getHours())}:${pad(date.getMinutes())}`;
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
  isDono?: boolean;
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
  isDono = false,
}: GastosViagemSectionProps) {
  const [lightboxUrl, setLightboxUrl] = useState<string | null>(null);

  return (
    <div className="rounded-lg border border-surface-border bg-surface-card p-6">
      <h3 className="mb-4 text-sm font-medium uppercase tracking-wide text-primary-500">
        Despesas desta Viagem
      </h3>

      {/* Empty state */}
      {gastos.length === 0 && (
        <div className="flex flex-col items-center justify-center py-10 text-center">
          <svg
            className="mb-3 h-12 w-12 text-text-subtle"
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
                    {formatDateTime(gasto.created_at)}
                  </span>
                </div>

                {/* Description */}
                {gasto.descricao && (
                  <p className="mt-0.5 truncate text-sm text-primary-500">
                    {gasto.descricao}
                  </p>
                )}
              </div>

              {/* Value + Actions */}
              <div className="flex flex-col items-end gap-1">
                <span className="text-base font-bold tabular-nums text-primary-900">
                  {formatBRL(gasto.valor)}
                </span>
                <div className="flex items-center gap-2">
                  {gasto.foto_url ? (
                    gasto.foto_signed_url ? (
                      <button
                        type="button"
                        onClick={() => setLightboxUrl(gasto.foto_signed_url)}
                        className="inline-flex items-center gap-1 text-xs text-success transition-colors hover:text-success/80"
                      >
                        <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                        Ver Comprovante
                      </button>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-xs text-success">
                        <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                        Comprovante
                      </span>
                    )
                  ) : (
                    <Link
                      href={`/gastos/${gasto.id}/editar`}
                      className="inline-flex items-center gap-1 text-xs text-primary-500 transition-colors hover:text-primary-700"
                    >
                      <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
                      </svg>
                      Anexar
                    </Link>
                  )}
                  {isDono && (
                    <Link
                      href={`/gastos/${gasto.id}/editar`}
                      className="text-xs text-primary-500 transition-colors hover:text-primary-700"
                    >
                      Editar
                    </Link>
                  )}
                </div>
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

      {/* Lightbox */}
      {lightboxUrl && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4"
          style={{ width: '100vw', height: '100vh', top: 0, left: 0 }}
          onClick={() => setLightboxUrl(null)}
          role="dialog"
          aria-modal="true"
          aria-label="Visualizar comprovante"
        >
          <button
            type="button"
            onClick={() => setLightboxUrl(null)}
            className="absolute right-4 top-4 rounded-full bg-white/20 p-2 text-white transition-colors hover:bg-white/40"
            aria-label="Fechar"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
          {lightboxUrl.endsWith('.pdf') ? (
            <iframe
              src={lightboxUrl}
              title="Comprovante PDF"
              className="h-[85vh] w-[90vw] max-w-4xl rounded-lg bg-white"
              onClick={(e) => e.stopPropagation()}
            />
          ) : (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={lightboxUrl}
              alt="Comprovante em tamanho completo"
              className="max-h-[90vh] max-w-[90vw] rounded-lg object-contain"
              onClick={(e) => e.stopPropagation()}
            />
          )}
        </div>
      )}
    </div>
  );
}
