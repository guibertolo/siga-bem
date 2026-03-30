'use client';

import Link from 'next/link';
import { formatBRL } from '@/lib/utils/currency';
import type { ViagemPendenteAcerto } from '@/app/(dashboard)/fechamentos/actions';

interface ViagensPendentesAcertoProps {
  viagens: ViagemPendenteAcerto[];
}

function formatarData(iso: string): string {
  const date = new Date(iso);
  return date.toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
}

export function ViagensPendentesAcerto({ viagens }: ViagensPendentesAcertoProps) {
  if (viagens.length === 0) {
    return (
      <div className="rounded-lg border border-success/30 bg-success/5 p-4">
        <p className="text-base font-medium text-success">
          Todas as viagens foram acertadas
        </p>
      </div>
    );
  }

  return (
    <div>
      <h3 className="mb-3 text-xl font-bold text-primary-900">
        Viagens Prontas para Acerto
        <span className="ml-2 inline-flex items-center justify-center rounded-full bg-amber-100 px-2.5 py-0.5 text-sm font-semibold text-amber-800">
          {viagens.length}
        </span>
      </h3>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {viagens.map((v) => (
          <div
            key={v.id}
            className="rounded-lg border border-surface-border bg-surface-card p-4 border-l-4 border-l-success"
          >
            {/* Motorista */}
            <p className="text-base font-semibold text-primary-900">
              {v.motorista_nome}
            </p>

            {/* Rota */}
            <p className="mt-1 text-base text-primary-700">
              {v.origem} &rarr; {v.destino}
            </p>

            {/* Data */}
            <p className="mt-1 text-sm text-primary-500">
              {formatarData(v.data_saida)}
            </p>

            {/* Valores */}
            <div className="mt-3 grid grid-cols-2 gap-2">
              <div>
                <p className="text-sm text-primary-500">Valor do Frete</p>
                <p className="text-base font-medium tabular-nums text-primary-900">
                  {formatBRL(v.valor_total)}
                </p>
              </div>
              <div>
                <p className="text-sm text-primary-500">
                  Ganho Motorista ({v.percentual_pagamento}%)
                </p>
                <p className="text-base font-medium tabular-nums text-success">
                  {formatBRL(v.valor_motorista)}
                </p>
              </div>
            </div>

            {/* Action */}
            <div className="mt-3">
              <Link
                href={`/fechamentos/novo?motorista_id=${v.motorista_id}`}
                className="inline-flex items-center gap-2 rounded-lg bg-success px-4 py-3 text-base font-semibold text-white transition-colors hover:bg-success/90 min-h-[48px]"
              >
                <svg className="h-5 w-5" aria-hidden="true" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                Fazer Acerto
              </Link>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
