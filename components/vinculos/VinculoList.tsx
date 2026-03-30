'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { encerrarVinculo } from '@/app/(dashboard)/vinculos/actions';
import { cn } from '@/lib/utils/cn';
import type { VinculoListItem } from '@/types/motorista-caminhao';

interface VinculoListProps {
  vinculos: VinculoListItem[];
}

function formatDate(dateStr: string): string {
  const [year, month, day] = dateStr.split('-');
  return `${day}/${month}/${year}`;
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

  if (vinculos.length === 0) {
    return (
      <div className="rounded-lg border border-surface-border bg-surface-card p-8 text-center">
        <p className="text-base text-primary-500">Nenhum vinculo encontrado.</p>
        <p className="mt-1 text-sm text-primary-400">Vincule motoristas a caminhoes para gerenciar a frota.</p>
      </div>
    );
  }

  return (
    <div>
      {error && (
        <div className="mb-4 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          {error}
        </div>
      )}

      {/* Mobile card view */}
      <div className="space-y-3 md:hidden">
        {vinculos.map((v) => (
          <div key={v.id} className="rounded-lg border border-surface-border bg-surface-card p-4">
            <div className="flex items-start justify-between mb-2">
              <div>
                <p className="text-base font-medium text-primary-900">{v.motorista_nome}</p>
                <p className="text-sm text-primary-500">{v.motorista_cpf}</p>
              </div>
              <span
                className={cn(
                  'inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold',
                  v.ativo ? 'bg-green-100 text-green-800' : 'bg-surface-muted text-gray-600',
                )}
              >
                {v.ativo ? 'Ativo' : 'Encerrado'}
              </span>
            </div>
            <div className="text-sm text-primary-700 space-y-0.5">
              <p>{v.caminhao_placa} - {v.caminhao_modelo}</p>
              <p>{formatDate(v.data_inicio)}{v.data_fim ? ` - ${formatDate(v.data_fim)}` : ' - atual'}</p>
            </div>
            {v.ativo && (
              <div className="mt-3">
                <button
                  type="button"
                  onClick={() => handleEncerrar(v.id)}
                  disabled={isPending && encerrandoId === v.id}
                  className="inline-flex items-center gap-1.5 rounded-md px-3 py-2 text-sm font-medium text-red-600 hover:bg-red-50 transition-colors min-h-[40px] disabled:opacity-50"
                >
                  {isPending && encerrandoId === v.id ? 'Encerrando...' : 'Encerrar'}
                </button>
              </div>
            )}
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
                Periodo
              </th>
              <th className="px-4 py-3.5 text-left text-sm font-medium uppercase tracking-wider text-primary-500">
                Situacao
              </th>
              <th className="px-4 py-3.5 text-right text-sm font-medium uppercase tracking-wider text-primary-500">
                Acoes
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-surface-border bg-surface-card">
            {vinculos.map((v) => (
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
                  {v.data_fim ? ` — ${formatDate(v.data_fim)}` : ' — atual'}
                </td>
                <td className="whitespace-nowrap px-4 py-3.5">
                  <span
                    className={cn(
                      'inline-flex items-center rounded-full px-3 py-1 text-sm font-semibold',
                      v.ativo
                        ? 'bg-green-100 text-green-800'
                        : 'bg-surface-muted text-gray-600',
                    )}
                  >
                    {v.ativo ? 'Ativo' : 'Encerrado'}
                  </span>
                </td>
                <td className="whitespace-nowrap px-4 py-3.5 text-right">
                  {v.ativo && (
                    <button
                      type="button"
                      onClick={() => handleEncerrar(v.id)}
                      disabled={isPending && encerrandoId === v.id}
                      className="inline-flex items-center gap-1.5 rounded-md px-3 py-2 text-sm font-medium text-red-600 hover:bg-red-50 transition-colors min-h-[40px] disabled:opacity-50"
                    >
                      <svg className="h-4 w-4" aria-hidden="true" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                      {isPending && encerrandoId === v.id ? 'Encerrando...' : 'Encerrar'}
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

