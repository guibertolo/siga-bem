'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { useState, useTransition } from 'react';
import Link from 'next/link';
import { formatBRL } from '@/lib/utils/currency';
import { formatarPeriodoFechamento } from '@/lib/utils/formato-periodo';
import { reabrirFechamento } from '@/app/(dashboard)/financeiro/historico/actions';
import {
  FECHAMENTO_STATUS_LABELS,
  FECHAMENTO_STATUS_COLORS,
  FECHAMENTO_TIPO_LABELS,
} from '@/types/fechamento';
import type { FechamentoListItem, FechamentoHistoricoFiltros } from '@/types/fechamento';

interface HistoricoFechamentosProps {
  fechamentos: FechamentoListItem[];
  totalCount: number;
  currentPage: number;
  pageSize: number;
  isAdmin: boolean;
  filtros: FechamentoHistoricoFiltros;
}

export function HistoricoFechamentos({
  fechamentos,
  totalCount,
  currentPage,
  pageSize,
  isAdmin,
  filtros,
}: HistoricoFechamentosProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();
  const [reabrirId, setReabrirId] = useState<string | null>(null);
  const [reabrirError, setReabrirError] = useState<string | null>(null);

  const totalPages = Math.ceil(totalCount / pageSize);
  const from = totalCount === 0 ? 0 : (currentPage - 1) * pageSize + 1;
  const to = Math.min(currentPage * pageSize, totalCount);

  function goToPage(page: number) {
    const params = new URLSearchParams(searchParams.toString());
    if (page === 1) {
      params.delete('page');
    } else {
      params.set('page', String(page));
    }
    startTransition(() => {
      router.push(`/financeiro/historico?${params.toString()}`);
    });
  }

  async function handleReabrir(id: string) {
    setReabrirId(id);
    setReabrirError(null);

    const result = await reabrirFechamento(id);

    if (!result.success) {
      setReabrirError(result.error ?? 'Erro ao reabrir fechamento');
    }

    setReabrirId(null);
    router.refresh();
  }

  // Build CSV export URL with current filters
  function buildExportUrl(): string {
    const params = new URLSearchParams();
    if (filtros.motorista_ids && filtros.motorista_ids.length > 0) {
      params.set('motoristaIds', filtros.motorista_ids.join(','));
    }
    if (filtros.tipo && filtros.tipo !== 'todos') {
      params.set('tipo', filtros.tipo);
    }
    if (filtros.status && filtros.status !== 'todos') {
      params.set('status', filtros.status);
    }
    if (filtros.periodo_inicio) {
      params.set('periodoInicio', filtros.periodo_inicio);
    }
    if (filtros.periodo_fim) {
      params.set('periodoFim', filtros.periodo_fim);
    }
    if (filtros.busca) {
      params.set('busca', filtros.busca);
    }
    const qs = params.toString();
    return `/financeiro/historico/export${qs ? `?${qs}` : ''}`;
  }

  if (fechamentos.length === 0 && totalCount === 0) {
    return (
      <div className="rounded-lg border border-surface-border bg-surface-card p-8 text-center">
        <p className="text-base text-primary-500">
          Nenhum acerto encontrado com os filtros selecionados.
        </p>
        <p className="mt-1 text-sm text-text-muted">
          Tente ajustar os filtros ou o periodo de busca.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Error banner */}
      {reabrirError && (
        <div className="rounded-md border border-danger/20 bg-alert-danger-bg p-3 text-sm text-danger">
          {reabrirError}
        </div>
      )}

      {/* Actions bar */}
      <div className="flex items-center justify-between">
        <p className="text-sm text-primary-500">
          {totalCount} acerto{totalCount !== 1 ? 's' : ''} encontrado{totalCount !== 1 ? 's' : ''}
        </p>
        {isAdmin && (
          <a
            href={buildExportUrl()}
            className="inline-flex items-center gap-2 rounded-md border border-surface-border bg-surface-card px-3 py-2 text-sm font-medium text-primary-700 transition-colors hover:bg-surface-muted"
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
                d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"
              />
            </svg>
            Baixar Planilha
          </a>
        )}
      </div>

      {/* Mobile card view */}
      <div className="space-y-3 md:hidden">
        {fechamentos.map((f) => (
          <div key={f.id} className="rounded-lg border border-surface-border bg-surface-card p-4">
            <div className="flex items-start justify-between mb-2">
              <div className="min-w-0 flex-1">
                <div className="text-base font-medium text-primary-900 truncate">{f.motorista_nome}</div>
                <div className="text-sm text-primary-500">
                  {formatarPeriodoFechamento(f.periodo_inicio, f.periodo_fim, f.tipo)} - {FECHAMENTO_TIPO_LABELS[f.tipo]}
                </div>
              </div>
              <span className={`shrink-0 ml-2 inline-flex rounded-full px-3 py-1 text-xs font-semibold ${FECHAMENTO_STATUS_COLORS[f.status]}`}>
                {FECHAMENTO_STATUS_LABELS[f.status]}
              </span>
            </div>
            <div className="grid grid-cols-3 gap-2 mt-3 text-sm">
              <div>
                <div className="text-text-muted">Viagens</div>
                <div className="font-medium tabular-nums text-primary-900">{formatBRL(f.total_viagens)}</div>
              </div>
              <div>
                <div className="text-text-muted">Gastos</div>
                <div className="font-medium tabular-nums text-primary-900">{formatBRL(f.total_gastos)}</div>
              </div>
              <div>
                <div className="text-text-muted">Saldo</div>
                <div className={`font-semibold tabular-nums ${f.saldo_motorista >= 0 ? 'text-success' : 'text-danger'}`}>
                  {formatBRL(f.saldo_motorista)}
                </div>
              </div>
            </div>
            <div className="mt-3 pt-2 border-t border-surface-border flex items-center gap-2 flex-wrap">
              <Link
                href={`/fechamentos/${f.id}`}
                className="inline-flex items-center gap-1.5 rounded-md px-3 py-2 text-sm font-medium text-primary-700 hover:bg-surface-hover transition-colors min-h-[48px]"
              >
                Ver Detalhe
              </Link>
              {isAdmin && f.status === 'fechado' && (
                <button
                  type="button"
                  onClick={() => handleReabrir(f.id)}
                  disabled={reabrirId === f.id}
                  className="inline-flex items-center gap-1.5 rounded-md px-3 py-2 text-sm font-medium text-warning hover:bg-alert-warning-bg transition-colors min-h-[48px] disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {reabrirId === f.id ? 'Reabrindo...' : 'Reabrir'}
                </button>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Desktop table view */}
      <div className="hidden md:block overflow-x-auto rounded-lg border border-surface-border bg-surface-card">
        <table className="min-w-full divide-y divide-surface-border">
          <thead className="bg-surface-muted">
            <tr>
              <th className="px-4 py-3.5 text-left text-sm font-medium uppercase tracking-wider text-primary-500">
                Motorista
              </th>
              <th className="px-4 py-3.5 text-left text-sm font-medium uppercase tracking-wider text-primary-500">
                Periodo
              </th>
              <th className="px-4 py-3.5 text-left text-sm font-medium uppercase tracking-wider text-primary-500">
                Tipo
              </th>
              <th className="px-4 py-3.5 text-right text-sm font-medium uppercase tracking-wider text-primary-500">
                Viagens
              </th>
              <th className="px-4 py-3.5 text-right text-sm font-medium uppercase tracking-wider text-primary-500">
                Gastos
              </th>
              <th className="px-4 py-3.5 text-right text-sm font-medium uppercase tracking-wider text-primary-500">
                Saldo
              </th>
              <th className="px-4 py-3.5 text-center text-sm font-medium uppercase tracking-wider text-primary-500">
                Situacao
              </th>
              <th className="px-4 py-3.5 text-right text-sm font-medium uppercase tracking-wider text-primary-500">
                Acoes
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-surface-border">
            {fechamentos.map((f) => (
              <tr key={f.id} className="hover:bg-surface-muted">
                <td className="whitespace-nowrap px-4 py-3.5 text-base font-medium text-primary-900">
                  {f.motorista_nome}
                </td>
                <td className="whitespace-nowrap px-4 py-3.5 text-base text-primary-700">
                  {formatarPeriodoFechamento(f.periodo_inicio, f.periodo_fim, f.tipo)}
                </td>
                <td className="whitespace-nowrap px-4 py-3.5 text-base text-primary-700">
                  {FECHAMENTO_TIPO_LABELS[f.tipo]}
                </td>
                <td className="whitespace-nowrap px-4 py-3.5 text-base text-right text-primary-700">
                  {formatBRL(f.total_viagens)}
                </td>
                <td className="whitespace-nowrap px-4 py-3.5 text-base text-right text-primary-700">
                  {formatBRL(f.total_gastos)}
                </td>
                <td className={`whitespace-nowrap px-4 py-3.5 text-base text-right font-semibold ${
                  f.saldo_motorista >= 0 ? 'text-success' : 'text-danger'
                }`}>
                  {formatBRL(f.saldo_motorista)}
                </td>
                <td className="whitespace-nowrap px-4 py-3.5 text-center">
                  <span className={`inline-flex rounded-full px-3 py-1 text-sm font-semibold ${FECHAMENTO_STATUS_COLORS[f.status]}`}>
                    {FECHAMENTO_STATUS_LABELS[f.status]}
                  </span>
                </td>
                <td className="whitespace-nowrap px-4 py-3.5 text-right">
                  <div className="flex items-center justify-end gap-2">
                    <Link
                      href={`/fechamentos/${f.id}`}
                      className="inline-flex items-center gap-1.5 rounded-md px-3 py-2 text-sm font-medium text-primary-700 hover:bg-surface-hover transition-colors min-h-[40px]"
                    >
                      <svg className="h-4 w-4" aria-hidden="true" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                      </svg>
                      Ver Detalhe
                    </Link>
                    {isAdmin && f.status === 'fechado' && (
                      <button
                        type="button"
                        onClick={() => handleReabrir(f.id)}
                        disabled={reabrirId === f.id}
                        className="inline-flex items-center gap-1.5 rounded-md px-3 py-2 text-sm font-medium text-warning hover:bg-alert-warning-bg transition-colors min-h-[40px] disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        {reabrirId === f.id ? 'Reabrindo...' : 'Reabrir'}
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {totalCount > pageSize && (
        <div className="flex items-center justify-between border-t border-surface-border bg-surface-card px-4 py-3 rounded-lg">
          <p className="text-sm text-primary-500">
            Mostrando <span className="font-medium text-primary-900">{from}</span>
            {' - '}
            <span className="font-medium text-primary-900">{to}</span> de{' '}
            <span className="font-medium text-primary-900">{totalCount}</span>{' '}
            registros
          </p>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => goToPage(currentPage - 1)}
              disabled={currentPage <= 1 || isPending}
              className="rounded-md border border-surface-border px-3 py-1 text-sm text-primary-700 transition-colors hover:bg-surface-muted disabled:cursor-not-allowed disabled:opacity-50"
            >
              Anterior
            </button>

            {generatePageNumbers(currentPage, totalPages).map((pageNum, idx) =>
              pageNum === null ? (
                <span key={`ellipsis-${idx}`} className="px-1 text-text-muted">
                  ...
                </span>
              ) : (
                <button
                  key={pageNum}
                  type="button"
                  onClick={() => goToPage(pageNum)}
                  disabled={isPending}
                  className={`rounded-md px-3 py-1 text-sm transition-colors ${
                    pageNum === currentPage
                      ? 'bg-btn-primary text-white'
                      : 'border border-surface-border text-primary-700 hover:bg-surface-muted'
                  }`}
                >
                  {pageNum}
                </button>
              ),
            )}

            <button
              type="button"
              onClick={() => goToPage(currentPage + 1)}
              disabled={currentPage >= totalPages || isPending}
              className="rounded-md border border-surface-border px-3 py-1 text-sm text-primary-700 transition-colors hover:bg-surface-muted disabled:cursor-not-allowed disabled:opacity-50"
            >
              Proximo
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

/**
 * Generate page numbers with ellipsis for large page counts.
 */
function generatePageNumbers(
  current: number,
  total: number,
): Array<number | null> {
  if (total <= 7) {
    return Array.from({ length: total }, (_, i) => i + 1);
  }

  const pages: Array<number | null> = [];
  pages.push(1);

  if (current > 3) {
    pages.push(null);
  }

  const start = Math.max(2, current - 1);
  const end = Math.min(total - 1, current + 1);

  for (let i = start; i <= end; i++) {
    pages.push(i);
  }

  if (current < total - 2) {
    pages.push(null);
  }

  pages.push(total);

  return pages;
}
