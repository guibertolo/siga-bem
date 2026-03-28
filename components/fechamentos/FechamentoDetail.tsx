'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { formatBRL } from '@/lib/utils/currency';
import { formatarData } from '@/lib/utils/format-date';
import { formatarPeriodoFechamento } from '@/lib/utils/formato-periodo';
import {
  fecharFechamento,
  marcarComoPago,
  deleteFechamento,
} from '@/app/(dashboard)/fechamentos/actions';
import {
  FECHAMENTO_STATUS_LABELS,
  FECHAMENTO_STATUS_COLORS,
  FECHAMENTO_TIPO_LABELS,
  FECHAMENTO_STATUS_TRANSITIONS,
} from '@/types/fechamento';
import type { FechamentoDetalhado } from '@/types/fechamento';

interface FechamentoDetailProps {
  fechamento: FechamentoDetalhado;
  canManage: boolean;
}

export function FechamentoDetail({ fechamento, canManage }: FechamentoDetailProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [confirmAction, setConfirmAction] = useState<string | null>(null);

  const viagemItems = fechamento.itens.filter((i) => i.tipo === 'viagem');
  const gastoItems = fechamento.itens.filter((i) => i.tipo === 'gasto');
  const validTransitions = FECHAMENTO_STATUS_TRANSITIONS[fechamento.status];

  function handleFechar() {
    setError(null);
    setConfirmAction(null);
    startTransition(async () => {
      const result = await fecharFechamento(fechamento.id);
      if (!result.success) {
        setError(result.error ?? 'Erro ao fechar fechamento');
        return;
      }
      router.refresh();
    });
  }

  function handlePagar() {
    setError(null);
    setConfirmAction(null);
    startTransition(async () => {
      const result = await marcarComoPago(fechamento.id);
      if (!result.success) {
        setError(result.error ?? 'Erro ao marcar como pago');
        return;
      }
      router.refresh();
    });
  }

  function handleExcluir() {
    setError(null);
    setConfirmAction(null);
    startTransition(async () => {
      const result = await deleteFechamento(fechamento.id);
      if (!result.success) {
        setError(result.error ?? 'Erro ao excluir fechamento');
        return;
      }
      router.push('/fechamentos');
    });
  }

  return (
    <div className="space-y-6">
      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          {error}
        </div>
      )}

      {/* Header info */}
      <div className="rounded-lg border border-surface-border bg-surface-card p-6">
        <div className="flex items-start justify-between">
          <div>
            <h3 className="text-lg font-semibold text-primary-900">
              {fechamento.motorista?.nome ?? 'Motorista'}
            </h3>
            <p className="mt-1 text-sm text-primary-500">
              {FECHAMENTO_TIPO_LABELS[fechamento.tipo]} &mdash;{' '}
              {formatarPeriodoFechamento(fechamento.periodo_inicio, fechamento.periodo_fim, fechamento.tipo)}
            </p>
          </div>
          <span
            className={`inline-block rounded-full px-3 py-1 text-sm font-medium ${
              FECHAMENTO_STATUS_COLORS[fechamento.status]
            }`}
          >
            {FECHAMENTO_STATUS_LABELS[fechamento.status]}
          </span>
        </div>

        {/* Totais */}
        <div className="mt-4 grid gap-4 sm:grid-cols-3">
          <div className="rounded-lg bg-gray-50 p-3 text-center">
            <p className="text-xs text-primary-500">Viagens ({viagemItems.length})</p>
            <p className="text-lg font-bold tabular-nums text-primary-900">
              {formatBRL(fechamento.total_viagens)}
            </p>
          </div>
          <div className="rounded-lg bg-gray-50 p-3 text-center">
            <p className="text-xs text-primary-500">Gastos ({gastoItems.length})</p>
            <p className="text-lg font-bold tabular-nums text-primary-900">
              {formatBRL(fechamento.total_gastos)}
            </p>
          </div>
          <div className="rounded-lg bg-gray-50 p-3 text-center">
            <p className="text-xs text-primary-500">Saldo Liquido</p>
            <p
              className={`text-lg font-bold tabular-nums ${
                fechamento.saldo_motorista >= 0 ? 'text-green-700' : 'text-red-700'
              }`}
            >
              {formatBRL(fechamento.saldo_motorista)}
            </p>
          </div>
        </div>

        {fechamento.observacao && (
          <p className="mt-4 text-sm text-primary-700">
            <span className="font-medium">Observacao:</span> {fechamento.observacao}
          </p>
        )}

        {fechamento.fechado_em && (
          <p className="mt-2 text-xs text-primary-500">
            Fechado em: {formatarData(fechamento.fechado_em.split('T')[0])}
          </p>
        )}
        {fechamento.pago_em && (
          <p className="mt-1 text-xs text-primary-500">
            Pago em: {formatarData(fechamento.pago_em.split('T')[0])}
          </p>
        )}
      </div>

      {/* Viagens */}
      <div className="rounded-lg border border-surface-border bg-surface-card">
        <h4 className="border-b border-surface-border px-4 py-3 text-sm font-medium text-primary-900">
          Viagens ({viagemItems.length})
        </h4>
        {viagemItems.length === 0 ? (
          <p className="px-4 py-3 text-sm text-primary-500">Nenhuma viagem neste fechamento.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-surface-border bg-gray-50 text-left">
                  <th className="px-4 py-2 font-medium text-primary-700">Data</th>
                  <th className="px-4 py-2 font-medium text-primary-700">Descricao</th>
                  <th className="px-4 py-2 text-right font-medium text-primary-700">Valor</th>
                </tr>
              </thead>
              <tbody>
                {viagemItems.map((item) => (
                  <tr key={item.id} className="border-b border-surface-border last:border-0">
                    <td className="whitespace-nowrap px-4 py-2 tabular-nums text-primary-700">
                      {formatarData(item.data)}
                    </td>
                    <td className="px-4 py-2 text-primary-900">{item.descricao}</td>
                    <td className="whitespace-nowrap px-4 py-2 text-right tabular-nums font-medium text-green-700">
                      {formatBRL(item.valor)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Gastos */}
      <div className="rounded-lg border border-surface-border bg-surface-card">
        <h4 className="border-b border-surface-border px-4 py-3 text-sm font-medium text-primary-900">
          Gastos ({gastoItems.length})
        </h4>
        {gastoItems.length === 0 ? (
          <p className="px-4 py-3 text-sm text-primary-500">Nenhum gasto neste fechamento.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-surface-border bg-gray-50 text-left">
                  <th className="px-4 py-2 font-medium text-primary-700">Data</th>
                  <th className="px-4 py-2 font-medium text-primary-700">Descricao</th>
                  <th className="px-4 py-2 text-right font-medium text-primary-700">Valor</th>
                </tr>
              </thead>
              <tbody>
                {gastoItems.map((item) => (
                  <tr key={item.id} className="border-b border-surface-border last:border-0">
                    <td className="whitespace-nowrap px-4 py-2 tabular-nums text-primary-700">
                      {formatarData(item.data)}
                    </td>
                    <td className="px-4 py-2 text-primary-900">{item.descricao}</td>
                    <td className="whitespace-nowrap px-4 py-2 text-right tabular-nums font-medium text-red-700">
                      {formatBRL(item.valor)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Action buttons */}
      {canManage && (
        <div className="flex flex-wrap gap-3">
          {validTransitions.includes('fechado') && (
            <>
              {confirmAction === 'fechar' ? (
                <div className="flex items-center gap-2">
                  <span className="text-sm text-primary-700">Confirmar fechamento?</span>
                  <button
                    type="button"
                    onClick={handleFechar}
                    disabled={isPending}
                    className="rounded-lg bg-blue-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
                  >
                    Sim
                  </button>
                  <button
                    type="button"
                    onClick={() => setConfirmAction(null)}
                    className="rounded-lg border border-surface-border px-3 py-1.5 text-sm text-primary-700 hover:bg-gray-50"
                  >
                    Cancelar
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => setConfirmAction('fechar')}
                  disabled={isPending}
                  className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
                >
                  Fechar
                </button>
              )}
            </>
          )}

          {validTransitions.includes('pago') && (
            <>
              {confirmAction === 'pagar' ? (
                <div className="flex items-center gap-2">
                  <span className="text-sm text-primary-700">Marcar como pago?</span>
                  <button
                    type="button"
                    onClick={handlePagar}
                    disabled={isPending}
                    className="rounded-lg bg-green-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-green-700 disabled:opacity-50"
                  >
                    Sim
                  </button>
                  <button
                    type="button"
                    onClick={() => setConfirmAction(null)}
                    className="rounded-lg border border-surface-border px-3 py-1.5 text-sm text-primary-700 hover:bg-gray-50"
                  >
                    Cancelar
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => setConfirmAction('pagar')}
                  disabled={isPending}
                  className="rounded-lg bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-700 disabled:opacity-50"
                >
                  Marcar como Pago
                </button>
              )}
            </>
          )}

          {fechamento.status === 'aberto' && (
            <>
              {confirmAction === 'excluir' ? (
                <div className="flex items-center gap-2">
                  <span className="text-sm text-red-600">Excluir fechamento?</span>
                  <button
                    type="button"
                    onClick={handleExcluir}
                    disabled={isPending}
                    className="rounded-lg bg-red-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-50"
                  >
                    Sim
                  </button>
                  <button
                    type="button"
                    onClick={() => setConfirmAction(null)}
                    className="rounded-lg border border-surface-border px-3 py-1.5 text-sm text-primary-700 hover:bg-gray-50"
                  >
                    Cancelar
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => setConfirmAction('excluir')}
                  disabled={isPending}
                  className="rounded-lg border border-red-300 px-4 py-2 text-sm font-medium text-red-600 hover:bg-red-50 disabled:opacity-50"
                >
                  Excluir
                </button>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}
