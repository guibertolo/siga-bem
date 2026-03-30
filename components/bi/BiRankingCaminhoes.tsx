'use client';

import { formatBRL } from '@/lib/utils/currency';
import type { BIRankingCaminhaoItem } from '@/types/bi';

interface BiRankingCaminhoesProps {
  data: BIRankingCaminhaoItem[] | null;
}

export function BiRankingCaminhoes({ data }: BiRankingCaminhoesProps) {
  if (!data || data.length === 0) {
    return (
      <div className="rounded-card border border-surface-border bg-surface-card p-6 shadow-sm">
        <h3 className="text-lg font-semibold text-primary-900 mb-4">
          Caminhoes que Mais Gastaram
        </h3>
        <p className="text-sm text-primary-400">
          Nenhum gasto com caminhao no periodo selecionado.
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-card border border-surface-border bg-surface-card p-6 shadow-sm">
      <h3 className="text-lg font-semibold text-primary-900 mb-4">
        Caminhoes que Mais Gastaram
      </h3>

      {/* Desktop table */}
      <div className="hidden sm:block overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-surface-border text-left">
              <th className="pb-2 font-semibold text-primary-700">#</th>
              <th className="pb-2 font-semibold text-primary-700">Placa</th>
              <th className="pb-2 font-semibold text-primary-700">Modelo</th>
              <th className="pb-2 font-semibold text-primary-700 text-right">Total Gasto</th>
              <th className="pb-2 font-semibold text-primary-700 text-right">%</th>
              <th className="pb-2 font-semibold text-primary-700 text-right">Qtd.</th>
            </tr>
          </thead>
          <tbody>
            {data.map((item, index) => (
              <tr key={item.caminhaoId} className="border-b border-surface-border">
                <td className="py-2.5 text-primary-500">{index + 1}</td>
                <td className="py-2.5 font-medium text-primary-900">{item.placa}</td>
                <td className="py-2.5 text-primary-700">{item.modelo}</td>
                <td className="py-2.5 text-right font-semibold text-primary-900 tabular-nums">
                  {formatBRL(item.totalGasto)}
                </td>
                <td className="py-2.5 text-right text-primary-500 tabular-nums">
                  {item.porcentagem.toFixed(1)}%
                </td>
                <td className="py-2.5 text-right text-primary-500 tabular-nums">
                  {item.qtdLancamentos}
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
                {item.porcentagem.toFixed(1)}%
              </span>
            </div>
            <p className="font-semibold text-primary-900">
              {item.placa} — {item.modelo}
            </p>
            <div className="flex items-center justify-between mt-1">
              <span className="text-sm font-bold text-primary-900 tabular-nums">
                {formatBRL(item.totalGasto)}
              </span>
              <span className="text-xs text-primary-500">
                {item.qtdLancamentos} gastos registrados
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
