'use client';

import { useState } from 'react';
import { AbastecimentoForm } from '@/components/abastecimento/AbastecimentoForm';
import { cn } from '@/lib/utils/cn';

interface AbastecimentoSectionProps {
  viagemId: string;
  empresaId: string;
  origem: string;
  destino: string;
  motoristaNome: string;
  caminhaoPlaca: string;
  kmSaida: number | null;
}

/**
 * Collapsible section for fuel registration inside trip detail page.
 * Story 5.2 — AC 1, 2
 *
 * Shows a prominent button "+ Registrar Abastecimento" that expands
 * to reveal the AbastecimentoForm. Only rendered when viagem.status === 'em_andamento'.
 */
export function AbastecimentoSection({
  viagemId,
  empresaId,
  origem,
  destino,
  motoristaNome,
  caminhaoPlaca,
  kmSaida,
}: AbastecimentoSectionProps) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="rounded-lg border border-surface-border bg-surface-card p-6">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium uppercase tracking-wide text-primary-500">
          Abastecimento
        </h3>
        <button
          type="button"
          onClick={() => setExpanded(!expanded)}
          className={cn(
            'inline-flex items-center gap-2 rounded-lg px-4 py-3 text-base font-semibold min-h-[48px] transition-colors',
            expanded
              ? 'border border-surface-border bg-surface-muted text-primary-700 hover:bg-surface-hover'
              : 'bg-primary-700 text-white hover:bg-primary-800 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2',
          )}
        >
          {expanded ? (
            <>
              <svg className="h-5 w-5" aria-hidden="true" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
              Fechar
            </>
          ) : (
            <>
              <svg className="h-5 w-5" aria-hidden="true" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              Registrar Abastecimento
            </>
          )}
        </button>
      </div>

      {expanded && (
        <div className="mt-6 border-t border-surface-border pt-6">
          <AbastecimentoForm
            viagemId={viagemId}
            empresaId={empresaId}
            origem={origem}
            destino={destino}
            motoristaNome={motoristaNome}
            caminhaoPlaca={caminhaoPlaca}
            kmSaida={kmSaida}
          />
        </div>
      )}
    </div>
  );
}
