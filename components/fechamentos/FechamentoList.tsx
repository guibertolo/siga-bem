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
    <>
    {/* Mobile card view */}
    <div className="space-y-3 md:hidden" aria-label="Lista de acertos de contas">
      {fechamentos.map((f) => (
        <div key={f.id} className="rounded-lg border border-surface-border bg-surface-card p-4">
          <div className="flex items-start justify-between mb-2">
            <p className="text-base font-medium text-primary-900">{f.motorista_nome}</p>
            <span className={`inline-block rounded-full px-3 py-1 text-xs font-semibold ${FECHAMENTO_STATUS_COLORS[f.status]}`}>
              {FECHAMENTO_STATUS_LABELS[f.status]}
            </span>
          </div>
          <div className="text-sm text-primary-700 space-y-0.5">
            <p>{formatarPeriodoFechamento(f.periodo_inicio, f.periodo_fim, f.tipo)} - {FECHAMENTO_TIPO_LABELS[f.tipo]}</p>
          </div>
          <div className="mt-2 grid grid-cols-3 gap-2 text-sm">
            <div>
              <p className="text-primary-500">Viagens</p>
              <p className="font-medium tabular-nums text-primary-900">{formatBRL(f.total_viagens)}</p>
            </div>
            <div>
              <p className="text-primary-500">Gastos</p>
              <p className="font-medium tabular-nums text-primary-900">{formatBRL(f.total_gastos)}</p>
            </div>
            <div>
              <p className="text-primary-500">Saldo</p>
              <p className={`font-medium tabular-nums ${f.saldo_motorista >= 0 ? 'text-success' : 'text-danger'}`}>
                {formatBRL(f.saldo_motorista)}
              </p>
            </div>
          </div>
          <div className="mt-3">
            <Link
              href={`/fechamentos/${f.id}`}
              className="inline-flex items-center gap-1.5 rounded-md px-3 py-2 text-sm font-medium text-primary-700 hover:bg-surface-hover transition-colors min-h-[40px]"
            >
              Detalhes
            </Link>
          </div>
        </div>
      ))}
    </div>

    {/* Desktop table view */}
    <div className="hidden md:block overflow-x-auto rounded-lg border border-surface-border bg-surface-card">
      <table className="w-full" aria-label="Lista de acertos de contas">
        <thead>
          <tr className="border-b border-surface-border bg-surface-muted text-left">
            <th scope="col" className="px-4 py-3.5 text-base font-medium text-primary-700">Motorista</th>
            <th scope="col" className="px-4 py-3.5 text-base font-medium text-primary-700">Período</th>
            <th scope="col" className="px-4 py-3.5 text-base font-medium text-primary-700">Tipo</th>
            <th scope="col" className="px-4 py-3.5 text-base text-right font-medium text-primary-700">Viagens</th>
            <th scope="col" className="px-4 py-3.5 text-base text-right font-medium text-primary-700">Gastos</th>
            <th scope="col" className="px-4 py-3.5 text-base text-right font-medium text-primary-700">Saldo</th>
            <th scope="col" className="px-4 py-3.5 text-base font-medium text-primary-700">Situação</th>
            <th scope="col" className="px-4 py-3.5 text-base text-right font-medium text-primary-700">Ações</th>
          </tr>
        </thead>
        <tbody>
          {fechamentos.map((f) => (
            <tr
              key={f.id}
              className="border-b border-surface-border last:border-0 hover:bg-surface-muted"
            >
              <td className="px-4 py-3.5 text-base text-primary-900">{f.motorista_nome}</td>
              <td className="whitespace-nowrap px-4 py-3.5 text-base tabular-nums text-primary-700">
                {formatarPeriodoFechamento(f.periodo_inicio, f.periodo_fim, f.tipo)}
              </td>
              <td className="px-4 py-3.5 text-base text-primary-700">
                {FECHAMENTO_TIPO_LABELS[f.tipo]}
              </td>
              <td className="whitespace-nowrap px-4 py-3.5 text-base text-right tabular-nums text-primary-900">
                {formatBRL(f.total_viagens)}
              </td>
              <td className="whitespace-nowrap px-4 py-3.5 text-base text-right tabular-nums text-primary-900">
                {formatBRL(f.total_gastos)}
              </td>
              <td
                className={`whitespace-nowrap px-4 py-3.5 text-base text-right tabular-nums font-medium ${
                  f.saldo_motorista >= 0 ? 'text-success' : 'text-danger'
                }`}
              >
                {formatBRL(f.saldo_motorista)}
              </td>
              <td className="px-4 py-3.5">
                <span
                  className={`inline-block rounded-full px-3 py-1 text-sm font-semibold ${
                    FECHAMENTO_STATUS_COLORS[f.status]
                  }`}
                >
                  {FECHAMENTO_STATUS_LABELS[f.status]}
                </span>
              </td>
              <td className="px-4 py-3.5 text-right">
                <Link
                  href={`/fechamentos/${f.id}`}
                  className="inline-flex items-center gap-1.5 rounded-md px-3 py-2 text-sm font-medium text-primary-700 hover:bg-surface-hover transition-colors min-h-[40px]"
                >
                  <svg className="h-4 w-4" aria-hidden="true" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                  </svg>
                  <span>Detalhes</span>
                </Link>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
    </>
  );
}
