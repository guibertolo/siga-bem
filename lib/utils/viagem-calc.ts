/**
 * Calculation helpers for viagem (trip) values.
 *
 * All monetary values in centavos (integers).
 */

/**
 * Calculate the motorista payment amount from total value and percentage.
 *
 * @param valorTotalCentavos - Total trip value in centavos
 * @param percentual - Payment percentage (e.g., 25.50 for 25.5%)
 * @returns Payment amount in centavos (rounded)
 */
export function calcularValorMotorista(
  valorTotalCentavos: number,
  percentual: number,
): number {
  return Math.round((valorTotalCentavos * percentual) / 100);
}

/**
 * Calculate distance traveled from km_saida and km_chegada.
 *
 * @param kmSaida - Odometer at departure
 * @param kmChegada - Odometer at arrival
 * @returns Distance in km, or null if either value is missing
 */
export function calcularDistancia(
  kmSaida?: number | null,
  kmChegada?: number | null,
): number | null {
  if (kmSaida == null || kmChegada == null) return null;
  return kmChegada - kmSaida;
}
