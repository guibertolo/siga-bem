'use client';

import { useState } from 'react';
import Link from 'next/link';
import { formatBRL } from '@/lib/utils/currency';
import { cn } from '@/lib/utils/cn';
import type { ViagemPendenteAcerto } from '@/app/(dashboard)/fechamentos/actions';

interface ViagensPendentesAcertoProps {
  viagens: ViagemPendenteAcerto[];
  isMultiEmpresa?: boolean;
}

interface MotoristaGroup {
  motorista_id: string;
  motorista_nome: string;
  empresa_nome?: string;
  viagens: ViagemPendenteAcerto[];
  totalFrete: number;
  totalGanho: number;
  totalDespesas: number;
}

function formatarData(iso: string): string {
  const date = new Date(iso);
  return date.toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
}

function agruparPorMotorista(viagens: ViagemPendenteAcerto[], isMultiEmpresa?: boolean): MotoristaGroup[] {
  const map = new Map<string, MotoristaGroup>();

  for (const v of viagens) {
    const empresaNome = (v as ViagemPendenteAcerto & { empresa_nome?: string }).empresa_nome;
    // In multi-empresa mode, group by motorista+empresa to keep them separate
    const key = isMultiEmpresa && empresaNome
      ? `${v.motorista_id}::${empresaNome}`
      : v.motorista_id;
    const existing = map.get(key);
    if (existing) {
      existing.viagens.push(v);
      existing.totalFrete += v.valor_total;
      existing.totalGanho += v.valor_motorista;
      existing.totalDespesas += v.totalDespesas;
    } else {
      map.set(key, {
        motorista_id: v.motorista_id,
        motorista_nome: v.motorista_nome,
        empresa_nome: empresaNome,
        viagens: [v],
        totalFrete: v.valor_total,
        totalGanho: v.valor_motorista,
        totalDespesas: v.totalDespesas,
      });
    }
  }

  return Array.from(map.values()).sort((a, b) => b.viagens.length - a.viagens.length);
}

function MotoristaCard({ group, isMultiEmpresa }: { group: MotoristaGroup; isMultiEmpresa?: boolean }) {
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
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-lg font-bold text-primary-900 truncate">
              {group.motorista_nome}
            </span>
            {isMultiEmpresa && group.empresa_nome && (
              <span className="inline-flex items-center rounded-full bg-info/10 px-2 py-0.5 text-xs font-medium text-info shrink-0">
                {group.empresa_nome}
              </span>
            )}
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
            {group.viagens.map((v) => {
              const lucroViagem = v.valor_total - v.totalDespesas;
              return (
                <div key={v.id} className="px-4 py-3">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <p className="text-base font-medium text-primary-900">
                        {v.origem} &rarr; {v.destino}
                      </p>
                      <p className="mt-1 text-sm text-primary-500">
                        {formatarData(v.data_saida)}
                      </p>
                    </div>
                    <Link
                      href={`/fechamentos/novo?motorista_id=${v.motorista_id}&data_inicio=${v.data_saida.split('T')[0]}&data_fim=${v.data_saida.split('T')[0]}`}
                      className="shrink-0 inline-flex items-center gap-1.5 rounded-md bg-btn-primary px-3 py-2 text-sm font-medium text-white no-underline transition-colors hover:bg-btn-primary-hover min-h-[40px]"
                      title="Acertar esta viagem"
                    >
                      Acertar
                    </Link>
                  </div>

                  {/* Detalhamento financeiro da viagem */}
                  <div className="mt-2 grid grid-cols-2 gap-x-4 gap-y-1 rounded-md bg-surface-muted p-3 text-sm">
                    <div className="flex justify-between">
                      <span className="text-primary-500">Valor do Frete:</span>
                      <span className="font-medium tabular-nums text-primary-900">{formatBRL(v.valor_total)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-primary-500">Parte do Motorista ({v.percentual_pagamento}%):</span>
                      <span className="font-medium tabular-nums text-success">{formatBRL(v.valor_motorista)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-primary-500">Total de Despesas:</span>
                      <span className="font-medium tabular-nums text-danger">{formatBRL(v.totalDespesas)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-primary-500">Lucro da Viagem:</span>
                      <span className={`font-bold tabular-nums ${lucroViagem >= 0 ? 'text-success' : 'text-danger'}`}>
                        {formatBRL(lucroViagem)}
                      </span>
                    </div>
                  </div>

                  {/* Link para ver comprovantes de despesas */}
                  <div className="mt-2">
                    <Link
                      href={`/viagens/${v.id}`}
                      className="inline-flex items-center gap-1.5 text-sm font-medium text-primary-700 transition-colors hover:text-primary-900 min-h-[40px]"
                    >
                      <svg className="h-4 w-4" aria-hidden="true" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                      Ver Despesas e Comprovantes
                    </Link>
                  </div>
                </div>
              );
            })}
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

export function ViagensPendentesAcerto({ viagens, isMultiEmpresa }: ViagensPendentesAcertoProps) {
  if (viagens.length === 0) {
    return (
      <div className="rounded-lg border border-success/30 bg-success/5 p-4">
        <p className="text-base font-medium text-success">
          Todas as viagens foram acertadas
        </p>
      </div>
    );
  }

  const grupos = agruparPorMotorista(viagens, isMultiEmpresa);

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
          <MotoristaCard
            key={isMultiEmpresa ? `${group.motorista_id}::${group.empresa_nome}` : group.motorista_id}
            group={group}
            isMultiEmpresa={isMultiEmpresa}
          />
        ))}
      </div>
    </div>
  );
}
