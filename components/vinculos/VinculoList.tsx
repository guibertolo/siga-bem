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
        <p className="text-sm text-primary-500">Nenhum vinculo encontrado.</p>
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

      <div className="overflow-hidden rounded-lg border border-surface-border">
        <table className="min-w-full divide-y divide-surface-border">
          <thead className="bg-surface-card">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-primary-500">
                Motorista
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-primary-500">
                Caminhao
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-primary-500">
                Periodo
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-primary-500">
                Status
              </th>
              <th className="px-4 py-3 text-right text-xs font-medium uppercase tracking-wider text-primary-500">
                Acoes
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-surface-border bg-white">
            {vinculos.map((v) => (
              <tr key={v.id} className="transition-colors hover:bg-surface-hover">
                <td className="whitespace-nowrap px-4 py-3">
                  <div className="text-sm font-medium text-primary-900">{v.motorista_nome}</div>
                  <div className="text-xs text-primary-500">{v.motorista_cpf}</div>
                </td>
                <td className="whitespace-nowrap px-4 py-3">
                  <div className="text-sm font-medium text-primary-900">{v.caminhao_placa}</div>
                  <div className="text-xs text-primary-500">{v.caminhao_modelo}</div>
                </td>
                <td className="whitespace-nowrap px-4 py-3 text-sm text-primary-700">
                  {formatDate(v.data_inicio)}
                  {v.data_fim ? ` — ${formatDate(v.data_fim)}` : ' — atual'}
                </td>
                <td className="whitespace-nowrap px-4 py-3">
                  <span
                    className={cn(
                      'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium',
                      v.ativo
                        ? 'bg-green-100 text-green-800'
                        : 'bg-gray-100 text-gray-600',
                    )}
                  >
                    {v.ativo ? 'Ativo' : 'Encerrado'}
                  </span>
                </td>
                <td className="whitespace-nowrap px-4 py-3 text-right text-sm">
                  {v.ativo && (
                    <button
                      type="button"
                      onClick={() => handleEncerrar(v.id)}
                      disabled={isPending && encerrandoId === v.id}
                      className="text-red-600 transition-colors hover:text-red-800 disabled:opacity-50"
                    >
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
