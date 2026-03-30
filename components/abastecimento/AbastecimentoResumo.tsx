/**
 * Summary card for fuel expenses in a trip.
 * Story 5.3 — AC 9
 *
 * Displays: total count, total liters, total cost, average price per liter.
 * All values derived from the list data (no separate query).
 */

import { formatBRL } from '@/lib/utils/currency';
import type { AbastecimentoItem } from '@/lib/queries/combustivel-queries';

interface AbastecimentoResumoProps {
  abastecimentos: AbastecimentoItem[];
}

export function AbastecimentoResumo({ abastecimentos }: AbastecimentoResumoProps) {
  if (abastecimentos.length === 0) return null;

  const totalLitros = abastecimentos.reduce((sum, a) => sum + a.litros, 0);
  const totalValorCentavos = abastecimentos.reduce((sum, a) => sum + a.valor, 0);
  const precoMedioLitro = totalLitros > 0 ? (totalValorCentavos / 100) / totalLitros : 0;

  return (
    <div className="grid gap-3 sm:grid-cols-3">
      <div className="rounded-lg border border-surface-border bg-surface-card p-4">
        <p className="text-xs font-medium uppercase tracking-wide text-primary-500">
          Abastecimentos
        </p>
        <p className="mt-1 text-lg font-bold tabular-nums text-primary-900">
          {abastecimentos.length}
        </p>
      </div>

      <div className="rounded-lg border border-surface-border bg-surface-card p-4">
        <p className="text-xs font-medium uppercase tracking-wide text-primary-500">
          Total Litros
        </p>
        <p className="mt-1 text-lg font-bold tabular-nums text-primary-900">
          {totalLitros.toFixed(3).replace('.', ',')} L
        </p>
      </div>

      <div className="rounded-lg border border-surface-border bg-surface-card p-4">
        <p className="text-xs font-medium uppercase tracking-wide text-primary-500">
          Custo Total
        </p>
        <p className="mt-1 text-lg font-bold tabular-nums text-danger">
          {formatBRL(totalValorCentavos)}
        </p>
        <p className="mt-0.5 text-xs tabular-nums text-primary-500">
          Media: R$ {precoMedioLitro.toFixed(3).replace('.', ',')}/L
        </p>
      </div>
    </div>
  );
}
