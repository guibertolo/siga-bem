'use client';

import { formatBRL } from '@/lib/utils/currency';
import type { BITendenciaMensalItem } from '@/types/bi';

interface BiTendenciaMensalProps {
  data: BITendenciaMensalItem[] | null;
}

export function BiTendenciaMensal({ data }: BiTendenciaMensalProps) {
  if (!data || data.length === 0) {
    return (
      <div className="rounded-card border border-slate-200 bg-surface-card p-6 shadow-sm">
        <h3 className="text-lg font-semibold text-primary-900 mb-4">
          Gastos Mes a Mes
        </h3>
        <p className="text-sm text-primary-400">
          Nao tem gastos registrados nesse periodo.
        </p>
      </div>
    );
  }

  const maxTotal = Math.max(...data.map((d) => d.total));

  return (
    <div className="rounded-card border border-slate-200 bg-surface-card p-6 shadow-sm">
      <h3 className="text-lg font-semibold text-primary-900 mb-4">
        Gastos Mes a Mes
      </h3>

      {/* Bar chart — CSS only */}
      <div className="flex items-end gap-2 h-48">
        {data.map((item) => {
          const heightPct = maxTotal > 0 ? (item.total / maxTotal) * 100 : 0;
          return (
            <div
              key={item.mesAno}
              className="flex-1 flex flex-col items-center justify-end h-full"
            >
              <span className="text-xs font-semibold text-primary-900 tabular-nums mb-1 hidden sm:block">
                {formatBRL(item.total)}
              </span>
              <div
                className="w-full rounded-t bg-primary-600 transition-all duration-300 min-h-[4px]"
                style={{ height: `${Math.max(heightPct, 2)}%` }}
                title={`${item.mesAnoLabel}: ${formatBRL(item.total)}`}
              />
              <span className="mt-2 text-xs text-primary-500 whitespace-nowrap">
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
            className="flex items-center justify-between rounded-lg border border-slate-100 bg-slate-50 px-3 py-2"
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
