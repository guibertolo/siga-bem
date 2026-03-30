'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { deleteViagem } from '@/app/(dashboard)/viagens/actions';

interface ViagemDeleteButtonProps {
  viagemId: string;
}

/**
 * Delete button for viagem detail page.
 * Only rendered server-side when user is dono/admin AND viagem status is 'planejada'.
 * Includes confirmation dialog with required message.
 */
export function ViagemDeleteButton({ viagemId }: ViagemDeleteButtonProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [showConfirm, setShowConfirm] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function handleDelete() {
    setError(null);
    startTransition(async () => {
      const result = await deleteViagem(viagemId);
      if (!result.success) {
        setError(result.error ?? 'Erro ao excluir viagem');
        setShowConfirm(false);
      } else {
        router.push('/viagens');
      }
    });
  }

  return (
    <div className="space-y-2">
      {error && (
        <div className="rounded-lg border border-danger/20 bg-alert-danger-bg p-3 text-sm text-danger">
          {error}
        </div>
      )}

      {showConfirm ? (
        <div className="rounded-lg border border-danger/20 bg-alert-danger-bg p-4 space-y-3">
          <p className="text-sm font-medium text-danger">
            Tem certeza que deseja excluir esta viagem? Esta acao nao pode ser desfeita.
          </p>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleDelete}
              disabled={isPending}
              className="rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-red-700 disabled:opacity-50 min-h-[40px]"
            >
              {isPending ? 'Excluindo...' : 'Confirmar Exclusao'}
            </button>
            <button
              type="button"
              onClick={() => setShowConfirm(false)}
              disabled={isPending}
              className="rounded-lg border border-surface-border px-4 py-2 text-sm text-primary-700 hover:bg-surface-muted transition-colors min-h-[40px]"
            >
              Cancelar
            </button>
          </div>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => setShowConfirm(true)}
          className="inline-flex items-center gap-2 rounded-lg border border-red-300 px-4 py-2 text-sm font-medium text-danger transition-colors hover:bg-alert-danger-bg min-h-[40px]"
        >
          <svg className="h-4 w-4" aria-hidden="true" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
          </svg>
          Excluir Viagem
        </button>
      )}
    </div>
  );
}
