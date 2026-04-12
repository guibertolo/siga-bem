/**
 * Pure business functions for Fechamento (settlement) domain.
 * Extracted from server actions for testability.
 *
 * CRITICAL (CON-003): All monetary values are INTEGER centavos.
 * R$ 150,00 = 15000 centavos. NEVER use float/NUMERIC.
 */

import type { FechamentoStatus } from '@/types/database';
import { FECHAMENTO_STATUS_TRANSITIONS } from '@/types/fechamento';

// ---------------------------------------------------------------------------
// Calculation helpers
// ---------------------------------------------------------------------------

/**
 * Calculate valor_motorista from a viagem's total and payment percentage.
 * Used in preview, create, and viagens pendentes flows.
 *
 * @param valorTotal - viagem total in centavos (integer)
 * @param percentual - payment percentage (e.g. 70 for 70%)
 * @returns valor_motorista in centavos (integer, rounded)
 */
export function calcularValorMotorista(
  valorTotal: number,
  percentual: number,
): number {
  return Math.round((valorTotal * percentual) / 100);
}

/**
 * Sum all item values from a fechamento.
 * Generic: works for viagem items, gasto items, or any { valor: number }[].
 *
 * @param items - array of objects with valor in centavos
 * @returns total in centavos (integer)
 */
export function calcularTotalItens(
  items: ReadonlyArray<{ valor: number }>,
): number {
  return items.reduce((acc, item) => acc + item.valor, 0);
}

/**
 * Calculate saldo_motorista = total_viagens - total_gastos.
 * Can be negative (motorista owes more than earned).
 *
 * @param totalViagens - total viagens in centavos
 * @param totalGastos - total gastos in centavos
 * @returns saldo in centavos (integer)
 */
export function calcularSaldoMotorista(
  totalViagens: number,
  totalGastos: number,
): number {
  return totalViagens - totalGastos;
}

// ---------------------------------------------------------------------------
// Status transition validation
// ---------------------------------------------------------------------------

/**
 * Validate whether a status transition is allowed.
 *
 * Valid transitions:
 *   aberto  -> fechado
 *   fechado -> pago
 *   fechado -> aberto (reopen)
 *   pago    -> (none, terminal)
 *
 * @param de - current status
 * @param para - desired status
 * @returns true if the transition is valid
 */
export function validarTransicaoStatus(
  de: FechamentoStatus,
  para: FechamentoStatus,
): boolean {
  const transicoes = FECHAMENTO_STATUS_TRANSITIONS[de];
  if (!transicoes) return false;
  return transicoes.includes(para);
}

// ---------------------------------------------------------------------------
// Grouping helpers
// ---------------------------------------------------------------------------

export interface GastoAgrupavel {
  viagem_id: string | null;
  valor: number; // centavos
}

/**
 * Group gastos by viagem_id and sum their values.
 * Used in getViagensPendentesAcerto to calculate totalDespesas per viagem.
 *
 * @param gastos - array of gastos with viagem_id and valor
 * @returns Map<viagem_id, total_despesas_centavos>
 */
export function agruparDespesasPorViagem(
  gastos: ReadonlyArray<GastoAgrupavel>,
): Map<string, number> {
  const mapa = new Map<string, number>();
  for (const g of gastos) {
    if (g.viagem_id) {
      mapa.set(g.viagem_id, (mapa.get(g.viagem_id) ?? 0) + g.valor);
    }
  }
  return mapa;
}

// ---------------------------------------------------------------------------
// Period helpers
// ---------------------------------------------------------------------------

/**
 * Check if two date ranges overlap.
 * Used to prevent creating fechamentos with overlapping periods
 * for the same motorista.
 *
 * @param inicio1 - start of range 1 (YYYY-MM-DD)
 * @param fim1 - end of range 1 (YYYY-MM-DD)
 * @param inicio2 - start of range 2 (YYYY-MM-DD)
 * @param fim2 - end of range 2 (YYYY-MM-DD)
 * @returns true if the ranges overlap
 */
export function periodosOverlap(
  inicio1: string,
  fim1: string,
  inicio2: string,
  fim2: string,
): boolean {
  return inicio1 <= fim2 && inicio2 <= fim1;
}

/**
 * Validate that periodo_fim >= periodo_inicio.
 *
 * @param inicio - start date (YYYY-MM-DD)
 * @param fim - end date (YYYY-MM-DD)
 * @returns true if the period is valid
 */
export function validarPeriodo(inicio: string, fim: string): boolean {
  return fim >= inicio;
}
