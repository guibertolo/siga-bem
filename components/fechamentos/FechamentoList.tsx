'use client';

import Link from 'next/link';
import { formatBRL } from '@/lib/utils/currency';
import { formatarPeriodoFechamento } from '@/lib/utils/formato-periodo';
import {
  FECHAMENTO_STATUS_LABELS,
  FECHAMENTO_STATUS_COLORS,
  FECHAMENTO_TIPO_LABELS,
} from '@/types/fechamento';
import type { FechamentoListItem } from '@/types/fechamento';

interface FechamentoListProps {
  fechamentos: FechamentoListItem[];
}

export function FechamentoList({ fechamentos }: FechamentoListProps) {
  return (
    <div className="overflow-x-auto rounded-lg border border-surface-border bg-surface-card">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-surface-border bg-gray-50 text-left">
            <th className="px-4 py-3 font-medium text-primary-700">Motorista</th>
            <th className="px-4 py-3 font-medium text-primary-700">Periodo</th>
            <th className="px-4 py-3 font-medium text-primary-700">Tipo</th>
            <th className="px-4 py-3 text-right font-medium text-primary-700">Viagens</th>
            <th className="px-4 py-3 text-right font-medium text-primary-700">Gastos</th>
            <th className="px-4 py-3 text-right font-medium text-primary-700">Saldo</th>
            <th className="px-4 py-3 font-medium text-primary-700">Status</th>
            <th className="px-4 py-3 text-right font-medium text-primary-700">Acoes</th>
          </tr>
        </thead>
        <tbody>
          {fechamentos.map((f) => (
            <tr
              key={f.id}
              className="border-b border-surface-border last:border-0 hover:bg-gray-50"
            >
              <td className="px-4 py-3 text-primary-900">{f.motorista_nome}</td>
              <td className="whitespace-nowrap px-4 py-3 tabular-nums text-primary-700">
                {formatarPeriodoFechamento(f.periodo_inicio, f.periodo_fim, f.tipo)}
              </td>
              <td className="px-4 py-3 text-primary-700">
                {FECHAMENTO_TIPO_LABELS[f.tipo]}
              </td>
              <td className="whitespace-nowrap px-4 py-3 text-right tabular-nums text-primary-900">
                {formatBRL(f.total_viagens)}
              </td>
              <td className="whitespace-nowrap px-4 py-3 text-right tabular-nums text-primary-900">
                {formatBRL(f.total_gastos)}
              </td>
              <td
                className={`whitespace-nowrap px-4 py-3 text-right tabular-nums font-medium ${
                  f.saldo_motorista >= 0 ? 'text-green-700' : 'text-red-700'
                }`}
              >
                {formatBRL(f.saldo_motorista)}
              </td>
              <td className="px-4 py-3">
                <span
                  className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-medium ${
                    FECHAMENTO_STATUS_COLORS[f.status]
                  }`}
                >
                  {FECHAMENTO_STATUS_LABELS[f.status]}
                </span>
              </td>
              <td className="px-4 py-3 text-right">
                <Link
                  href={`/fechamentos/${f.id}`}
                  className="text-primary-600 transition-colors hover:text-primary-800"
                >
                  Detalhes
                </Link>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
