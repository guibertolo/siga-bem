'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { invalidarViagem } from '@/app/(dashboard)/viagens/actions';

interface InvalidarViagemFormProps {
  viagemId: string;
}

export function InvalidarViagemForm({ viagemId }: InvalidarViagemFormProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [motivo, setMotivo] = useState('');
  const [error, setError] = useState<string | null>(null);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (motivo.trim().length < 10) return;

    setError(null);
    startTransition(async () => {
      const result = await invalidarViagem(viagemId, motivo.trim());
      if (result.success) {
        router.push('/viagens');
      } else {
        setError(result.error ?? 'Erro ao invalidar viagem');
      }
    });
  }

  const canSubmit = motivo.trim().length >= 10 && !isPending;

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div>
        <label htmlFor="motivo" className="mb-2 block text-base font-medium text-primary-700">
          Motivo da invalidacao <span className="text-danger">*</span>
        </label>
        <textarea
          id="motivo"
          value={motivo}
          onChange={(e) => setMotivo(e.target.value)}
          placeholder="Descreva o motivo da invalidacao"
          rows={4}
          className="w-full rounded-lg border border-surface-border bg-surface-card px-4 py-3 text-base text-primary-900 placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-danger/50 focus:border-danger"
        />
        <p className="mt-1.5 text-sm text-primary-500">
          Minimo 10 caracteres ({motivo.trim().length}/10)
        </p>
      </div>

      {error && (
        <div className="rounded-lg border border-danger/20 bg-alert-danger-bg px-4 py-3 text-sm text-danger">
          {error}
        </div>
      )}

      <div className="flex flex-col sm:flex-row gap-3">
        <button
          type="submit"
          disabled={!canSubmit}
          className="w-full sm:flex-1 rounded-lg bg-danger px-4 py-3 text-base font-semibold text-white transition-colors hover:bg-danger/90 disabled:opacity-50 min-h-[48px]"
        >
          {isPending ? 'Invalidando...' : 'Confirmar Invalidacao'}
        </button>
        <button
          type="button"
          onClick={() => router.back()}
          disabled={isPending}
          className="w-full sm:flex-1 rounded-lg border border-surface-border px-4 py-3 text-base font-medium text-primary-700 transition-colors hover:bg-surface-hover min-h-[48px]"
        >
          Cancelar
        </button>
      </div>
    </form>
  );
}
