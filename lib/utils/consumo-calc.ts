/**
 * Average fuel consumption calculator for trucks.
 * Story 3.3 — Estimativa de Custo e Precificacao de Viagem (AC6)
 *
 * Calculates average km/l from expense records of category "Combustivel"
 * with km_registro filled. Falls back to default 3.0 km/l for cegonheiro.
 *
 * MVP Note: Exact km/l calculation from expenses requires knowing liters
 * purchased (not just value). For MVP, returns default value 3.0 km/l
 * with fonte 'padrao'. The function is extensible for future enhancement
 * when a 'litros' field is added to the gasto table.
 */

import { CONSUMO_PADRAO_KM_L } from '@/types/precificacao';

interface ConsumoResult {
  kmL: number;
  fonte: 'historico' | 'padrao';
}

/**
 * Calculate average fuel consumption for a truck based on expense history.
 *
 * Queries fuel expenses with km_registro from the last 6 months.
 * If fewer than 2 records have km data, returns default (3.0 km/l).
 *
 * @param caminhaoId - Truck UUID
 * @param supabase - Supabase client instance
 * @returns { kmL: number, fonte: 'historico' | 'padrao' }
 */
export async function calcularConsumoMedio(
  _caminhaoId: string,
  _supabase: unknown,
): Promise<ConsumoResult> {
  // MVP: Return default consumption for cegonheiro.
  // Future enhancement: calculate from fuel expense records when
  // a 'litros' field is added to the gasto table.
  //
  // The calculation logic would:
  // 1. Query gastos of category 'Combustivel' with km_registro != null
  // 2. Order by date ascending
  // 3. Calculate delta km between consecutive fuel stops
  // 4. Divide delta km by liters purchased
  // 5. Average across all intervals
  return { kmL: CONSUMO_PADRAO_KM_L, fonte: 'padrao' };
}
