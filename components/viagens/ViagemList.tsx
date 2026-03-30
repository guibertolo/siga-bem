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
  isMotorista?: boolean;
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
  isMotorista = false,
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

  // Separate em_andamento trips from others
  const viagensAtivas = viagens.filter((v) => v.status === 'em_andamento');
  const viagensOutras = viagens.filter((v) => v.status !== 'em_andamento');

  return (
    <div className="space-y-4">
      <ViagemFilters
        motoristas={motoristas}
        initialFilters={filters}
        onFilter={handleFilter}
        isMotorista={isMotorista}
      />

      {error && (
        <div className="rounded-lg border border-danger/20 bg-alert-danger-bg p-4 text-sm text-danger">
          {error}
        </div>
      )}

      {/* Active trips section */}
      {viagensAtivas.length > 0 && (
        <div className="rounded-xl border border-warning/20 bg-alert-warning-bg p-4">
          <h3 className="text-sm font-bold uppercase tracking-wide text-warning mb-3">
            Em Andamento
          </h3>

          {/* Mobile active cards */}
          <div className="space-y-3 md:hidden">
            {viagensAtivas.map((v) => (
              <div
                key={v.id}
                className="rounded-lg border-l-4 border-amber-400 bg-surface-card p-4"
              >
                <div className="flex items-start justify-between mb-1">
                  <div>
                    <div className="text-base font-bold text-primary-900">{v.origem} &rarr; {v.destino}</div>
                  </div>
                  <span className={`inline-block rounded-full px-3 py-1 text-xs font-semibold ${VIAGEM_STATUS_COLORS[v.status]}`}>
                    {VIAGEM_STATUS_LABELS[v.status]}
                  </span>
                </div>
                <div className="mt-2 text-sm text-primary-700 space-y-0.5">
                  <p>{v.motorista_nome} - {v.caminhao_placa}</p>
                  <p>{formatDateTime(v.data_saida)}</p>
                </div>
                <div className="mt-2 flex items-center justify-between">
                  <span className="text-base font-semibold tabular-nums text-primary-900">
                    {formatBRL(v.valor_total)}
                  </span>
                </div>
                <div className="mt-3 flex items-center gap-2">
                  <Link
                    href={`/viagens/${v.id}`}
                    className="inline-flex items-center gap-1.5 rounded-md bg-primary-700 px-4 py-2.5 text-sm font-semibold text-white no-underline transition-colors hover:bg-primary-800 min-h-[40px]"
                  >
                    Ver Viagem
                  </Link>
                  <Link
                    href={`/viagens/${v.id}/editar`}
                    className="inline-flex items-center gap-1.5 rounded-md px-3 py-2 text-sm font-medium text-primary-700 hover:bg-surface-hover transition-colors min-h-[40px]"
                  >
                    Editar
                  </Link>
                </div>
              </div>
            ))}
          </div>

          {/* Desktop active table */}
          <div className="hidden md:block overflow-x-auto rounded-lg border border-warning/20 bg-surface-card border-amber-800">
            <table className="w-full">
              <thead>
                <tr className="border-b border-warning/20 bg-alert-warning-bg text-left">
                  <th className="px-4 py-3 text-base font-medium text-warning">Origem/Destino</th>
                  <th className="px-4 py-3 text-base font-medium text-warning">Motorista</th>
                  <th className="px-4 py-3 text-base font-medium text-warning">Caminhao</th>
                  <th className="px-4 py-3 text-base font-medium text-warning">Saida</th>
                  <th className="px-4 py-3 text-base text-right font-medium text-warning">Valor</th>
                  <th className="px-4 py-3 text-base text-right font-medium text-warning">Acoes</th>
                </tr>
              </thead>
              <tbody>
                {viagensAtivas.map((v) => (
                  <tr key={v.id} className="border-b border-warning/20 last:border-b-0">
                    <td className="px-4 py-3">
                      <div className="text-base font-bold text-primary-900">{v.origem} &rarr; {v.destino}</div>
                    </td>
                    <td className="px-4 py-3 text-base text-primary-700">{v.motorista_nome}</td>
                    <td className="px-4 py-3 text-base text-primary-700">{v.caminhao_placa}</td>
                    <td className="px-4 py-3 text-base text-primary-700">{formatDateTime(v.data_saida)}</td>
                    <td className="px-4 py-3 text-base text-right tabular-nums text-primary-700">{formatBRL(v.valor_total)}</td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Link
                          href={`/viagens/${v.id}`}
                          className="inline-flex items-center gap-1.5 rounded-md bg-primary-700 px-3 py-2 text-sm font-semibold text-white no-underline transition-colors hover:bg-primary-800 min-h-[40px]"
                        >
                          Ver
                        </Link>
                        <Link
                          href={`/viagens/${v.id}/editar`}
                          className="inline-flex items-center gap-1.5 rounded-md px-3 py-2 text-sm font-medium text-primary-700 hover:bg-surface-hover transition-colors min-h-[40px]"
                        >
                          Editar
                        </Link>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Divider label when both sections exist */}
      {viagensAtivas.length > 0 && viagensOutras.length > 0 && (
        <h3 className="text-sm font-bold uppercase tracking-wide text-primary-500 pt-2">
          Outras Viagens
        </h3>
      )}

      {viagens.length === 0 ? (
        <div className="rounded-lg border border-surface-border bg-surface-card p-8 text-center">
          <p className="text-base text-primary-500">Nenhuma viagem por aqui.</p>
          <p className="mt-1 text-sm text-primary-400">Crie uma nova viagem para comecar.</p>
          <Link
            href="/viagens/nova"
            className="mt-4 inline-block rounded-lg bg-primary-700 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-primary-800"
          >
            Registrar Primeira Viagem
          </Link>
        </div>
      ) : viagensOutras.length === 0 && viagensAtivas.length > 0 ? (
        // All trips are active - already shown above, nothing else to render
        null
      ) : (
        <>
          {/* Mobile card view */}
          <div className="space-y-3 md:hidden">
            {(viagensAtivas.length > 0 ? viagensOutras : viagens).map((v) => (
              <div
                key={v.id}
                className="rounded-lg border border-surface-border bg-surface-card p-4"
              >
                <div className="flex items-start justify-between mb-1">
                  <div>
                    <div className="text-base font-medium text-primary-900">{v.origem}</div>
                    <div className="text-sm text-primary-500">{v.destino}</div>
                  </div>
                  <span className={`inline-block rounded-full px-3 py-1 text-xs font-semibold ${VIAGEM_STATUS_COLORS[v.status]}`}>
                    {VIAGEM_STATUS_LABELS[v.status]}
                  </span>
                </div>
                <div className="mt-2 text-sm text-primary-700 space-y-0.5">
                  <p>{v.motorista_nome} - {v.caminhao_placa}</p>
                  <p>{formatDateTime(v.data_saida)}</p>
                </div>
                <div className="mt-2 flex items-center justify-between">
                  <span className="text-base font-semibold tabular-nums text-primary-900">
                    {formatBRL(v.valor_total)}
                  </span>
                  <span className="text-sm tabular-nums text-primary-500">{v.percentual_pagamento}%</span>
                </div>
                <div className="mt-3 flex items-center gap-2 flex-wrap">
                  <Link
                    href={`/viagens/${v.id}`}
                    className="inline-flex items-center gap-1.5 rounded-md px-3 py-2 text-sm font-medium text-primary-700 hover:bg-surface-hover transition-colors min-h-[40px]"
                  >
                    Ver
                  </Link>
                  {(v.status === 'planejada' || v.status === 'em_andamento') && (
                    <Link
                      href={`/viagens/${v.id}/editar`}
                      className="inline-flex items-center gap-1.5 rounded-md px-3 py-2 text-sm font-medium text-primary-700 hover:bg-surface-hover transition-colors min-h-[40px]"
                    >
                      Editar
                    </Link>
                  )}
                  {!isMotorista && v.status === 'concluida' && (
                    <Link
                      href={`/fechamentos/novo?motorista_id=${v.motorista_id}`}
                      className="inline-flex items-center gap-1.5 rounded-md bg-success px-3 py-2 text-sm font-semibold text-white no-underline transition-colors hover:bg-success/90 min-h-[40px]"
                    >
                      Acertar
                    </Link>
                  )}
                  {!isMotorista && v.status === 'planejada' && (
                    confirmId === v.id ? (
                      <span className="flex flex-col gap-1">
                        <span className="text-xs text-danger">Tem certeza que deseja excluir esta viagem? Esta acao nao pode ser desfeita.</span>
                        <span className="flex items-center gap-1">
                          <button type="button" onClick={() => handleConfirmDelete(v.id)} disabled={deletingId === v.id} className="rounded-md px-3 py-2 text-sm font-medium text-danger hover:bg-alert-danger-bg transition-colors min-h-[40px]">Confirmar</button>
                          <button type="button" onClick={handleCancelDelete} className="rounded-md px-3 py-2 text-sm font-medium text-primary-500 hover:bg-surface-hover transition-colors min-h-[40px]">Cancelar</button>
                        </span>
                      </span>
                    ) : (
                      <button type="button" onClick={() => handleDeleteClick(v.id)} className="inline-flex items-center gap-1.5 rounded-md px-3 py-2 text-sm font-medium text-danger hover:bg-alert-danger-bg transition-colors min-h-[40px]">Excluir</button>
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
                  <th className="px-4 py-3.5 text-base font-medium text-primary-700">Origem/Destino</th>
                  <th className="px-4 py-3.5 text-base font-medium text-primary-700">Motorista</th>
                  <th className="px-4 py-3.5 text-base font-medium text-primary-700">Caminhao</th>
                  <th className="px-4 py-3.5 text-base font-medium text-primary-700">Saida</th>
                  <th className="px-4 py-3.5 text-base text-right font-medium text-primary-700">Valor</th>
                  <th className="px-4 py-3.5 text-base text-right font-medium text-primary-700">%</th>
                  <th className="px-4 py-3.5 text-base font-medium text-primary-700">Situacao</th>
                  <th className="px-4 py-3.5 text-base text-right font-medium text-primary-700">Acoes</th>
                </tr>
              </thead>
              <tbody>
                {(viagensAtivas.length > 0 ? viagensOutras : viagens).map((v) => (
                  <tr
                    key={v.id}
                    className="border-b border-surface-border last:border-b-0 hover:bg-surface-muted"
                  >
                    <td className="px-4 py-3.5">
                      <div className="text-base font-medium text-primary-900">{v.origem}</div>
                      <div className="text-sm text-primary-500">{v.destino}</div>
                    </td>
                    <td className="px-4 py-3.5 text-base text-primary-700">{v.motorista_nome}</td>
                    <td className="px-4 py-3.5 text-base text-primary-700">{v.caminhao_placa}</td>
                    <td className="px-4 py-3.5 text-base text-primary-700">{formatDateTime(v.data_saida)}</td>
                    <td className="px-4 py-3.5 text-base text-right tabular-nums text-primary-700">
                      {formatBRL(v.valor_total)}
                    </td>
                    <td className="px-4 py-3.5 text-base text-right tabular-nums text-primary-700">
                      {v.percentual_pagamento}%
                    </td>
                    <td className="px-4 py-3.5">
                      <span className={`inline-block rounded-full px-3 py-1 text-sm font-semibold ${VIAGEM_STATUS_COLORS[v.status]}`}>
                        {VIAGEM_STATUS_LABELS[v.status]}
                      </span>
                    </td>
                    <td className="px-4 py-3.5 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Link
                          href={`/viagens/${v.id}`}
                          className="inline-flex items-center gap-1.5 rounded-md px-3 py-2 text-sm font-medium text-primary-700 hover:bg-surface-hover transition-colors min-h-[40px]"
                        >
                          <svg className="h-4 w-4" aria-hidden="true" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                          </svg>
                          Ver
                        </Link>
                        {(v.status === 'planejada' || v.status === 'em_andamento') && (
                          <Link
                            href={`/viagens/${v.id}/editar`}
                            className="inline-flex items-center gap-1.5 rounded-md px-3 py-2 text-sm font-medium text-primary-700 hover:bg-surface-hover transition-colors min-h-[40px]"
                          >
                            <svg className="h-4 w-4" aria-hidden="true" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                            </svg>
                            Editar
                          </Link>
                        )}
                        {!isMotorista && v.status === 'concluida' && (
                          <Link
                            href={`/fechamentos/novo?motorista_id=${v.motorista_id}`}
                            className="inline-flex items-center gap-1.5 rounded-md bg-success px-3 py-2 text-sm font-semibold text-white no-underline transition-colors hover:bg-success/90 min-h-[40px]"
                          >
                            <svg className="h-4 w-4" aria-hidden="true" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                            Acertar
                          </Link>
                        )}
                        {!isMotorista && v.status === 'planejada' && (
                          <>
                            {confirmId === v.id ? (
                              <span className="flex flex-col items-end gap-1">
                                <span className="text-xs text-danger max-w-[240px] text-right">Tem certeza que deseja excluir esta viagem? Esta acao nao pode ser desfeita.</span>
                                <span className="flex items-center gap-1">
                                  <button
                                    type="button"
                                    onClick={() => handleConfirmDelete(v.id)}
                                    disabled={deletingId === v.id}
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
                              </span>
                            ) : (
                              <button
                                type="button"
                                onClick={() => handleDeleteClick(v.id)}
                                className="inline-flex items-center gap-1.5 rounded-md px-3 py-2 text-sm font-medium text-danger hover:bg-alert-danger-bg transition-colors min-h-[40px]"
                              >
                                <svg className="h-4 w-4" aria-hidden="true" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                </svg>
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
                  className="rounded-lg border border-surface-border px-3 py-1 text-sm text-primary-700 transition-colors hover:bg-surface-muted disabled:cursor-not-allowed disabled:opacity-50"
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
                  className="rounded-lg border border-surface-border px-3 py-1 text-sm text-primary-700 transition-colors hover:bg-surface-muted disabled:cursor-not-allowed disabled:opacity-50"
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
