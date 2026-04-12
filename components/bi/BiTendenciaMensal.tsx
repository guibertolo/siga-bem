'use client';

import { formatBRL } from '@/lib/utils/currency';
import { InfoTooltip } from '@/components/ui/InfoTooltip';
import type { BITendenciaMensalItem } from '@/types/bi';

interface BiTendenciaMensalProps {
  data: BITendenciaMensalItem[] | null;
}

export function BiTendenciaMensal({ data }: BiTendenciaMensalProps) {
  if (!data || data.length === 0) {
    return (
      <div className="rounded-card border border-surface-border bg-surface-card p-6 shadow-sm">
        <h3 className="text-lg font-semibold text-primary-900 mb-4 flex items-center gap-2">
          Resultado Mensal
          <InfoTooltip text="Gastos totais de cada mês. As barras mostram a proporção entre os meses." />
        </h3>
        <p className="text-sm text-text-muted">
          Não tem gastos registrados nesse período.
        </p>
      </div>
    );
  }

  const maxTotal = Math.max(...data.map((d) => d.total));
  const minTotal = Math.min(...data.map((d) => d.total));
  // Scale from 30% (min) to 100% (max) for visible difference
  const range = maxTotal - minTotal;

  return (
    <div className="rounded-card border border-surface-border bg-surface-card p-6 shadow-sm">
      <h3 className="text-lg font-semibold text-primary-900 mb-4 flex items-center gap-2">
        Resultado Mensal
        <InfoTooltip text="Gastos totais de cada mês. As barras mostram a proporção entre os meses." />
      </h3>

      {/* Bar chart — CSS only */}
      <div role="img" aria-label="Gráfico de gastos mensais em barras" className="flex items-end gap-3 h-48">
        {data.map((item) => {
          const heightPct = range > 0
            ? 30 + ((item.total - minTotal) / range) * 70
            : 80;
          return (
            <div
              key={item.mesAno}
              className="flex-1 flex flex-col items-center justify-end h-full"
            >
              <span className="text-sm font-bold text-primary-900 tabular-nums mb-1">
                {formatBRL(item.total)}
              </span>
              <div
                className="w-full rounded-t bg-btn-primary transition-all duration-300"
                style={{ height: `${heightPct}%` }}
                title={`${item.mesAnoLabel}: ${formatBRL(item.total)}`}
              />
              <span className="mt-2 text-sm font-medium text-primary-500 whitespace-nowrap">
                {item.mesAnoLabel}
              </span>
            </div>
          );
        })}
      </div>

      {/* Mobile list fallback */}
      <div className="sm:hidden mt-4 space-y-2">
        {data.map((item) => (
          <div
            key={item.mesAno}
            className="flex items-center justify-between rounded-lg border border-surface-border bg-surface-muted px-3 py-2"
          >
            <span className="text-sm font-medium text-primary-700">
              {item.mesAnoLabel}
            </span>
            <span className="text-sm font-bold text-primary-900 tabular-nums">
              {formatBRL(item.total)}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
