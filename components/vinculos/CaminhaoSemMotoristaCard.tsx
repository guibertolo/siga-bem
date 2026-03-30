'use client';

import { VincularMotoristaInlineForm } from '@/components/vinculos/VincularMotoristaInlineForm';
import type { CaminhaoSemMotorista, MotoristaOption } from '@/types/motorista-caminhao';

interface CaminhaoSemMotoristaCardProps {
  caminhao: CaminhaoSemMotorista;
  motoristas: MotoristaOption[];
}

export function CaminhaoSemMotoristaCard({
  caminhao,
  motoristas,
}: CaminhaoSemMotoristaCardProps) {
  return (
    <div className="rounded-lg border-l-4 border-l-danger border border-danger/20 bg-alert-danger-bg/30 shadow-sm overflow-hidden">
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
      </div>

      {/* Alert + action section */}
      <div className="px-4 py-3 border-t border-danger/10">
        <div className="flex items-center gap-2">
          <svg
            className="h-5 w-5 shrink-0 text-danger"
            aria-hidden="true"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
          <span className="text-base font-medium text-danger">Sem motorista vinculado</span>
        </div>

        <VincularMotoristaInlineForm
          caminhaoId={caminhao.caminhao_id}
          motoristas={motoristas}
        />
      </div>
    </div>
  );
}
