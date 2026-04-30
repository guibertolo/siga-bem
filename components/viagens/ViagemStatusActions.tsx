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
  kmSaida?: number | null;
}

export function ViagemStatusActions({
  viagemId,
  currentStatus,
  observacao,
  kmSaida,
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
      setError('Informe a data e a hora de chegada.');
      return;
    }

    if (!kmChegada || kmChegada.trim() === '') {
      setError('Anote o KM do odômetro na chegada antes de concluir.');
      return;
    }

    const kmNum = Number(kmChegada);
    if (isNaN(kmNum) || kmNum < 0) {
      setError('O KM precisa ser um número (sem letras nem ponto).');
      return;
    }

    if (kmSaida != null && kmNum < kmSaida) {
      setError(`KM de chegada (${kmNum.toLocaleString('pt-BR')}) não pode ser menor que o de saída (${kmSaida.toLocaleString('pt-BR')})`);
      return;
    }

    setError(null);
    startTransition(async () => {
      const km = Number(kmChegada);
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
        setError(result.error ?? 'Erro ao salvar observação');
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
        <div className="rounded-lg border border-danger/20 bg-alert-danger-bg p-4 text-base text-danger">
          {error}
        </div>
      )}

      {/* Status transition buttons */}
      {transitions.length > 0 && (
        <div className="flex flex-wrap gap-3">
          {transitions.map((novoStatus) => (
            <button
              key={novoStatus}
              type="button"
              onClick={() => handleStatusChange(novoStatus)}
              disabled={isPending}
              className={`rounded-lg px-6 py-3 text-base font-semibold min-h-[48px] transition-colors disabled:cursor-not-allowed disabled:opacity-50 ${
                novoStatus === 'cancelada'
                  ? 'border border-danger/30 text-danger hover:bg-alert-danger-bg'
                  : 'bg-btn-primary text-white hover:bg-btn-primary-hover'
              }`}
            >
              {novoStatus === 'em_andamento' && 'Iniciar viagem'}
              {novoStatus === 'concluida' && 'Concluir viagem'}
              {novoStatus === 'cancelada' && 'Cancelar viagem'}
            </button>
          ))}
        </div>
      )}

      {/* Concluir form (AC3: requires data_chegada_real) */}
      {showConcluirForm && (
        <div className="space-y-4 rounded-lg border border-surface-border bg-surface-muted p-4">
          <h4 className="text-base font-semibold text-primary-900">Concluir Viagem</h4>
          <div>
            <label htmlFor="data_chegada_real" className="mb-2 block text-base font-medium text-primary-700">
              Data de chegada *
            </label>
            <input
              id="data_chegada_real"
              type="datetime-local"
              value={dataChegadaReal}
              onChange={(e) => setDataChegadaReal(e.target.value)}
              className="block w-full rounded-lg border border-surface-border bg-surface-card px-4 py-3 text-base min-h-[48px]"
            />
          </div>
          <div>
            <label htmlFor="km_chegada" className="mb-2 block text-base font-medium text-primary-700">
              KM na chegada (odômetro) *
            </label>
            <input
              id="km_chegada"
              type="number"
              min={0}
              required
              value={kmChegada}
              onChange={(e) => setKmChegada(e.target.value)}
              className="block w-full rounded-lg border border-surface-border bg-surface-card px-4 py-3 text-base min-h-[48px]"
            />
            <p className="mt-2 text-base text-primary-500">
              Anote o número que aparece no painel do caminhão.
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            <button
              type="button"
              onClick={handleConcluir}
              disabled={isPending}
              className="rounded-lg bg-success px-6 py-3 text-base font-semibold text-white min-h-[48px] transition-colors hover:bg-success/80 disabled:opacity-50"
            >
              {isPending ? 'Concluindo...' : 'Confirmar conclusão'}
            </button>
            <button
              type="button"
              onClick={() => setShowConcluirForm(false)}
              className="rounded-lg border border-surface-border px-6 py-3 text-base font-medium text-primary-700 min-h-[48px] hover:bg-surface-muted"
            >
              Cancelar
            </button>
          </div>
        </div>
      )}

      {/* Observacao edit for concluida/cancelada (AC6) */}
      {(currentStatus === 'concluida' || currentStatus === 'cancelada') && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="text-base font-semibold text-primary-700">Observação</h4>
            {!editingObs && (
              <button
                type="button"
                onClick={() => setEditingObs(true)}
                className="text-base font-medium text-primary-500 hover:text-primary-700 min-h-[44px] px-2"
              >
                Editar
              </button>
            )}
          </div>
          {editingObs ? (
            <div className="space-y-3">
              <textarea
                rows={3}
                maxLength={1000}
                value={obsValue}
                onChange={(e) => setObsValue(e.target.value)}
                className="block w-full rounded-lg border border-surface-border bg-surface-card px-4 py-3 text-base"
              />
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={handleSaveObs}
                  disabled={isPending}
                  className="rounded-lg bg-btn-primary px-6 py-3 text-base font-semibold text-white min-h-[48px] hover:bg-btn-primary-hover disabled:opacity-50"
                >
                  Salvar
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setEditingObs(false);
                    setObsValue(observacao ?? '');
                  }}
                  className="rounded-lg border border-surface-border px-6 py-3 text-base font-medium text-primary-700 min-h-[48px] hover:bg-surface-muted"
                >
                  Cancelar
                </button>
              </div>
            </div>
          ) : (
            <p className="text-base text-primary-500">
              {observacao || 'Nenhuma observação.'}
            </p>
          )}
        </div>
      )}
    </div>
  );
}
