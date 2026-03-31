'use client';

import { formatBRL } from '@/lib/utils/currency';
import type { BIMargemMotoristaItem } from '@/types/bi';

interface BiMargemMotoristasProps {
  data: BIMargemMotoristaItem[] | null;
}

/** Color class for margin percentage thresholds. */
function margemColorClass(pct: number): string {
  if (pct >= 40) return 'text-success';
  if (pct >= 20) return 'text-warning';
  return 'text-danger';
}

function margemBadgeBg(pct: number): string {
  if (pct >= 40) return 'bg-alert-success-bg';
  if (pct >= 20) return 'bg-alert-warning-bg';
  return 'bg-alert-danger-bg';
}

/**
 * Margem por Motorista — ranked table showing profitability per driver.
 * Green > 40%, Yellow 20-40%, Red < 20%.
 */
export function BiMargemMotoristas({ data }: BiMargemMotoristasProps) {
  if (!data || data.length === 0) {
    return (
      <div className="rounded-card border border-surface-border bg-surface-card p-6 shadow-sm">
        <h3 className="text-lg font-semibold text-primary-900 mb-4">
          Margem por Motorista
        </h3>
        <p className="text-base text-text-muted">
          Nenhuma viagem concluida com motorista no periodo selecionado.
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-card border border-surface-border bg-surface-card p-6 shadow-sm">
      <h3 className="text-lg font-semibold text-primary-900 mb-1">
        Margem por Motorista
      </h3>
      <p className="text-sm text-primary-500 mb-4">
        Lucro de cada motorista nas viagens concluidas
      </p>

      {/* Desktop table */}
      <div className="hidden sm:block overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-surface-border text-left">
              <th className="pb-2 font-semibold text-primary-700">Motorista</th>
              <th className="pb-2 font-semibold text-primary-700 text-right">Viagens</th>
              <th className="pb-2 font-semibold text-primary-700 text-right">Receita</th>
              <th className="pb-2 font-semibold text-primary-700 text-right">Custos</th>
              <th className="pb-2 font-semibold text-primary-700 text-right">Margem</th>
              <th className="pb-2 font-semibold text-primary-700 text-right">%</th>
            </tr>
          </thead>
          <tbody>
            {data.map((item) => (
              <tr key={item.motoristaId} className="border-b border-surface-border">
                <td className="py-2.5 font-medium text-primary-900">{item.nome}</td>
                <td className="py-2.5 text-right text-primary-500 tabular-nums">
                  {item.viagensConcluidas}
                </td>
                <td className="py-2.5 text-right text-primary-700 tabular-nums">
                  {formatBRL(item.receitaCentavos)}
                </td>
                <td className="py-2.5 text-right text-primary-500 tabular-nums">
                  {formatBRL(item.custoCentavos)}
                </td>
                <td className={`py-2.5 text-right font-semibold tabular-nums ${margemColorClass(item.margemPercentual)}`}>
                  {formatBRL(item.margemCentavos)}
                </td>
                <td className="py-2.5 text-right">
                  <span
                    className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-semibold ${margemBadgeBg(item.margemPercentual)} ${margemColorClass(item.margemPercentual)}`}
                  >
                    {item.margemPercentual.toFixed(1)}%
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Mobile cards */}
      <div className="sm:hidden space-y-3">
        {data.map((item) => (
          <div
            key={item.motoristaId}
            className="rounded-lg border border-surface-border bg-surface-muted p-3"
          >
            <div className="flex items-center justify-between mb-1">
              <p className="font-semibold text-primary-900">{item.nome}</p>
              <span
                className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-semibold ${margemBadgeBg(item.margemPercentual)} ${margemColorClass(item.margemPercentual)}`}
              >
                {item.margemPercentual.toFixed(1)}%
              </span>
            </div>
            <div className="grid grid-cols-3 gap-2 text-sm mt-2">
              <div>
                <p className="text-xs text-text-muted">Receita</p>
                <p className="font-medium text-primary-700 tabular-nums">
                  {formatBRL(item.receitaCentavos)}
                </p>
              </div>
              <div>
                <p className="text-xs text-text-muted">Custos</p>
                <p className="font-medium text-primary-500 tabular-nums">
                  {formatBRL(item.custoCentavos)}
                </p>
              </div>
              <div>
                <p className="text-xs text-text-muted">Margem</p>
                <p className={`font-bold tabular-nums ${margemColorClass(item.margemPercentual)}`}>
                  {formatBRL(item.margemCentavos)}
                </p>
              </div>
            </div>
            <p className="text-xs text-text-muted mt-1">
              {item.viagensConcluidas} {item.viagensConcluidas === 1 ? 'viagem' : 'viagens'}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}
