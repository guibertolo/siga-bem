'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { encerrarVinculo } from '@/app/(dashboard)/vinculos/actions';
import type { CaminhaoComMotorista } from '@/types/motorista-caminhao';

interface VinculoCardProps {
  caminhao: CaminhaoComMotorista;
}

function formatDate(dateStr: string): string {
  const [year, month, day] = dateStr.split('-');
  return `${day}/${month}/${year}`;
}

function EncerrarButton({
  vinculoId,
  motoristaNome,
  caminhaoPlaca,
}: {
  vinculoId: string;
  motoristaNome: string;
  caminhaoPlaca: string;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [confirmando, setConfirmando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleConfirmar = () => {
    setError(null);
    startTransition(async () => {
      const result = await encerrarVinculo(vinculoId);
      if (!result.success) {
        setError(result.error ?? 'Erro ao encerrar vinculo.');
        setConfirmando(false);
        return;
      }
      router.refresh();
    });
  };

  if (confirmando) {
    return (
      <div className="rounded-lg border border-warning/30 bg-alert-warning-bg p-3 mt-2">
        <p className="text-base text-primary-900 mb-3">
          Encerrar vinculo de {motoristaNome} com {caminhaoPlaca}?
        </p>
        {error && (
          <p className="text-base text-danger mb-2">{error}</p>
        )}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleConfirmar}
            disabled={isPending}
            className="min-h-[48px] rounded-lg bg-danger px-4 py-3 text-base font-semibold text-white transition-colors hover:bg-danger/90 disabled:opacity-50"
          >
            {isPending ? 'Encerrando...' : 'Confirmar'}
          </button>
          <button
            type="button"
            onClick={() => {
              setConfirmando(false);
              setError(null);
            }}
            disabled={isPending}
            className="min-h-[48px] rounded-lg border border-surface-border px-4 py-3 text-base font-medium text-primary-700 transition-colors hover:bg-surface-hover"
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
      onClick={() => setConfirmando(true)}
      className="min-h-[48px] rounded-lg px-4 py-3 text-base font-medium text-danger transition-colors hover:bg-alert-danger-bg"
    >
      Encerrar Vinculo
    </button>
  );
}

export function VinculoCard({ caminhao }: VinculoCardProps) {
  const hasMultiple = caminhao.motoristas.length > 1;

  return (
    <div className="rounded-lg border-l-4 border-l-success border border-surface-border bg-surface-card shadow-sm overflow-hidden">
      {/* Caminhao header */}
      <div className="flex items-center gap-3 px-4 py-3 sm:px-5 sm:py-4">
        <svg
          className="h-6 w-6 shrink-0 text-primary-500"
          aria-hidden="true"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M9 17a2 2 0 11-4 0 2 2 0 014 0zM19 17a2 2 0 11-4 0 2 2 0 014 0z"
          />
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M13 16V6a1 1 0 00-1-1H4a1 1 0 00-1 1v10a1 1 0 001 1h1m8-1a1 1 0 01-1 1H9m4-1V8a1 1 0 011-1h2.586a1 1 0 01.707.293l3.414 3.414a1 1 0 01.293.707V16a1 1 0 01-1 1h-1m-6-1a1 1 0 001 1h1M5 17a2 2 0 104 0m-4 0a2 2 0 114 0m6 0a2 2 0 104 0m-4 0a2 2 0 114 0"
          />
        </svg>
        <div className="min-w-0 flex-1">
          <p className="text-lg font-bold text-primary-900 tabular-nums">
            {caminhao.caminhao_placa}
          </p>
          <p className="text-base text-primary-500">{caminhao.caminhao_modelo}</p>
        </div>
        {hasMultiple && (
          <span className="shrink-0 rounded-full bg-primary-500/10 px-3 py-1 text-sm font-semibold text-primary-700">
            {caminhao.motoristas.length}
          </span>
        )}
      </div>

      {/* Motoristas */}
      <div className="divide-y divide-surface-border border-t border-surface-border">
        {caminhao.motoristas.map((m) => (
          <div key={m.vinculo_id} className="px-4 py-3">
            <div className="flex items-start gap-3">
              <svg
                className="mt-0.5 h-5 w-5 shrink-0 text-text-muted"
                aria-hidden="true"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M5.121 17.804A13.937 13.937 0 0112 16c2.5 0 4.847.655 6.879 1.804M15 10a3 3 0 11-6 0 3 3 0 016 0zm6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
              <div className="min-w-0 flex-1">
                <p className="text-base font-medium text-primary-900">{m.motorista_nome}</p>
                <p className="text-base text-primary-700">Desde {formatDate(m.data_inicio)}</p>
              </div>
            </div>
            <div className="mt-2 flex justify-end">
              <EncerrarButton
                vinculoId={m.vinculo_id}
                motoristaNome={m.motorista_nome}
                caminhaoPlaca={caminhao.caminhao_placa}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
