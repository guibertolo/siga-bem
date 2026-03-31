'use client';

import { formatBRL } from '@/lib/utils/currency';
import { InfoTooltip } from '@/components/ui/InfoTooltip';
import type { BIManutencaoTruckItem } from '@/types/bi';

interface BiManutencoesProps {
  data: BIManutencaoTruckItem[] | null;
}

function formatDate(dateStr: string | null): string {
  if (!dateStr) return '---';
  const [year, month, day] = dateStr.split('-');
  return `${day}/${month}/${year}`;
}

// Ordem fixa de exibição dos tipos de manutenção
const TIPO_ORDER: Record<string, number> = {
  'Pneu': 1,
  'Manutenção': 2,
  'Pedagio': 3,
  'Combustivel': 4,
  'Alimentacao': 5,
  'Lavagem': 6,
  'Estacionamento': 7,
  'Hospedagem': 8,
  'Seguro': 9,
  'Multa': 10,
  'Outros': 99,
};

function sortTipos<T extends { categoriaNome: string }>(tipos: T[]): T[] {
  return [...tipos].sort((a, b) => (TIPO_ORDER[a.categoriaNome] ?? 50) - (TIPO_ORDER[b.categoriaNome] ?? 50));
}

function ManutencaoTable({ data }: { data: BIManutencaoTruckItem[] }) {
  return (
    <table className="w-full text-sm">
      <thead>
        <tr className="border-b border-surface-border text-left">
          <th className="px-3 pb-2 font-semibold text-primary-700">#</th>
          <th className="px-3 pb-2 font-semibold text-primary-700">Caminhão</th>
          <th className="px-3 pb-2 font-semibold text-primary-700 text-right">Custo Total</th>
          <th className="px-3 pb-2 font-semibold text-primary-700 text-center">Eventos</th>
          <th className="px-3 pb-2 font-semibold text-primary-700 text-right">Última</th>
        </tr>
      </thead>
      <tbody>
        {data.map((item, index) => (
          <tr
            key={item.caminhaoId}
            className="border-b border-surface-border"
          >
            <td className="px-3 py-3 text-primary-500 align-top">{index + 1}</td>
            <td className="px-3 py-3">
              <div className="font-medium text-primary-900">{item.placa} — {item.modelo}</div>
              <div className="flex flex-wrap gap-1.5 mt-1.5">
                {sortTipos(item.tipos).map((tipo) => (
                  <span
                    key={tipo.categoriaNome}
                    className="inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium"
                    style={{
                      backgroundColor: tipo.categoriaCor ? `${tipo.categoriaCor}20` : undefined,
                      color: tipo.categoriaCor ?? undefined,
                    }}
                  >
                    {tipo.categoriaNome}: {formatBRL(tipo.totalCentavos)} ({tipo.qtdEventos}x)
                    </span>
                  ))}
                </div>
            </td>
            <td className="px-3 py-3 text-right font-semibold text-primary-900 tabular-nums align-top">
              {formatBRL(item.totalCustoCentavos)}
            </td>
            <td className="px-3 py-3 text-center text-primary-500 tabular-nums align-top">
              {item.totalEventos}
            </td>
            <td className="px-3 py-3 text-right text-primary-500 tabular-nums whitespace-nowrap align-top">
              {formatDate(item.ultimaManutencao)}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

export function BiManutencoes({ data }: BiManutencoesProps) {
  if (!data || data.length === 0) {
    return (
      <div className="rounded-card border border-surface-border bg-surface-card p-6 shadow-sm">
        <h3 className="text-lg font-semibold text-primary-900 mb-2 flex items-center gap-2">
          Manutenções por Caminhão
          <InfoTooltip text="Gastos com manutenção e troca de pneu agrupados por caminhão. Clique na linha para ver detalhes." />
        </h3>
        <p className="text-xs text-text-muted mb-4">
          Gastos com Manutenção e Pneu agrupados por veículo
        </p>
        <p className="text-sm text-text-muted">
          Nenhuma manutenção registrada no período selecionado.
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
      <h3 className="text-lg font-semibold text-primary-900 mb-2 flex items-center gap-2">
        Manutenções por Caminhão
        <InfoTooltip text="Gastos com manutenção e troca de pneu agrupados por caminhão. Clique na linha para ver detalhes." />
      </h3>
      <div className="flex flex-wrap items-center gap-4 mb-4">
        <p className="text-xs text-text-muted">
          Gastos com Manutenção e Pneu agrupados por veículo
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
        <ManutencaoTable data={data} />
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
                Última: {formatDate(item.ultimaManutencao)}
              </span>
            </div>
            {item.tipos.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mt-2">
                {sortTipos(item.tipos).map((tipo) => (
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
