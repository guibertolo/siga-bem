'use client';

import { formatBRL } from '@/lib/utils/currency';
import type { BIKpis } from '@/types/bi';

interface BiKpiCardsProps {
  data: BIKpis | null;
}

export function BiKpiCards({ data }: BiKpiCardsProps) {
  const cards = [
    {
      label: 'Gasto Total',
      value: formatBRL(data?.totalGastos ?? 0),
    },
    {
      label: 'Lancamentos',
      value: String(data?.totalLancamentos ?? 0),
    },
    {
      label: 'Media por Viagem',
      value: formatBRL(data?.gastoMedioPorViagem ?? 0),
    },
    {
      label: 'Custo por Km',
      value: data?.custoPorKm != null ? formatBRL(data.custoPorKm) : '\u2014',
    },
  ];

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {cards.map((card) => (
        <div
          key={card.label}
          className="rounded-card border border-slate-200 bg-surface-card p-5 shadow-sm"
        >
          <p className="text-sm font-medium text-primary-500">{card.label}</p>
          <p className="mt-1 text-2xl font-bold text-primary-900 tabular-nums">
            {card.value}
          </p>
        </div>
      ))}
    </div>
  );
}
