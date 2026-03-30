'use client';

import { useState, useTransition, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { cn } from '@/lib/utils/cn';
import { createVinculo } from '@/app/(dashboard)/vinculos/actions';
import { getVinculoAtivoCaminhao } from '@/app/(dashboard)/vinculos/actions';
import type { CaminhaoOption } from '@/types/motorista-caminhao';

interface VincularCaminhaoInlineFormProps {
  motoristaId: string;
  caminhoes: CaminhaoOption[];
}

export function VincularCaminhaoInlineForm({
  motoristaId,
  caminhoes,
}: VincularCaminhaoInlineFormProps) {
  const router = useRouter();
  const [showForm, setShowForm] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [selectedCaminhaoId, setSelectedCaminhaoId] = useState('');
  const [warning, setWarning] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const handleCaminhaoChange = useCallback(async (caminhaoId: string) => {
    setWarning(null);
    setError(null);
    setSelectedCaminhaoId(caminhaoId);
    if (!caminhaoId) return;

    const result = await getVinculoAtivoCaminhao(caminhaoId);
    if (result.motoristas.length > 0) {
      const nomes = result.motoristas.join(', ');
      setWarning(
        `Este caminhao ja possui ${result.motoristas.length === 1 ? 'o motorista' : 'os motoristas'} ${nomes} vinculado${result.motoristas.length > 1 ? 's' : ''}. O novo vinculo sera adicionado.`,
      );
    }
  }, []);

  const handleSubmit = () => {
    if (!selectedCaminhaoId) {
      setError('Selecione um caminhao');
      return;
    }

    setError(null);
    startTransition(async () => {
      const today = new Date().toISOString().split('T')[0];
      const result = await createVinculo({
        motorista_id: motoristaId,
        caminhao_id: selectedCaminhaoId,
        data_inicio: today,
        observacao: '',
      });

      if (!result.success) {
        setError(result.error || 'Erro ao criar vinculo. Tente novamente.');
        return;
      }

      setSuccess(true);
      setSelectedCaminhaoId('');
      setWarning(null);
      setShowForm(false);
      router.refresh();

      setTimeout(() => setSuccess(false), 3000);
    });
  };

  const handleCancel = () => {
    setShowForm(false);
    setSelectedCaminhaoId('');
    setWarning(null);
    setError(null);
  };

  if (success) {
    return (
      <div className="mt-3 rounded-lg border border-success/30 bg-alert-success-bg p-3 text-sm text-success">
        Vinculo criado com sucesso!
      </div>
    );
  }

  if (!showForm) {
    return (
      <button
        type="button"
        onClick={() => setShowForm(true)}
        className="mt-3 inline-flex items-center gap-1.5 rounded-lg border border-dashed border-primary-500/40 px-4 py-2.5 text-sm font-medium text-primary-600 min-h-[48px] transition-colors hover:border-primary-500 hover:bg-primary-500/5"
      >
        <svg className="h-4 w-4" aria-hidden="true" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
        </svg>
        Vincular Caminhao
      </button>
    );
  }

  return (
    <div className="mt-3 space-y-3 rounded-lg border border-primary-500/20 bg-primary-500/5 p-4">
      <p className="text-sm font-medium text-primary-700">Vincular a um caminhao</p>

      {error && (
        <div className="rounded-lg border border-danger/20 bg-alert-danger-bg p-3 text-sm text-danger">
          {error}
        </div>
      )}

      <div>
        <select
          value={selectedCaminhaoId}
          onChange={(e) => handleCaminhaoChange(e.target.value)}
          className={cn(
            'w-full rounded-lg border px-4 py-3 text-base text-primary-900 outline-none transition-colors',
            'focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20',
            'border-surface-border bg-surface-card',
          )}
          disabled={isPending}
        >
          <option value="">Selecione um caminhao</option>
          {caminhoes.map((c) => (
            <option key={c.id} value={c.id}>
              {c.placa} — {c.modelo}
            </option>
          ))}
        </select>
      </div>

      {warning && (
        <div className="rounded-lg border border-warning/30 bg-alert-warning-bg p-3 text-sm text-amber-800 dark:text-amber-200">
          <div className="flex items-start gap-2">
            <svg className="mt-0.5 h-4 w-4 shrink-0 text-warning" aria-hidden="true" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4.832c-.77-.833-2.694-.833-3.464 0L3.34 16.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
            <span>{warning}</span>
          </div>
        </div>
      )}

      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={handleSubmit}
          disabled={isPending || !selectedCaminhaoId}
          className="inline-flex items-center gap-1.5 rounded-lg bg-primary-700 px-4 py-2.5 text-sm font-semibold text-white min-h-[48px] transition-colors hover:bg-primary-800 disabled:opacity-50"
        >
          <svg className="h-4 w-4" aria-hidden="true" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
          {isPending ? 'Vinculando...' : 'Vincular'}
        </button>
        <button
          type="button"
          onClick={handleCancel}
          disabled={isPending}
          className="rounded-lg border border-surface-border px-4 py-2.5 text-sm font-medium text-primary-700 min-h-[48px] transition-colors hover:bg-surface-hover"
        >
          Cancelar
        </button>
      </div>
    </div>
  );
}
