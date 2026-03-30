'use client';

import { formatBRL } from '@/lib/utils/currency';
import type { BIManutencaoTruckItem } from '@/types/bi';

interface BiManutencoesProps {
  data: BIManutencaoTruckItem[] | null;
}

function formatDate(dateStr: string | null): string {
  if (!dateStr) return '---';
  const [year, month, day] = dateStr.split('-');
  return `${day}/${month}/${year}`;
}

export function BiManutencoes({ data }: BiManutencoesProps) {
  if (!data || data.length === 0) {
    return (
      <div className="rounded-card border border-surface-border bg-surface-card p-6 shadow-sm">
        <h3 className="text-lg font-semibold text-primary-900 mb-2">
          Manutencoes por Caminhao
        </h3>
        <p className="text-xs text-primary-400 mb-4">
          Gastos com Manutencao e Pneu agrupados por veiculo
        </p>
        <p className="text-sm text-primary-400">
          Nenhuma manutencao registrada no periodo selecionado.
        </p>
      </div>
    );
  }

  const totalGeral = data.reduce(
    (sum, item) => sum + item.totalCustoCentavos,
    0,
  );

  return (
    <div className="rounded-card border border-surface-border bg-surface-card p-6 shadow-sm">
      <h3 className="text-lg font-semibold text-primary-900 mb-2">
        Manutencoes por Caminhao
      </h3>
      <div className="flex flex-wrap items-center gap-4 mb-4">
        <p className="text-xs text-primary-400">
          Gastos com Manutencao e Pneu agrupados por veiculo
        </p>
        <div className="ml-auto flex items-center gap-2">
          <span className="text-xs text-primary-500">Total no periodo:</span>
          <span className="text-sm font-bold text-primary-900 tabular-nums">
            {formatBRL(totalGeral)}
          </span>
        </div>
      </div>

      {/* Desktop table */}
      <div className="hidden sm:block overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-surface-border text-left">
              <th className="px-3 pb-2 font-semibold text-primary-700">#</th>
              <th className="px-3 pb-2 font-semibold text-primary-700">Placa</th>
              <th className="px-3 pb-2 font-semibold text-primary-700">Modelo</th>
              <th className="px-3 pb-2 font-semibold text-primary-700 text-right">
                Custo Total
              </th>
              <th className="px-3 pb-2 font-semibold text-primary-700 text-right">
                Eventos
              </th>
              <th className="px-3 pb-2 font-semibold text-primary-700 text-right">
                Ultima
              </th>
              <th className="px-3 pb-2 font-semibold text-primary-700">
                Detalhamento
              </th>
            </tr>
          </thead>
          <tbody>
            {data.map((item, index) => (
              <tr
                key={item.caminhaoId}
                className="border-b border-surface-border align-top"
              >
                <td className="px-3 py-2.5 text-primary-500">{index + 1}</td>
                <td className="px-3 py-2.5 font-medium text-primary-900">
                  {item.placa}
                </td>
                <td className="px-3 py-2.5 text-primary-700">{item.modelo}</td>
                <td className="px-3 py-2.5 text-right font-semibold text-primary-900 tabular-nums">
                  {formatBRL(item.totalCustoCentavos)}
                </td>
                <td className="px-3 py-2.5 text-right text-primary-500 tabular-nums">
                  {item.totalEventos}
                </td>
                <td className="px-3 py-2.5 text-right text-primary-500 tabular-nums whitespace-nowrap">
                  {formatDate(item.ultimaManutencao)}
                </td>
                <td className="py-2.5">
                  <div className="flex flex-wrap gap-1.5">
                    {item.tipos.map((tipo) => (
                      <span
                        key={tipo.categoriaNome}
                        className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium"
                        style={{
                          backgroundColor: tipo.categoriaCor
                            ? `${tipo.categoriaCor}20`
                            : undefined,
                          color: tipo.categoriaCor ?? undefined,
                        }}
                      >
                        {tipo.categoriaNome}: {formatBRL(tipo.totalCentavos)} (
                        {tipo.qtdEventos}x)
                      </span>
                    ))}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Mobile cards */}
      <div className="sm:hidden space-y-3">
        {data.map((item, index) => (
          <div
            key={item.caminhaoId}
            className="rounded-lg border border-surface-border bg-surface-muted p-3"
          >
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs text-primary-500">#{index + 1}</span>
              <span className="text-xs text-primary-500">
                {item.totalEventos} eventos
              </span>
            </div>
            <p className="font-semibold text-primary-900">
              {item.placa} — {item.modelo}
            </p>
            <div className="flex items-center justify-between mt-2">
              <span className="text-sm font-bold text-primary-900 tabular-nums">
                {formatBRL(item.totalCustoCentavos)}
              </span>
              <span className="text-xs text-primary-500">
                Ultima: {formatDate(item.ultimaManutencao)}
              </span>
            </div>
            {item.tipos.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mt-2">
                {item.tipos.map((tipo) => (
                  <span
                    key={tipo.categoriaNome}
                    className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium"
                    style={{
                      backgroundColor: tipo.categoriaCor
                        ? `${tipo.categoriaCor}20`
                        : undefined,
                      color: tipo.categoriaCor ?? undefined,
                    }}
                  >
                    {tipo.categoriaNome}: {formatBRL(tipo.totalCentavos)}
                  </span>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
