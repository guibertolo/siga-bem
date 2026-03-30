'use client';

import { useState } from 'react';
import Link from 'next/link';
import { formatBRL } from '@/lib/utils/currency';
import { cn } from '@/lib/utils/cn';
import type { ViagemPendenteAcerto } from '@/app/(dashboard)/fechamentos/actions';

interface ViagensPendentesAcertoProps {
  viagens: ViagemPendenteAcerto[];
}

interface MotoristaGroup {
  motorista_id: string;
  motorista_nome: string;
  viagens: ViagemPendenteAcerto[];
  totalFrete: number;
  totalGanho: number;
}

function formatarData(iso: string): string {
  const date = new Date(iso);
  return date.toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
}

function agruparPorMotorista(viagens: ViagemPendenteAcerto[]): MotoristaGroup[] {
  const map = new Map<string, MotoristaGroup>();

  for (const v of viagens) {
    const existing = map.get(v.motorista_id);
    if (existing) {
      existing.viagens.push(v);
      existing.totalFrete += v.valor_total;
      existing.totalGanho += v.valor_motorista;
    } else {
      map.set(v.motorista_id, {
        motorista_id: v.motorista_id,
        motorista_nome: v.motorista_nome,
        viagens: [v],
        totalFrete: v.valor_total,
        totalGanho: v.valor_motorista,
      });
    }
  }

  return Array.from(map.values()).sort((a, b) => b.viagens.length - a.viagens.length);
}

function MotoristaCard({ group }: { group: MotoristaGroup }) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="rounded-lg border border-surface-border bg-surface-card overflow-hidden">
      {/* Header — always visible, clickable */}
      <button
        type="button"
        onClick={() => setExpanded(!expanded)}
        className="flex w-full items-center justify-between gap-4 p-4 text-left min-h-[64px] transition-colors hover:bg-surface-hover"
      >
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-lg font-bold text-primary-900 truncate">
              {group.motorista_nome}
            </span>
            <span className="inline-flex items-center justify-center rounded-full bg-amber-100 px-2.5 py-0.5 text-sm font-semibold text-amber-800 shrink-0">
              {group.viagens.length} {group.viagens.length === 1 ? 'viagem' : 'viagens'}
            </span>
          </div>
          <div className="mt-1 flex items-center gap-4 text-base">
            <span className="text-primary-500">
              Frete: <span className="font-medium tabular-nums text-primary-900">{formatBRL(group.totalFrete)}</span>
            </span>
            <span className="text-primary-500">
              Ganho: <span className="font-medium tabular-nums text-success">{formatBRL(group.totalGanho)}</span>
            </span>
          </div>
        </div>

        {/* Chevron */}
        <svg
          className={cn('h-6 w-6 shrink-0 text-primary-500 transition-transform', expanded && 'rotate-180')}
          aria-hidden="true"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {/* Expanded content */}
      {expanded && (
        <div className="border-t border-surface-border">
          <div className="divide-y divide-surface-border">
            {group.viagens.map((v) => (
              <div key={v.id} className="flex items-center gap-4 px-4 py-3">
                <div className="flex-1 min-w-0">
                  <p className="text-base font-medium text-primary-900">
                    {v.origem} &rarr; {v.destino}
                  </p>
                  <div className="mt-1 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-primary-500">
                    <span>{formatarData(v.data_saida)}</span>
                    <span>Frete: <span className="font-medium tabular-nums text-primary-700">{formatBRL(v.valor_total)}</span></span>
                    <span>Ganho ({v.percentual_pagamento}%): <span className="font-medium tabular-nums text-success">{formatBRL(v.valor_motorista)}</span></span>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Action */}
          <div className="border-t border-surface-border px-4 py-3 bg-surface-muted">
            <Link
              href={`/fechamentos/novo?motorista_id=${group.motorista_id}`}
              className="inline-flex items-center gap-2 rounded-lg bg-success px-4 py-3 text-base font-semibold text-white transition-colors hover:bg-success/90 min-h-[48px]"
            >
              <svg className="h-5 w-5" aria-hidden="true" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              Fazer Acerto de {group.motorista_nome}
            </Link>
          </div>
        </div>
      )}
    </div>
  );
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

  const grupos = agruparPorMotorista(viagens);

  return (
    <div>
      <h3 className="mb-3 text-xl font-bold text-primary-900">
        Viagens Prontas para Acerto
        <span className="ml-2 inline-flex items-center justify-center rounded-full bg-amber-100 px-2.5 py-0.5 text-sm font-semibold text-amber-800">
          {viagens.length}
        </span>
      </h3>

      <div className="grid gap-3">
        {grupos.map((group) => (
          <MotoristaCard key={group.motorista_id} group={group} />
        ))}
      </div>
    </div>
  );
}
