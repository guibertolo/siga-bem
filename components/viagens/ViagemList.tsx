'use client';

import { useState, useTransition, useCallback } from 'react';
import Link from 'next/link';
import { formatBRL } from '@/lib/utils/currency';
import { deleteViagem, listViagens } from '@/app/(dashboard)/viagens/actions';
import { VIAGEM_STATUS_LABELS, VIAGEM_STATUS_COLORS } from '@/types/viagem';
import { ViagemFilters } from '@/components/viagens/ViagemFilters';
import type { ViagemFilterValues } from '@/components/viagens/ViagemFilters';
import type { ViagemListItem } from '@/types/viagem';

interface ViagemListProps {
  viagens: ViagemListItem[];
  total: number;
  motoristas: Array<{ id: string; nome: string }>;
  initialPage: number;
}

function formatDateTime(isoString: string): string {
  const date = new Date(isoString);
  const pad = (n: number) => n.toString().padStart(2, '0');
  return `${pad(date.getDate())}/${pad(date.getMonth() + 1)}/${date.getFullYear()} ${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

export function ViagemList({
  viagens: initialViagens,
  total: initialTotal,
  motoristas,
  initialPage,
}: ViagemListProps) {
  const [isPending, startTransition] = useTransition();
  const [viagens, setViagens] = useState(initialViagens);
  const [total, setTotal] = useState(initialTotal);
  const [page, setPage] = useState(initialPage);
  const [confirmId, setConfirmId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [filters, setFilters] = useState<ViagemFilterValues>({
    status: [],
    motorista_id: '',
    data_inicio: '',
    data_fim: '',
    texto: '',
  });

  const pageSize = 20;
  const totalPages = Math.ceil(total / pageSize);

  const fetchViagens = useCallback((filterValues: ViagemFilterValues, pageNum: number) => {
    startTransition(async () => {
      const result = await listViagens({
        status: filterValues.status.length > 0 ? filterValues.status : undefined,
        motorista_id: filterValues.motorista_id || undefined,
        data_inicio: filterValues.data_inicio || undefined,
        data_fim: filterValues.data_fim || undefined,
        texto: filterValues.texto || undefined,
        page: pageNum,
        pageSize,
      });

      if (result.data) {
        setViagens(result.data);
        setTotal(result.total);
      }
    });
  }, []);

  function handleFilter(newFilters: ViagemFilterValues) {
    setFilters(newFilters);
    setPage(1);
    fetchViagens(newFilters, 1);
  }

  function handlePageChange(newPage: number) {
    setPage(newPage);
    fetchViagens(filters, newPage);
  }

  function handleDeleteClick(viagemId: string) {
    setConfirmId(viagemId);
  }

  function handleCancelDelete() {
    setConfirmId(null);
  }

  function handleConfirmDelete(viagemId: string) {
    setError(null);
    setDeletingId(viagemId);
    setConfirmId(null);

    startTransition(async () => {
      const result = await deleteViagem(viagemId);
      setDeletingId(null);
      if (!result.success) {
        setError(result.error ?? 'Erro ao excluir viagem');
      } else {
        // Refresh list
        fetchViagens(filters, page);
      }
    });
  }

  return (
    <div className="space-y-4">
      <ViagemFilters
        motoristas={motoristas}
        initialFilters={filters}
        onFilter={handleFilter}
      />

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          {error}
        </div>
      )}

      {viagens.length === 0 ? (
        <div className="rounded-lg border border-surface-border bg-surface-card p-8 text-center">
          <p className="text-primary-500">Nenhuma viagem encontrada.</p>
          <Link
            href="/viagens/nova"
            className="mt-4 inline-block rounded-lg bg-primary-700 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-primary-800"
          >
            Cadastrar Primeira Viagem
          </Link>
        </div>
      ) : (
        <>
          <div className="overflow-x-auto rounded-lg border border-surface-border bg-surface-card">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-surface-border bg-gray-50 text-left">
                  <th className="px-4 py-3 font-medium text-primary-700">Origem/Destino</th>
                  <th className="px-4 py-3 font-medium text-primary-700">Motorista</th>
                  <th className="px-4 py-3 font-medium text-primary-700">Caminhao</th>
                  <th className="px-4 py-3 font-medium text-primary-700">Saida</th>
                  <th className="px-4 py-3 text-right font-medium text-primary-700">Valor</th>
                  <th className="px-4 py-3 text-right font-medium text-primary-700">%</th>
                  <th className="px-4 py-3 font-medium text-primary-700">Status</th>
                  <th className="px-4 py-3 text-right font-medium text-primary-700">Acoes</th>
                </tr>
              </thead>
              <tbody>
                {viagens.map((v) => (
                  <tr
                    key={v.id}
                    className="border-b border-surface-border last:border-b-0 hover:bg-gray-50"
                  >
                    <td className="px-4 py-3">
                      <div className="font-medium text-primary-900">{v.origem}</div>
                      <div className="text-xs text-primary-500">{v.destino}</div>
                    </td>
                    <td className="px-4 py-3 text-primary-700">{v.motorista_nome}</td>
                    <td className="px-4 py-3 text-primary-700">{v.caminhao_placa}</td>
                    <td className="px-4 py-3 text-primary-700">{formatDateTime(v.data_saida)}</td>
                    <td className="px-4 py-3 text-right tabular-nums text-primary-700">
                      {formatBRL(v.valor_total)}
                    </td>
                    <td className="px-4 py-3 text-right tabular-nums text-primary-700">
                      {v.percentual_pagamento}%
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${VIAGEM_STATUS_COLORS[v.status]}`}>
                        {VIAGEM_STATUS_LABELS[v.status]}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Link
                          href={`/viagens/${v.id}`}
                          className="text-xs text-primary-500 transition-colors hover:text-primary-700"
                        >
                          Ver
                        </Link>
                        {(v.status === 'planejada' || v.status === 'em_andamento') && (
                          <Link
                            href={`/viagens/${v.id}/editar`}
                            className="text-xs text-primary-500 transition-colors hover:text-primary-700"
                          >
                            Editar
                          </Link>
                        )}
                        {v.status === 'planejada' && (
                          <>
                            {confirmId === v.id ? (
                              <span className="flex items-center gap-1">
                                <button
                                  type="button"
                                  onClick={() => handleConfirmDelete(v.id)}
                                  disabled={deletingId === v.id}
                                  className="text-xs font-medium text-red-600 hover:text-red-800"
                                >
                                  Confirmar
                                </button>
                                <button
                                  type="button"
                                  onClick={handleCancelDelete}
                                  className="text-xs text-primary-500 hover:text-primary-700"
                                >
                                  Nao
                                </button>
                              </span>
                            ) : (
                              <button
                                type="button"
                                onClick={() => handleDeleteClick(v.id)}
                                className="text-xs text-red-500 transition-colors hover:text-red-700"
                              >
                                Excluir
                              </button>
                            )}
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between">
              <p className="text-sm text-primary-500">
                {total} viagen{total !== 1 ? 's' : ''} encontrada{total !== 1 ? 's' : ''}
              </p>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => handlePageChange(page - 1)}
                  disabled={page <= 1 || isPending}
                  className="rounded-lg border border-surface-border px-3 py-1 text-sm text-primary-700 transition-colors hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Anterior
                </button>
                <span className="text-sm text-primary-500">
                  Pagina {page} de {totalPages}
                </span>
                <button
                  type="button"
                  onClick={() => handlePageChange(page + 1)}
                  disabled={page >= totalPages || isPending}
                  className="rounded-lg border border-surface-border px-3 py-1 text-sm text-primary-700 transition-colors hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Proxima
                </button>
              </div>
            </div>
          )}
        </>
      )}

      {isPending && (
        <div className="text-center text-sm text-primary-500">Carregando...</div>
      )}
    </div>
  );
}
