'use client';

import { useState, useTransition } from 'react';
import Link from 'next/link';
import { formatBRL } from '@/lib/utils/currency';
import { deleteGasto } from '@/app/(dashboard)/gastos/actions';
import type { GastoListItem } from '@/types/gasto';

interface GastoListProps {
  gastos: GastoListItem[];
}

function formatDate(dateStr: string): string {
  const [year, month, day] = dateStr.split('-');
  return `${day}/${month}/${year}`;
}

export function GastoList({ gastos }: GastoListProps) {
  const [isPending, startTransition] = useTransition();
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [confirmId, setConfirmId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  function handleDeleteClick(gastoId: string) {
    setConfirmId(gastoId);
  }

  function handleCancelDelete() {
    setConfirmId(null);
  }

  function handleConfirmDelete(gastoId: string) {
    setError(null);
    setDeletingId(gastoId);
    setConfirmId(null);

    startTransition(async () => {
      const result = await deleteGasto(gastoId);
      setDeletingId(null);
      if (!result.success) {
        setError(result.error ?? 'Erro ao excluir gasto');
      }
    });
  }

  if (gastos.length === 0) {
    return (
      <div className="rounded-lg border border-surface-border bg-surface-card p-8 text-center">
        <p className="text-primary-500">Nenhum gasto registrado.</p>
        <Link
          href="/gastos/novo"
          className="mt-4 inline-block rounded-lg bg-primary-700 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-primary-800"
        >
          Registrar Primeiro Gasto
        </Link>
      </div>
    );
  }

  return (
    <>
      {error && (
        <div className="mb-4 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          {error}
        </div>
      )}

      <div className="overflow-x-auto rounded-lg border border-surface-border bg-surface-card">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-surface-border bg-gray-50 text-left">
              <th className="px-4 py-3 font-medium text-primary-700">Data</th>
              <th className="px-4 py-3 font-medium text-primary-700">Categoria</th>
              <th className="px-4 py-3 font-medium text-primary-700">Motorista</th>
              <th className="px-4 py-3 font-medium text-primary-700">Caminhao</th>
              <th className="px-4 py-3 text-right font-medium text-primary-700">Valor</th>
              <th className="px-4 py-3 text-right font-medium text-primary-700">Acoes</th>
            </tr>
          </thead>
          <tbody>
            {gastos.map((gasto) => (
              <tr key={gasto.id} className="border-b border-surface-border last:border-0 hover:bg-gray-50">
                <td className="whitespace-nowrap px-4 py-3 tabular-nums text-primary-900">
                  {formatDate(gasto.data)}
                </td>
                <td className="px-4 py-3 text-primary-900">{gasto.categoria_nome}</td>
                <td className="px-4 py-3 text-primary-900">{gasto.motorista_nome}</td>
                <td className="px-4 py-3 text-primary-500">
                  {gasto.caminhao_placa ?? '-'}
                </td>
                <td className="whitespace-nowrap px-4 py-3 text-right tabular-nums font-medium text-primary-900">
                  {formatBRL(gasto.valor)}
                </td>
                <td className="px-4 py-3 text-right">
                  <div className="flex items-center justify-end gap-2">
                    <Link
                      href={`/gastos/${gasto.id}/editar`}
                      className="text-primary-600 transition-colors hover:text-primary-800"
                    >
                      Editar
                    </Link>

                    {confirmId === gasto.id ? (
                      <span className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => handleConfirmDelete(gasto.id)}
                          disabled={isPending}
                          className="text-red-600 transition-colors hover:text-red-800"
                        >
                          Confirmar
                        </button>
                        <button
                          type="button"
                          onClick={handleCancelDelete}
                          className="text-primary-500 transition-colors hover:text-primary-700"
                        >
                          Cancelar
                        </button>
                      </span>
                    ) : (
                      <button
                        type="button"
                        onClick={() => handleDeleteClick(gasto.id)}
                        disabled={isPending && deletingId === gasto.id}
                        className="text-red-500 transition-colors hover:text-red-700"
                      >
                        {isPending && deletingId === gasto.id ? 'Excluindo...' : 'Excluir'}
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
