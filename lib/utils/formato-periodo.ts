/**
 * Period formatting utilities for fechamento display.
 * Story 4.3 — AC3: Periodo formatado (ex: "Mar 2026" para mensal, "01/03 - 07/03" para semanal).
 */

import type { FechamentoTipo } from '@/types/database';

/**
 * Format a fechamento period for display.
 *
 * - Mensal: "mar. 2026"
 * - Semanal: "01/03 - 07/03"
 *
 * @param inicio - Period start date (YYYY-MM-DD)
 * @param fim - Period end date (YYYY-MM-DD)
 * @param tipo - Fechamento type (mensal or semanal)
 * @returns Formatted period string
 */
export function formatarPeriodoFechamento(
  inicio: string,
  fim: string,
  tipo: FechamentoTipo,
): string {
  // Use T12:00:00 to avoid timezone issues with date-only strings
  const dataInicio = new Date(inicio + 'T12:00:00');
  const dataFim = new Date(fim + 'T12:00:00');

  if (tipo === 'mensal') {
    return dataInicio.toLocaleDateString('pt-BR', {
      month: 'short',
      year: 'numeric',
    });
  }

  // Semanal: "01/03 - 07/03"
  const inicioFormatado = dataInicio.toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
  });
  const fimFormatado = dataFim.toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
  });

  return `${inicioFormatado} - ${fimFormatado}`;
}

/**
 * Format a date range as short display text.
 * Example: "1/04 - 30/04"
 * Story 23.4 — AC5 sub-text for period buttons.
 */
export function formatarRangeCurto(inicio: Date, fim: Date): string {
  const inicioStr = `${inicio.getDate()}/${String(inicio.getMonth() + 1).padStart(2, '0')}`;
  const fimStr = `${fim.getDate()}/${String(fim.getMonth() + 1).padStart(2, '0')}`;
  return `${inicioStr} - ${fimStr}`;
}
