'use client';

import { useState, useTransition } from 'react';
import Link from 'next/link';
import { formatBRL } from '@/lib/utils/currency';
import { deleteGasto } from '@/app/(dashboard)/gastos/actions';
import type { GastoListItem } from '@/types/gasto';

interface GastoListProps {
  gastos: GastoListItem[];
  isMotorista?: boolean;
}

function formatDate(dateStr: string): string {
  const [year, month, day] = dateStr.split('-');
  return `${day}/${month}/${year}`;
}

export function GastoList({ gastos, isMotorista = false }: GastoListProps) {
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
        <p className="text-base text-primary-500">Nenhum gasto registrado.</p>
        <p className="mt-1 text-sm text-text-muted">Registre gastos de combustivel, manutencao e outros.</p>
        <Link
          href="/gastos/novo"
          className="mt-4 inline-block rounded-lg bg-btn-primary px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-btn-primary-hover"
        >
          Registrar Primeiro Gasto
        </Link>
      </div>
    );
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
          <div key={gasto.id} className="rounded-lg border border-surface-border bg-surface-card p-4">
            <div className="flex items-start justify-between mb-2">
              <div>
                <div className="text-base font-medium text-primary-900">{gasto.categoria_nome}</div>
                <div className="text-sm text-primary-500">{gasto.motorista_nome}</div>
              </div>
              <span className="text-base font-semibold tabular-nums text-primary-900">
                {formatBRL(gasto.valor)}
              </span>
            </div>
            <div className="text-sm text-primary-700 space-y-0.5">
              <p>{formatDate(gasto.data)} {gasto.caminhao_placa ? `- ${gasto.caminhao_placa}` : ''}</p>
            </div>
            <div className="mt-3 flex items-center gap-2 flex-wrap">
              <Link
                href={`/gastos/${gasto.id}/editar`}
                className="inline-flex items-center gap-1.5 rounded-md px-3 py-2 text-sm font-medium text-primary-700 hover:bg-surface-hover transition-colors min-h-[40px]"
              >
                Editar
              </Link>
              {!isMotorista && (
                confirmId === gasto.id ? (
                  <span className="flex items-center gap-1">
                    <button type="button" onClick={() => handleConfirmDelete(gasto.id)} disabled={isPending} className="rounded-md px-3 py-2 text-sm font-medium text-danger hover:bg-alert-danger-bg transition-colors min-h-[40px]">Confirmar</button>
                    <button type="button" onClick={handleCancelDelete} className="rounded-md px-3 py-2 text-sm font-medium text-primary-500 hover:bg-surface-hover transition-colors min-h-[40px]">Cancelar</button>
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
                )
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
              <th className="px-4 py-3.5 text-base font-medium text-primary-700">Categoria</th>
              <th className="px-4 py-3.5 text-base font-medium text-primary-700">Motorista</th>
              <th className="px-4 py-3.5 text-base font-medium text-primary-700">Caminhao</th>
              <th className="px-4 py-3.5 text-base text-right font-medium text-primary-700">Valor</th>
              <th className="px-4 py-3.5 text-base text-right font-medium text-primary-700">Acoes</th>
            </tr>
          </thead>
          <tbody>
            {gastos.map((gasto) => (
              <tr key={gasto.id} className="border-b border-surface-border last:border-0 hover:bg-surface-muted">
                <td className="whitespace-nowrap px-4 py-3.5 text-base tabular-nums text-primary-900">
                  {formatDate(gasto.data)}
                </td>
                <td className="px-4 py-3.5 text-base text-primary-900">{gasto.categoria_nome}</td>
                <td className="px-4 py-3.5 text-base text-primary-900">{gasto.motorista_nome}</td>
                <td className="px-4 py-3.5 text-base text-primary-500">
                  {gasto.caminhao_placa ?? '-'}
                </td>
                <td className="whitespace-nowrap px-4 py-3.5 text-base text-right tabular-nums font-medium text-primary-900">
                  {formatBRL(gasto.valor)}
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

                    {!isMotorista && (
                      confirmId === gasto.id ? (
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
                          {isPending && deletingId === gasto.id ? 'Excluindo...' : 'Excluir'}
                        </button>
                      )
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
