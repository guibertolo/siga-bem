'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { invalidarViagem } from '@/app/(dashboard)/viagens/actions';

interface ViagemInvalidarButtonProps {
  viagemId: string;
}

/**
 * Invalidar button for viagem detail page.
 * Only rendered server-side when user is dono/admin AND viagem status is NOT 'cancelada'.
 * Includes confirmation dialog with required motivo input (min 10 chars).
 */
export function ViagemInvalidarButton({ viagemId }: ViagemInvalidarButtonProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [showConfirm, setShowConfirm] = useState(false);
  const [motivo, setMotivo] = useState('');
  const [error, setError] = useState<string | null>(null);

  function handleInvalidar() {
    if (motivo.trim().length < 10) return;

    setError(null);
    startTransition(async () => {
      const result = await invalidarViagem(viagemId, motivo.trim());
      if (!result.success) {
        setError(result.error ?? 'Erro ao invalidar viagem');
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
        <div className="rounded-lg border border-danger/30 bg-alert-danger-bg p-4 space-y-3">
          <p className="text-sm font-bold text-danger">
            Esta ação vai invalidar a viagem. Digite o motivo:
          </p>
          <input
            type="text"
            value={motivo}
            onChange={(e) => setMotivo(e.target.value)}
            placeholder="Descreva o motivo da invalidação"
            className="w-full rounded-md border border-danger/30 bg-surface-card px-3 py-2.5 text-sm text-primary-900 placeholder:text-text-muted min-h-[48px]"
            minLength={10}
          />
          {motivo.length > 0 && motivo.trim().length < 10 && (
            <p className="text-xs text-danger">Motivo deve ter no mínimo 10 caracteres</p>
          )}
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleInvalidar}
              disabled={isPending || motivo.trim().length < 10}
              className="rounded-lg bg-danger px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-danger/90 disabled:opacity-50 min-h-[48px]"
            >
              {isPending ? 'Invalidando...' : 'Confirmar Invalidação'}
            </button>
            <button
              type="button"
              onClick={() => { setShowConfirm(false); setMotivo(''); }}
              disabled={isPending}
              className="rounded-lg border border-surface-border px-4 py-2.5 text-sm text-primary-700 hover:bg-surface-muted transition-colors min-h-[48px]"
            >
              Cancelar
            </button>
          </div>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => setShowConfirm(true)}
          className="inline-flex items-center gap-2 rounded-lg border border-danger/30 px-4 py-2.5 text-sm font-semibold text-danger transition-colors hover:bg-alert-danger-bg min-h-[48px]"
        >
          <svg className="h-4 w-4" aria-hidden="true" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
          </svg>
          Invalidar Viagem
        </button>
      )}
    </div>
  );
}
