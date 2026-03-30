'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { updateViagemStatus, updateViagemObservacao } from '@/app/(dashboard)/viagens/actions';
import { VIAGEM_STATUS_TRANSITIONS } from '@/types/viagem';
import type { ViagemStatus } from '@/types/database';

interface ViagemStatusActionsProps {
  viagemId: string;
  currentStatus: ViagemStatus;
  observacao: string | null;
}

export function ViagemStatusActions({
  viagemId,
  currentStatus,
  observacao,
}: ViagemStatusActionsProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [showConcluirForm, setShowConcluirForm] = useState(false);
  const [dataChegadaReal, setDataChegadaReal] = useState('');
  const [kmChegada, setKmChegada] = useState('');
  const [editingObs, setEditingObs] = useState(false);
  const [obsValue, setObsValue] = useState(observacao ?? '');

  const transitions = VIAGEM_STATUS_TRANSITIONS[currentStatus];

  function handleStatusChange(novoStatus: ViagemStatus) {
    if (novoStatus === 'concluida') {
      setShowConcluirForm(true);
      return;
    }

    setError(null);
    startTransition(async () => {
      const result = await updateViagemStatus(viagemId, novoStatus);
      if (!result.success) {
        setError(result.error ?? 'Erro ao atualizar status');
      } else {
        router.refresh();
      }
    });
  }

  function handleConcluir() {
    if (!dataChegadaReal) {
      setError('Data de chegada real e obrigatoria');
      return;
    }

    setError(null);
    startTransition(async () => {
      const km = kmChegada !== '' ? Number(kmChegada) : undefined;
      const result = await updateViagemStatus(
        viagemId,
        'concluida',
        dataChegadaReal,
        km,
      );
      if (!result.success) {
        setError(result.error ?? 'Erro ao concluir viagem');
      } else {
        setShowConcluirForm(false);
        router.refresh();
      }
    });
  }

  function handleSaveObs() {
    setError(null);
    startTransition(async () => {
      const result = await updateViagemObservacao(viagemId, obsValue);
      if (!result.success) {
        setError(result.error ?? 'Erro ao salvar observacao');
      } else {
        setEditingObs(false);
        router.refresh();
      }
    });
  }

  if (transitions.length === 0 && currentStatus !== 'concluida' && currentStatus !== 'cancelada') {
    return null;
  }

  return (
    <div className="space-y-4">
      {error && (
        <div className="rounded-lg border border-danger/20 bg-alert-danger-bg p-4 text-sm text-danger">
          {error}
        </div>
      )}

      {/* Status transition buttons */}
      {transitions.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {transitions.map((novoStatus) => (
            <button
              key={novoStatus}
              type="button"
              onClick={() => handleStatusChange(novoStatus)}
              disabled={isPending}
              className={`rounded-lg px-4 py-2 text-sm font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-50 ${
                novoStatus === 'cancelada'
                  ? 'border border-red-300 text-danger hover:bg-alert-danger-bg'
                  : 'bg-primary-700 text-white hover:bg-primary-800'
              }`}
            >
              {novoStatus === 'em_andamento' && 'Iniciar Viagem'}
              {novoStatus === 'concluida' && 'Concluir Viagem'}
              {novoStatus === 'cancelada' && 'Cancelar Viagem'}
            </button>
          ))}
        </div>
      )}

      {/* Concluir form (AC3: requires data_chegada_real) */}
      {showConcluirForm && (
        <div className="space-y-3 rounded-lg border border-surface-border bg-surface-muted p-4">
          <h4 className="text-sm font-medium text-primary-900">Concluir Viagem</h4>
          <div>
            <label htmlFor="data_chegada_real" className="mb-1 block text-sm text-primary-700">
              Data de Chegada Real *
            </label>
            <input
              id="data_chegada_real"
              type="datetime-local"
              value={dataChegadaReal}
              onChange={(e) => setDataChegadaReal(e.target.value)}
              className="block w-full rounded-lg border border-surface-border bg-surface-card px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label htmlFor="km_chegada" className="mb-1 block text-sm text-primary-700">
              KM na Chegada
            </label>
            <input
              id="km_chegada"
              type="number"
              min={0}
              value={kmChegada}
              onChange={(e) => setKmChegada(e.target.value)}
              className="block w-full rounded-lg border border-surface-border bg-surface-card px-3 py-2 text-sm"
            />
          </div>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={handleConcluir}
              disabled={isPending}
              className="rounded-lg bg-green-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-green-700 disabled:opacity-50"
            >
              {isPending ? 'Concluindo...' : 'Confirmar Conclusao'}
            </button>
            <button
              type="button"
              onClick={() => setShowConcluirForm(false)}
              className="rounded-lg border border-surface-border px-4 py-2 text-sm text-primary-700 hover:bg-surface-muted"
            >
              Cancelar
            </button>
          </div>
        </div>
      )}

      {/* Observacao edit for concluida/cancelada (AC6) */}
      {(currentStatus === 'concluida' || currentStatus === 'cancelada') && (
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <h4 className="text-sm font-medium text-primary-700">Observacao</h4>
            {!editingObs && (
              <button
                type="button"
                onClick={() => setEditingObs(true)}
                className="text-xs text-primary-500 hover:text-primary-700"
              >
                Editar
              </button>
            )}
          </div>
          {editingObs ? (
            <div className="space-y-2">
              <textarea
                rows={3}
                maxLength={1000}
                value={obsValue}
                onChange={(e) => setObsValue(e.target.value)}
                className="block w-full rounded-lg border border-surface-border bg-surface-card px-3 py-2 text-sm"
              />
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={handleSaveObs}
                  disabled={isPending}
                  className="rounded-lg bg-primary-700 px-4 py-1 text-sm font-medium text-white hover:bg-primary-800 disabled:opacity-50"
                >
                  Salvar
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setEditingObs(false);
                    setObsValue(observacao ?? '');
                  }}
                  className="text-sm text-primary-500 hover:text-primary-700"
                >
                  Cancelar
                </button>
              </div>
            </div>
          ) : (
            <p className="text-sm text-primary-500">
              {observacao || 'Nenhuma observacao.'}
            </p>
          )}
        </div>
      )}
    </div>
  );
}
