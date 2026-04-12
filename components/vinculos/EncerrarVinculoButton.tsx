'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { encerrarVinculo } from '@/app/(dashboard)/vinculos/actions';

interface EncerrarVinculoButtonProps {
  vinculoId: string;
  label?: string;
}

export function EncerrarVinculoButton({ vinculoId, label = 'Encerrar' }: EncerrarVinculoButtonProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [confirming, setConfirming] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function handleConfirm() {
    setError(null);
    startTransition(async () => {
      const result = await encerrarVinculo(vinculoId);
      if (result.success) {
        setConfirming(false);
        router.refresh();
      } else {
        setError(result.error ?? 'Erro ao encerrar vinculo');
      }
    });
  }

  if (confirming) {
    return (
      <div className="mt-2 rounded-lg border border-danger/20 bg-alert-danger-bg p-3 space-y-2">
        <p className="text-sm font-medium text-danger">Encerrar este vínculo?</p>
        {error && <p className="text-xs text-danger">{error}</p>}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleConfirm}
            disabled={isPending}
            className="rounded-md bg-danger px-3 py-2 text-sm font-semibold text-white transition-colors hover:bg-danger/90 disabled:opacity-50 min-h-[40px]"
          >
            {isPending ? 'Encerrando...' : 'Confirmar'}
          </button>
          <button
            type="button"
            onClick={() => setConfirming(false)}
            className="rounded-md px-3 py-2 text-sm font-medium text-primary-500 hover:bg-surface-hover transition-colors min-h-[40px]"
          >
            Cancelar
          </button>
        </div>
      </div>
    );
  }

  return (
    <button
      type="button"
      onClick={() => setConfirming(true)}
      className="inline-flex items-center rounded-md px-2.5 py-1.5 text-xs font-medium text-danger hover:bg-alert-danger-bg transition-colors min-h-[32px]"
    >
      {label}
    </button>
  );
}
