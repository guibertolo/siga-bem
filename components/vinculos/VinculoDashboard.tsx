'use client';

import { VinculoCard } from '@/components/vinculos/VinculoCard';
import { CaminhaoSemMotoristaCard } from '@/components/vinculos/CaminhaoSemMotoristaCard';
import { VinculoHistoricoSection } from '@/components/vinculos/VinculoHistoricoSection';
import type {
  CaminhaoComMotorista,
  CaminhaoSemMotorista,
  VinculoListItem,
  MotoristaOption,
} from '@/types/motorista-caminhao';

interface VinculoDashboardProps {
  caminhoesCom: CaminhaoComMotorista[];
  caminhoesSem: CaminhaoSemMotorista[];
  historico: VinculoListItem[];
  totalEncerrados: number;
  motoristas: MotoristaOption[];
}

export function VinculoDashboard({
  caminhoesCom,
  caminhoesSem,
  historico,
  totalEncerrados,
  motoristas,
}: VinculoDashboardProps) {
  const isEmpty = caminhoesCom.length === 0 && caminhoesSem.length === 0 && historico.length === 0;

  if (isEmpty) {
    return (
      <div className="rounded-lg border border-surface-border bg-surface-card p-8 text-center">
        <p className="text-base text-primary-500">Nenhum vinculo ou caminhao encontrado.</p>
        <p className="mt-1 text-base text-text-muted">
          Cadastre caminhoes e motoristas para comecar a gerenciar vinculos.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Section 1: Caminhoes sem Motorista (action needed!) */}
      {caminhoesSem.length > 0 ? (
        <section role="region" aria-label="Caminhoes sem motorista">
          <h3 className="mb-4 text-lg font-semibold text-primary-900">
            <span className="inline-flex items-center gap-2">
              <svg
                className="h-5 w-5 text-danger"
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
              Caminhoes sem Motorista
            </span>
          </h3>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {caminhoesSem.map((c) => (
              <CaminhaoSemMotoristaCard
                key={c.caminhao_id}
                caminhao={c}
                motoristas={motoristas}
              />
            ))}
          </div>
        </section>
      ) : (
        caminhoesCom.length > 0 && (
          <div className="rounded-lg border border-success/20 bg-alert-success-bg/50 px-4 py-3">
            <p className="text-base font-medium text-success">
              Todos os caminhoes tem motorista vinculado
            </p>
          </div>
        )
      )}

      {/* Section 2: Caminhoes com Motorista */}
      {caminhoesCom.length > 0 && (
        <section role="region" aria-label="Caminhoes com motorista">
          <h3 className="mb-4 text-lg font-semibold text-primary-900">
            Caminhoes com Motorista
          </h3>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {caminhoesCom.map((c) => (
              <VinculoCard key={c.caminhao_id} caminhao={c} />
            ))}
          </div>
        </section>
      )}

      {/* Section 3: Historico (collapsed by default) */}
      <VinculoHistoricoSection
        historico={historico}
        totalEncerrados={totalEncerrados}
      />
    </div>
  );
}
