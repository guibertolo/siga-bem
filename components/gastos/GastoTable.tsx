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
        <div className="mb-4 rounded-lg border border-danger/20 bg-alert-danger-bg p-4 text-sm text-danger">
          {error}
        </div>
      )}

      {/* Mobile card view */}
      <div className="space-y-3 md:hidden">
        {gastos.map((gasto) => (
          <div
            key={gasto.id}
            className="rounded-lg border border-surface-border bg-surface-card p-4"
          >
            <div className="flex items-start justify-between mb-2">
              <div className="flex items-center gap-2">
                {gasto.categoria_cor && (
                  <span
                    className="inline-block h-2.5 w-2.5 rounded-full shrink-0"
                    style={{ backgroundColor: gasto.categoria_cor }}
                  />
                )}
                <span className="text-base font-medium text-primary-900">
                  {gasto.categoria_nome}
                </span>
              </div>
              <span className="text-base font-semibold tabular-nums text-primary-900">
                {formatBRL(gasto.valor)}
              </span>
            </div>
            <div className="text-sm text-primary-500 space-y-0.5">
              <p>{formatDate(gasto.data)} - {gasto.motorista_nome}</p>
              <p>{gasto.caminhao_placa ?? '-'}</p>
            </div>
            <div className="mt-3 flex items-center gap-2 flex-wrap">
              <Link
                href={`/gastos/${gasto.id}/editar`}
                className="inline-flex items-center gap-1.5 rounded-md px-3 py-2 text-sm font-medium text-primary-700 hover:bg-surface-hover transition-colors min-h-[40px]"
              >
                Editar
              </Link>
              {gasto.foto_url && (
                <button
                  type="button"
                  onClick={() => setReceiptGastoId(gasto.id)}
                  className="inline-flex items-center gap-1.5 rounded-md px-3 py-2 text-sm font-medium text-primary-500 hover:bg-surface-hover transition-colors min-h-[40px]"
                >
                  Comprovante
                </button>
              )}
              {confirmId === gasto.id ? (
                <span className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => handleConfirmDelete(gasto.id)}
                    disabled={isPending}
                    className="rounded-md px-3 py-2 text-sm font-medium text-danger hover:bg-alert-danger-bg transition-colors min-h-[40px]"
                  >
                    Confirmar
                  </button>
                  <button
                    type="button"
                    onClick={handleCancelDelete}
                    className="rounded-md px-3 py-2 text-sm font-medium text-primary-500 hover:bg-surface-hover transition-colors min-h-[40px]"
                  >
                    Cancelar
                  </button>
                </span>
              ) : (
                <button
                  type="button"
                  onClick={() => handleDeleteClick(gasto.id)}
                  disabled={isPending && deletingId === gasto.id}
                  className="inline-flex items-center gap-1.5 rounded-md px-3 py-2 text-sm font-medium text-danger hover:bg-alert-danger-bg transition-colors min-h-[40px]"
                >
                  {isPending && deletingId === gasto.id ? 'Excluindo...' : 'Excluir'}
                </button>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Desktop table view */}
      <div className="hidden md:block overflow-x-auto rounded-lg border border-surface-border bg-surface-card">
        <table className="w-full">
          <thead>
            <tr className="border-b border-surface-border bg-surface-muted text-left">
              <th className="px-4 py-3.5 text-base font-medium text-primary-700">Data</th>
              <th className="px-4 py-3.5 text-base font-medium text-primary-700">
                Categoria
              </th>
              <th className="px-4 py-3.5 text-base font-medium text-primary-700">
                Motorista
              </th>
              <th className="px-4 py-3.5 text-base font-medium text-primary-700">
                Caminhao
              </th>
              <th className="px-4 py-3.5 text-base text-right font-medium text-primary-700">
                Valor
              </th>
              <th className="w-10 px-4 py-3.5 text-base text-center font-medium text-primary-700">
                Comp.
              </th>
              <th className="px-4 py-3.5 text-base text-right font-medium text-primary-700">
                Acoes
              </th>
            </tr>
          </thead>
          <tbody>
            {gastos.map((gasto) => (
              <tr
                key={gasto.id}
                className="border-b border-surface-border last:border-0 hover:bg-surface-muted"
              >
                <td className="whitespace-nowrap px-4 py-3.5 text-base tabular-nums text-primary-900">
                  {formatDate(gasto.data)}
                </td>
                <td className="px-4 py-3.5">
                  <div className="flex items-center gap-2">
                    {gasto.categoria_cor && (
                      <span
                        className="inline-block h-2.5 w-2.5 rounded-full"
                        style={{ backgroundColor: gasto.categoria_cor }}
                      />
                    )}
                    <span className="text-base text-primary-900">
                      {gasto.categoria_nome}
                    </span>
                  </div>
                </td>
                <td className="px-4 py-3.5 text-base text-primary-900">
                  {gasto.motorista_nome}
                </td>
                <td className="px-4 py-3.5 text-base text-primary-500">
                  {gasto.caminhao_placa ?? '-'}
                </td>
                <td className="whitespace-nowrap px-4 py-3.5 text-base text-right tabular-nums font-medium text-primary-900">
                  {formatBRL(gasto.valor)}
                </td>
                <td className="px-4 py-3.5 text-center">
                  {gasto.foto_url ? (
                    <button
                      type="button"
                      onClick={() => setReceiptGastoId(gasto.id)}
                      className="inline-block cursor-pointer text-primary-500 transition-colors hover:text-primary-800"
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
                <td className="px-4 py-3.5 text-right">
                  <div className="flex items-center justify-end gap-2">
                    <Link
                      href={`/gastos/${gasto.id}/editar`}
                      className="inline-flex items-center gap-1.5 rounded-md px-3 py-2 text-sm font-medium text-primary-700 hover:bg-surface-hover transition-colors min-h-[40px]"
                    >
                      <svg className="h-4 w-4" aria-hidden="true" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                      </svg>
                      Editar
                    </Link>

                    {confirmId === gasto.id ? (
                      <span className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => handleConfirmDelete(gasto.id)}
                          disabled={isPending}
                          className="rounded-md px-3 py-2 text-sm font-medium text-danger hover:bg-alert-danger-bg transition-colors min-h-[40px]"
                        >
                          Confirmar
                        </button>
                        <button
                          type="button"
                          onClick={handleCancelDelete}
                          className="rounded-md px-3 py-2 text-sm font-medium text-primary-500 hover:bg-surface-hover transition-colors min-h-[40px]"
                        >
                          Cancelar
                        </button>
                      </span>
                    ) : (
                      <button
                        type="button"
                        onClick={() => handleDeleteClick(gasto.id)}
                        disabled={isPending && deletingId === gasto.id}
                        className="inline-flex items-center gap-1.5 rounded-md px-3 py-2 text-sm font-medium text-danger hover:bg-alert-danger-bg transition-colors min-h-[40px]"
                      >
                        <svg className="h-4 w-4" aria-hidden="true" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
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
