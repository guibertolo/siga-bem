'use client';

import type { BIEficienciaMotoristaItem } from '@/types/bi';

interface BiRankingMotoristasProps {
  data: BIEficienciaMotoristaItem[] | null;
}

function getBadge(kml: number | null): { label: string; classes: string } {
  if (kml == null) return { label: 'Sem dados', classes: 'bg-surface-muted text-text-muted border border-surface-border' };
  if (kml > 2.5) return { label: 'Bom', classes: 'bg-success/10 text-success border border-success/20' };
  if (kml >= 2.0) return { label: 'Regular', classes: 'bg-warning/10 text-warning border border-warning/20' };
  return { label: 'Baixo', classes: 'bg-danger/10 text-danger border border-danger/20' };
}

export function BiRankingMotoristas({ data }: BiRankingMotoristasProps) {
  if (!data || data.length === 0) {
    return (
      <div className="rounded-card border border-surface-border bg-surface-card p-6 shadow-sm">
        <h3 className="text-lg font-semibold text-primary-900 mb-4">
          Consumo por Motorista (km/L)
        </h3>
        <p className="text-sm text-text-muted">
          Nenhum dado de consumo no período selecionado.
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-card border border-surface-border bg-surface-card p-6 shadow-sm">
      <h3 className="text-lg font-semibold text-primary-900 mb-1">
        Consumo por Motorista (km/L)
      </h3>
      <p className="text-sm text-text-muted mb-4">
        Eficiência de combustível de cada motorista
      </p>

      {/* Desktop table */}
      <div className="hidden sm:block overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-surface-border text-left">
              <th className="pb-2 font-semibold text-primary-700">#</th>
              <th className="pb-2 font-semibold text-primary-700">Motorista</th>
              <th className="pb-2 font-semibold text-primary-700 text-right">km/L</th>
              <th className="pb-2 font-semibold text-primary-700 text-right">Total Litros</th>
              <th className="pb-2 font-semibold text-primary-700 text-right">Total km</th>
              <th className="pb-2 font-semibold text-primary-700 text-center">Status</th>
            </tr>
          </thead>
          <tbody>
            {data.map((item, index) => {
              const badge = getBadge(item.kmPorLitro);
              return (
                <tr key={item.motoristaId} className="border-b border-surface-border">
                  <td className="py-2.5 text-primary-500">{index + 1}</td>
                  <td className="py-2.5 font-medium text-primary-900">{item.nome}</td>
                  <td className="py-2.5 text-right font-bold text-primary-900 tabular-nums">
                    {item.kmPorLitro != null ? item.kmPorLitro.toFixed(1) : '-'}
                  </td>
                  <td className="py-2.5 text-right text-primary-500 tabular-nums">
                    {item.totalLitros.toFixed(0)} L
                  </td>
                  <td className="py-2.5 text-right text-primary-500 tabular-nums">
                    {item.kmTotal > 0 ? `${item.kmTotal.toLocaleString('pt-BR')} km` : '-'}
                  </td>
                  <td className="py-2.5 text-center">
                    <span className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-semibold ${badge.classes}`}>
                      {badge.label}
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Mobile cards */}
      <div className="sm:hidden space-y-3">
        {data.map((item, index) => {
          const badge = getBadge(item.kmPorLitro);
          return (
            <div
              key={item.motoristaId}
              className="rounded-lg border border-surface-border bg-surface-muted p-3"
            >
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs text-primary-500">#{index + 1}</span>
                <span className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-semibold ${badge.classes}`}>
                  {badge.label}
                </span>
              </div>
              <p className="font-semibold text-primary-900">{item.nome}</p>
              <div className="flex items-center justify-between mt-1">
                <span className="text-sm font-bold text-primary-900 tabular-nums">
                  {item.kmPorLitro != null ? `${item.kmPorLitro.toFixed(1)} km/L` : 'Sem dados'}
                </span>
                <span className="text-xs text-primary-500">
                  {item.totalLitros.toFixed(0)} L · {item.kmTotal > 0 ? `${item.kmTotal.toLocaleString('pt-BR')} km` : '-'}
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
