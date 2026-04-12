'use client';

import Link from 'next/link';
import { formatBRL } from '@/lib/utils/currency';
import { AbastecimentoResumo } from '@/components/abastecimento/AbastecimentoResumo';
import type { AbastecimentoItem } from '@/lib/queries/combustivel-queries';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const TIPO_COMBUSTIVEL_LABELS: Record<string, string> = {
  diesel_s10: 'Diesel S10',
  diesel_comum: 'Diesel Comum',
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatDateTime(iso: string): string {
  const date = new Date(iso);
  const pad = (n: number) => n.toString().padStart(2, '0');
  return `${pad(date.getDate())}/${pad(date.getMonth() + 1)}/${date.getFullYear()} ${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

function formatLitros(litros: number): string {
  return `${litros.toFixed(3).replace('.', ',')} L`;
}

function formatPrecoLitro(valorCentavos: number, litros: number): string {
  if (litros <= 0) return '-';
  const preco = (valorCentavos / 100) / litros;
  return `R$ ${preco.toFixed(3).replace('.', ',')}/L`;
}

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface AbastecimentoListProps {
  abastecimentos: AbastecimentoItem[];
  isDono?: boolean;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

/**
 * List of fuel expenses for a trip detail page.
 * Story 5.3 — AC 1, 2, 3, 4, 5, 6, 10
 *
 * Renders a card-based list (mobile-first) with:
 * - Date, liters, total value, derived price/liter
 * - Gas station + UF
 * - Camera icon for receipt photos (tapping navigates to edit page)
 * - Empty state with guidance message
 * - Summary totals via AbastecimentoResumo
 *
 * UX for 60+ audience: large text, large touch targets, bold values.
 */
export function AbastecimentoList({ abastecimentos, isDono = false }: AbastecimentoListProps) {
  return (
    <div className="rounded-lg border border-surface-border bg-surface-card p-6">
      <h3 className="mb-4 text-sm font-medium uppercase tracking-wide text-primary-500">
        Abastecimentos
      </h3>

      {/* Summary (AC 9) */}
      <AbastecimentoResumo abastecimentos={abastecimentos} />

      {/* Empty state (AC 5) */}
      {abastecimentos.length === 0 && (
        <div className="flex flex-col items-center justify-center py-10 text-center">
          {/* Fuel pump icon */}
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
              d="M3 6h4l2 2h2V4a1 1 0 011-1h4a1 1 0 011 1v4h1.5a2.5 2.5 0 012.5 2.5V17a2 2 0 01-2 2h-1V9.5a1 1 0 00-1-1H16V4h-4v4H9L7 6H3v14h12v-1"
            />
          </svg>
          <p className="text-base font-medium text-primary-700">
            Nenhum abastecimento registrado.
          </p>
          <p className="mt-1 text-sm text-primary-500">
            Use + Registrar Abastecimento para adicionar.
          </p>
        </div>
      )}

      {/* List (AC 1, 2, 3, 4, 6, 10) */}
      {abastecimentos.length > 0 && (
        <div className="mt-4 space-y-3">
          {abastecimentos.map((item) => (
            <div
              key={item.id}
              className="flex min-h-[60px] items-start gap-3 rounded-lg border border-surface-border bg-surface-card p-4"
            >
              {/* Main content */}
              <div className="flex-1 min-w-0">
                {/* Row 1: Date + Type */}
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-primary-700">
                    {formatDateTime(item.created_at)}
                  </span>
                  {item.tipo_combustivel && (
                    <span className="rounded bg-info/20 px-2 py-0.5 text-xs font-medium text-info">
                      {TIPO_COMBUSTIVEL_LABELS[item.tipo_combustivel] ?? item.tipo_combustivel}
                    </span>
                  )}
                </div>

                {/* Row 2: Value (prominent) + price per liter */}
                <div className="mt-1 flex items-baseline gap-3">
                  <span className="text-base font-bold tabular-nums text-primary-900">
                    {formatBRL(item.valor)}
                  </span>
                  <span className="text-sm tabular-nums text-primary-500">
                    {formatPrecoLitro(item.valor, item.litros)}
                  </span>
                </div>

                {/* Row 3: Liters + Station/UF */}
                <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-primary-500">
                  <span className="tabular-nums">{formatLitros(item.litros)}</span>
                  {(item.posto_local || item.uf_abastecimento) && (
                    <span>
                      {item.posto_local && item.uf_abastecimento
                        ? `${item.posto_local} - ${item.uf_abastecimento}`
                        : item.posto_local ?? item.uf_abastecimento}
                    </span>
                  )}
                </div>
              </div>

              {/* Actions: attach/view comprovante + edit (dono only) */}
              <div className="flex flex-col items-end gap-1 shrink-0">
                {isDono && (
                  <Link
                    href={`/gastos/${item.id}/editar`}
                    className="text-xs text-primary-500 transition-colors hover:text-primary-700"
                  >
                    Editar
                  </Link>
                )}
                {item.tem_foto ? (
                  <Link
                    href={`/gastos/${item.id}/editar`}
                    className="rounded-lg p-2 text-success transition-colors hover:bg-surface-muted min-h-[40px] min-w-[40px] flex items-center justify-center"
                    aria-label="Ver comprovante"
                    title="Ver comprovante"
                  >
                    <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  </Link>
                ) : (
                  <Link
                    href={`/gastos/${item.id}/editar`}
                    className="inline-flex items-center gap-1 text-xs text-primary-500 transition-colors hover:text-primary-700 min-h-[40px]"
                    title="Anexar comprovante"
                  >
                    <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
                    </svg>
                    Anexar
                  </Link>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

    </div>
  );
}
