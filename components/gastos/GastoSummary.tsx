'use client';

import { useState } from 'react';
import { formatBRL } from '@/lib/utils/currency';
import type { GastoSubtotalCategoria } from '@/types/gasto';

interface GastoSummaryProps {
  totalCount: number;
  totalValueCentavos: number;
  subtotaisByCategoria: GastoSubtotalCategoria[];
}

export function GastoSummary({
  totalCount,
  totalValueCentavos,
  subtotaisByCategoria,
}: GastoSummaryProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  return (
    <div className="rounded-lg border border-surface-border bg-surface-card p-4">
      {/* Total */}
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-primary-500">Total encontrado</p>
          <p className="text-2xl font-bold text-primary-900">
            {formatBRL(totalValueCentavos)}
          </p>
          <p className="text-xs text-primary-400">
            {totalCount} registro{totalCount !== 1 ? 's' : ''}
          </p>
        </div>

        {subtotaisByCategoria.length > 0 && (
          <button
            type="button"
            onClick={() => setIsExpanded(!isExpanded)}
            className="text-sm text-primary-600 transition-colors hover:text-primary-800"
          >
            {isExpanded ? 'Esconder detalhes' : 'Ver por tipo de gasto'}
          </button>
        )}
      </div>

      {/* Subtotals by category (expandable) */}
      {isExpanded && subtotaisByCategoria.length > 0 && (
        <div className="mt-4 space-y-2 border-t border-surface-border pt-4">
          {subtotaisByCategoria.map((sub) => (
            <div
              key={sub.categoria_nome}
              className="flex items-center justify-between text-sm"
            >
              <div className="flex items-center gap-2">
                {sub.categoria_cor && (
                  <span
                    className="inline-block h-3 w-3 rounded-full"
                    style={{ backgroundColor: sub.categoria_cor }}
                  />
                )}
                <span className="text-primary-700">{sub.categoria_nome}</span>
                <span className="text-xs text-primary-400">
                  ({sub.qtd_gastos})
                </span>
              </div>
              <span className="tabular-nums font-medium text-primary-900">
                {formatBRL(sub.total_centavos)}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
