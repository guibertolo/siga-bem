'use client';

import { useState, useTransition } from 'react';
import Link from 'next/link';
import { formatBRL } from '@/lib/utils/currency';
import { deleteGasto } from '@/app/(dashboard)/gastos/actions';
import { ReceiptModal } from '@/components/gastos/ReceiptModal';
import type { GastoListItemWithFoto } from '@/types/gasto';

interface GastoTableProps {
  gastos: GastoListItemWithFoto[];
}

function formatDate(dateStr: string): string {
  const [year, month, day] = dateStr.split('-');
  return `${day}/${month}/${year}`;
}

export function GastoTable({ gastos }: GastoTableProps) {
  const [isPending, startTransition] = useTransition();
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [confirmId, setConfirmId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [receiptGastoId, setReceiptGastoId] = useState<string | null>(null);

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
              <th className="px-4 py-3 font-medium text-primary-700">
                Categoria
              </th>
              <th className="px-4 py-3 font-medium text-primary-700">
                Motorista
              </th>
              <th className="px-4 py-3 font-medium text-primary-700">
                Caminhao
              </th>
              <th className="px-4 py-3 text-right font-medium text-primary-700">
                Valor
              </th>
              <th className="w-10 px-4 py-3 text-center font-medium text-primary-700">
                Comp.
              </th>
              <th className="px-4 py-3 text-right font-medium text-primary-700">
                Acoes
              </th>
            </tr>
          </thead>
          <tbody>
            {gastos.map((gasto) => (
              <tr
                key={gasto.id}
                className="border-b border-surface-border last:border-0 hover:bg-gray-50"
              >
                <td className="whitespace-nowrap px-4 py-3 tabular-nums text-primary-900">
                  {formatDate(gasto.data)}
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    {gasto.categoria_cor && (
                      <span
                        className="inline-block h-2.5 w-2.5 rounded-full"
                        style={{ backgroundColor: gasto.categoria_cor }}
                      />
                    )}
                    <span className="text-primary-900">
                      {gasto.categoria_nome}
                    </span>
                  </div>
                </td>
                <td className="px-4 py-3 text-primary-900">
                  {gasto.motorista_nome}
                </td>
                <td className="px-4 py-3 text-primary-500">
                  {gasto.caminhao_placa ?? '-'}
                </td>
                <td className="whitespace-nowrap px-4 py-3 text-right tabular-nums font-medium text-primary-900">
                  {formatBRL(gasto.valor)}
                </td>
                <td className="px-4 py-3 text-center">
                  {gasto.foto_url ? (
                    <button
                      type="button"
                      onClick={() => setReceiptGastoId(gasto.id)}
                      className="inline-block cursor-pointer text-primary-600 transition-colors hover:text-primary-800"
                      title="Ver comprovante"
                    >
                      <svg
                        className="h-4 w-4"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13"
                        />
                      </svg>
                    </button>
                  ) : (
                    <span className="text-primary-300">-</span>
                  )}
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
                        {isPending && deletingId === gasto.id
                          ? 'Excluindo...'
                          : 'Excluir'}
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {receiptGastoId && (
        <ReceiptModal
          gastoId={receiptGastoId}
          onClose={() => setReceiptGastoId(null)}
        />
      )}
    </>
  );
}
