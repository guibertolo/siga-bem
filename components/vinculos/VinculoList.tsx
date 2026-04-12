'use client';

import { useState, useTransition, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { encerrarVinculo } from '@/app/(dashboard)/vinculos/actions';
import type { VinculoListItem } from '@/types/motorista-caminhao';

interface VinculoListProps {
  vinculos: VinculoListItem[];
}

function formatDate(dateStr: string): string {
  const [year, month, day] = dateStr.split('-');
  return `${day}/${month}/${year}`;
}

interface CaminhaoGroup {
  placa: string;
  modelo: string;
  vinculos: VinculoListItem[];
}

export function VinculoList({ vinculos }: VinculoListProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [encerrandoId, setEncerrandoId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleEncerrar = (vinculoId: string) => {
    setError(null);
    setEncerrandoId(vinculoId);
    startTransition(async () => {
      const result = await encerrarVinculo(vinculoId);
      setEncerrandoId(null);
      if (!result.success) {
        setError(result.error ?? 'Erro ao encerrar vinculo.');
        return;
      }
      router.refresh();
    });
  };

  // Group active vinculos by caminhao for clearer display
  const { groupedActive, inactive } = useMemo(() => {
    const active = vinculos.filter((v) => v.ativo);
    const inact = vinculos.filter((v) => !v.ativo);

    const groupMap = new Map<string, CaminhaoGroup>();
    for (const v of active) {
      const key = v.caminhao_placa;
      if (!groupMap.has(key)) {
        groupMap.set(key, {
          placa: v.caminhao_placa,
          modelo: v.caminhao_modelo,
          vinculos: [],
        });
      }
      groupMap.get(key)!.vinculos.push(v);
    }

    return {
      groupedActive: Array.from(groupMap.values()),
      inactive: inact,
    };
  }, [vinculos]);

  if (vinculos.length === 0) {
    return (
      <div className="rounded-lg border border-surface-border bg-surface-card p-8 text-center">
        <p className="text-base text-primary-500">Nenhum vínculo encontrado.</p>
        <p className="mt-1 text-sm text-text-muted">Vincule motoristas a caminhoes para gerenciar a frota.</p>
      </div>
    );
  }

  return (
    <div>
      {error && (
        <div className="mb-4 rounded-lg border border-danger/20 bg-alert-danger-bg p-4 text-sm text-danger">
          {error}
        </div>
      )}

      {/* Active vinculos grouped by caminhao */}
      {groupedActive.length > 0 && (
        <div className="space-y-4">
          {groupedActive.map((group) => (
            <div key={group.placa} className="rounded-lg border border-surface-border bg-surface-card overflow-hidden">
              {/* Caminhao header */}
              <div className="flex items-center gap-3 border-b border-surface-border bg-surface-muted/50 px-4 py-3">
                <svg className="h-5 w-5 text-primary-500" aria-hidden="true" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
                </svg>
                <div>
                  <span className="text-base font-semibold text-primary-900">{group.placa}</span>
                  <span className="ml-2 text-sm text-primary-500">{group.modelo}</span>
                </div>
                {group.vinculos.length > 1 && (
                  <span className="ml-auto inline-flex items-center rounded-full bg-alert-warning-bg px-2.5 py-0.5 text-xs font-semibold text-badge-warning-fg dark:text-warning border border-warning/30">
                    {group.vinculos.length} motoristas ativos
                  </span>
                )}
              </div>

              {/* Motoristas for this caminhao */}
              <div className="divide-y divide-surface-border">
                {group.vinculos.map((v) => (
                  <div key={v.id} className="flex items-center justify-between px-4 py-3">
                    <div className="flex items-center gap-4">
                      <div>
                        <p className="text-base font-medium text-primary-900">{v.motorista_nome}</p>
                        <p className="text-sm text-primary-500">{v.motorista_cpf}</p>
                      </div>
                      <div className="text-sm text-primary-700">
                        Desde {formatDate(v.data_inicio)}
                      </div>
                      <span className="inline-flex items-center rounded-full bg-alert-success-bg px-3 py-1 text-xs font-semibold text-success">
                        Ativo
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleEncerrar(v.id)}
                      disabled={isPending && encerrandoId === v.id}
                      className="inline-flex items-center gap-1.5 rounded-md px-3 py-2 text-sm font-medium text-danger hover:bg-alert-danger-bg transition-colors min-h-[40px] disabled:opacity-50"
                    >
                      <svg className="h-4 w-4" aria-hidden="true" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                      {isPending && encerrandoId === v.id ? 'Encerrando...' : 'Encerrar'}
                    </button>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Inactive vinculos — flat list */}
      {inactive.length > 0 && (
        <div className="mt-6">
          <h3 className="mb-3 text-base font-semibold text-primary-500">Vinculos Encerrados</h3>

          {/* Mobile card view */}
          <div className="space-y-3 md:hidden">
            {inactive.map((v) => (
              <div key={v.id} className="rounded-lg border border-surface-border bg-surface-card p-4">
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <p className="text-base font-medium text-primary-900">{v.motorista_nome}</p>
                    <p className="text-sm text-primary-500">{v.motorista_cpf}</p>
                  </div>
                  <span className="inline-flex items-center rounded-full bg-surface-muted px-3 py-1 text-xs font-semibold text-text-muted">
                    Encerrado
                  </span>
                </div>
                <div className="text-sm text-primary-700 space-y-0.5">
                  <p>{v.caminhao_placa} - {v.caminhao_modelo}</p>
                  <p>{formatDate(v.data_inicio)}{v.data_fim ? ` - ${formatDate(v.data_fim)}` : ''}</p>
                </div>
              </div>
            ))}
          </div>

          {/* Desktop table view */}
          <div className="hidden md:block overflow-hidden rounded-lg border border-surface-border">
            <table className="min-w-full divide-y divide-surface-border">
              <thead className="bg-surface-card">
                <tr>
                  <th className="px-4 py-3.5 text-left text-sm font-medium uppercase tracking-wider text-primary-500">
                    Motorista
                  </th>
                  <th className="px-4 py-3.5 text-left text-sm font-medium uppercase tracking-wider text-primary-500">
                    Caminhao
                  </th>
                  <th className="px-4 py-3.5 text-left text-sm font-medium uppercase tracking-wider text-primary-500">
                    Período
                  </th>
                  <th className="px-4 py-3.5 text-left text-sm font-medium uppercase tracking-wider text-primary-500">
                    Situação
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-surface-border bg-surface-card">
                {inactive.map((v) => (
                  <tr key={v.id} className="transition-colors hover:bg-surface-hover">
                    <td className="whitespace-nowrap px-4 py-3.5">
                      <div className="text-base font-medium text-primary-900">{v.motorista_nome}</div>
                      <div className="text-sm text-primary-500">{v.motorista_cpf}</div>
                    </td>
                    <td className="whitespace-nowrap px-4 py-3.5">
                      <div className="text-base font-medium text-primary-900">{v.caminhao_placa}</div>
                      <div className="text-sm text-primary-500">{v.caminhao_modelo}</div>
                    </td>
                    <td className="whitespace-nowrap px-4 py-3.5 text-base text-primary-700">
                      {formatDate(v.data_inicio)}
                      {v.data_fim ? ` — ${formatDate(v.data_fim)}` : ''}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3.5">
                      <span className="inline-flex items-center rounded-full bg-surface-muted px-3 py-1 text-sm font-semibold text-text-muted">
                        Encerrado
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
