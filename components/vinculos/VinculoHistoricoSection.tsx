'use client';

import { useState } from 'react';
import type { VinculoListItem } from '@/types/motorista-caminhao';

interface VinculoHistoricoSectionProps {
  historico: VinculoListItem[];
  totalEncerrados: number;
}

function formatDate(dateStr: string): string {
  const [year, month, day] = dateStr.split('-');
  return `${day}/${month}/${year}`;
}

export function VinculoHistoricoSection({
  historico,
  totalEncerrados,
}: VinculoHistoricoSectionProps) {
  const [expanded, setExpanded] = useState(false);

  if (totalEncerrados === 0) {
    return null;
  }

  return (
    <div role="region" aria-label="Historico de vinculos">
      <button
        type="button"
        onClick={() => setExpanded(!expanded)}
        aria-expanded={expanded}
        className="min-h-[48px] flex w-full items-center justify-between rounded-lg border border-surface-border bg-surface-card px-4 py-3 text-base font-semibold text-primary-700 transition-colors hover:bg-surface-hover"
      >
        <span>
          {expanded ? 'Ocultar Historico' : 'Mostrar Historico'}{' '}
          <span className="font-normal text-primary-500">({totalEncerrados} registros)</span>
        </span>
        <svg
          className={`h-5 w-5 shrink-0 text-primary-500 transition-transform duration-200 ${
            expanded ? 'rotate-180' : ''
          }`}
          aria-hidden="true"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {expanded && (
        <div className="mt-3 transition-all duration-200">
          {/* Mobile card view */}
          <div className="space-y-2 md:hidden">
            {historico.map((v) => (
              <div
                key={v.id}
                className="rounded-lg border border-surface-border bg-surface-muted/50 px-4 py-3"
              >
                <p className="text-base text-primary-900">
                  {v.motorista_nome} — {v.caminhao_placa}
                </p>
                <p className="text-base text-primary-500">
                  {formatDate(v.data_inicio)}
                  {v.data_fim ? ` a ${formatDate(v.data_fim)}` : ''}
                </p>
              </div>
            ))}
          </div>

          {/* Desktop table view */}
          <div className="hidden md:block overflow-hidden rounded-lg border border-surface-border">
            <table className="min-w-full divide-y divide-surface-border">
              <thead className="bg-surface-muted/50">
                <tr>
                  <th className="px-4 py-3 text-left text-sm font-medium uppercase tracking-wider text-primary-500">
                    Motorista
                  </th>
                  <th className="px-4 py-3 text-left text-sm font-medium uppercase tracking-wider text-primary-500">
                    Caminhao
                  </th>
                  <th className="px-4 py-3 text-left text-sm font-medium uppercase tracking-wider text-primary-500">
                    Período
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-surface-border bg-surface-card">
                {historico.map((v) => (
                  <tr key={v.id} className="transition-colors hover:bg-surface-hover">
                    <td className="whitespace-nowrap px-4 py-3 text-base text-primary-900">
                      {v.motorista_nome}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3">
                      <span className="text-base font-medium text-primary-900 tabular-nums">
                        {v.caminhao_placa}
                      </span>
                      <span className="ml-2 text-base text-primary-500">{v.caminhao_modelo}</span>
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-base text-primary-700">
                      {formatDate(v.data_inicio)}
                      {v.data_fim ? ` a ${formatDate(v.data_fim)}` : ''}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {totalEncerrados > historico.length && (
            <p className="mt-2 text-base text-primary-500 text-center">
              Mostrando {historico.length} de {totalEncerrados} registros
            </p>
          )}
        </div>
      )}
    </div>
  );
}
