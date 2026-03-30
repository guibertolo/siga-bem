'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import {
  fecharFechamento,
  marcarComoPago,
  deleteFechamento,
} from '@/app/(dashboard)/fechamentos/actions';
import { FECHAMENTO_STATUS_TRANSITIONS } from '@/types/fechamento';
import type { FechamentoStatus } from '@/types/database';

interface FechamentoStatusActionsProps {
  fechamentoId: string;
  currentStatus: FechamentoStatus;
}

export function FechamentoStatusActions({
  fechamentoId,
  currentStatus,
}: FechamentoStatusActionsProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [confirmAction, setConfirmAction] = useState<string | null>(null);

  const validTransitions = FECHAMENTO_STATUS_TRANSITIONS[currentStatus];

  function handleAction(action: string) {
    setError(null);
    setConfirmAction(null);

    startTransition(async () => {
      let result: { success: boolean; error?: string };

      switch (action) {
        case 'fechar':
          result = await fecharFechamento(fechamentoId);
          break;
        case 'pagar':
          result = await marcarComoPago(fechamentoId);
          break;
        case 'excluir':
          result = await deleteFechamento(fechamentoId);
          if (result.success) {
            router.push('/fechamentos');
            return;
          }
          break;
        default:
          return;
      }

      if (!result.success) {
        setError(result.error ?? 'Erro na operacao');
        return;
      }

      router.refresh();
    });
  }

  if (validTransitions.length === 0 && currentStatus !== 'aberto') {
    return null;
  }

  return (
    <div className="rounded-lg border border-surface-border bg-surface-card p-4 shadow-sm">
      {error && (
        <div className="mb-3 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          {error}
        </div>
      )}

      <div className="flex flex-wrap items-center gap-3">
        <span className="text-sm font-medium text-primary-700">O que deseja fazer:</span>

        {validTransitions.includes('fechado') && (
          <>
            {confirmAction === 'fechar' ? (
              <div className="flex items-center gap-2">
                <span className="text-sm text-text-muted">Confirmar acerto?</span>
                <button
                  type="button"
                  onClick={() => handleAction('fechar')}
                  disabled={isPending}
                  className="rounded-lg bg-primary-700 px-3 py-1.5 text-sm font-medium text-white hover:bg-primary-900 disabled:opacity-50"
                >
                  {isPending ? 'Processando...' : 'Sim, Fechar'}
                </button>
                <button
                  type="button"
                  onClick={() => setConfirmAction(null)}
                  disabled={isPending}
                  className="rounded-lg border border-surface-border px-3 py-1.5 text-sm text-primary-700 hover:bg-surface-muted"
                >
                  Cancelar
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => setConfirmAction('fechar')}
                disabled={isPending}
                className="rounded-lg bg-primary-700 px-4 py-2 text-sm font-medium text-white hover:bg-primary-900 disabled:opacity-50"
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
                <span className="text-sm text-text-muted">Marcar como pago?</span>
                <button
                  type="button"
                  onClick={() => handleAction('pagar')}
                  disabled={isPending}
                  className="rounded-lg bg-green-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-green-700 disabled:opacity-50"
                >
                  {isPending ? 'Processando...' : 'Sim, Pagar'}
                </button>
                <button
                  type="button"
                  onClick={() => setConfirmAction(null)}
                  disabled={isPending}
                  className="rounded-lg border border-surface-border px-3 py-1.5 text-sm text-primary-700 hover:bg-surface-muted"
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

        {currentStatus === 'aberto' && (
          <>
            {confirmAction === 'excluir' ? (
              <div className="flex items-center gap-2">
                <span className="text-sm text-red-600">Excluir acerto?</span>
                <button
                  type="button"
                  onClick={() => handleAction('excluir')}
                  disabled={isPending}
                  className="rounded-lg bg-red-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-50"
                >
                  {isPending ? 'Excluindo...' : 'Sim, Excluir'}
                </button>
                <button
                  type="button"
                  onClick={() => setConfirmAction(null)}
                  disabled={isPending}
                  className="rounded-lg border border-surface-border px-3 py-1.5 text-sm text-primary-700 hover:bg-surface-muted"
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
    </div>
  );
}
