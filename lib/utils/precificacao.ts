/**
 * Cost estimation and pricing calculation utilities.
 * Story 3.3 — Estimativa de Custo e Precificacao de Viagem
 *
 * CRITICAL (CON-003): All monetary values in centavos (integers).
 * Uses Math.round() to avoid floating point precision issues.
 */

import type { EstimativaViagem } from '@/types/precificacao';
import { CONSUMO_PADRAO_KM_L, PRECO_DIESEL_PADRAO_CENTAVOS } from '@/types/precificacao';

/**
 * Calculate trip cost estimation from distance, fuel consumption, and diesel price.
 *
 * Formula: custo = (km / km_l) * preco_diesel_centavos
 * Margin: valor_total - custo_combustivel
 * Margin %: (margem / valor_total) * 100
 *
 * @param kmEstimado - Estimated distance in km
 * @param consumoKmL - Average fuel consumption in km/l
 * @param precoDieselCentavos - Diesel price per liter in centavos
 * @param valorTotalCentavos - Total trip value in centavos (for margin calc)
 * @param consumoFonte - Source of consumption data
 * @param precoFonte - Source of diesel price data
 * @returns EstimativaViagem with all calculated values
 */
export function calcularEstimativa(
  kmEstimado: number,
  consumoKmL: number,
  precoDieselCentavos: number,
  valorTotalCentavos: number,
  consumoFonte: 'historico' | 'padrao' = 'padrao',
  precoFonte: 'tabela' | 'manual' | 'padrao' = 'padrao',
): EstimativaViagem {
  const safeConsumo = consumoKmL > 0 ? consumoKmL : CONSUMO_PADRAO_KM_L;
  const safePreco = precoDieselCentavos > 0 ? precoDieselCentavos : PRECO_DIESEL_PADRAO_CENTAVOS;

  const litrosNecessarios = kmEstimado / safeConsumo;
  const custoCombustivelCentavos = Math.round(litrosNecessarios * safePreco);
  const margemBrutaCentavos = valorTotalCentavos - custoCombustivelCentavos;
  const margemPercentual =
    valorTotalCentavos > 0
      ? Math.round(((margemBrutaCentavos / valorTotalCentavos) * 100) * 10) / 10
      : 0;

  return {
    km_estimado: kmEstimado,
    consumo_medio_km_l: safeConsumo,
    consumo_fonte: consumoFonte,
    preco_diesel_centavos: safePreco,
    preco_diesel_fonte: precoFonte,
    custo_combustivel_centavos: custoCombustivelCentavos,
    margem_bruta_centavos: margemBrutaCentavos,
    margem_percentual: margemPercentual,
  };
}
