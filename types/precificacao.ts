/**
 * Types for the Precificacao (pricing/cost estimation) domain.
 * Story 3.3 — Estimativa de Custo e Precificacao de Viagem
 *
 * CRITICAL (CON-003): All monetary values are INTEGER centavos.
 * R$ 6,50/l = 650 centavos. NEVER use float for money.
 */

/**
 * Result of a trip cost estimation calculation.
 * All monetary fields in centavos.
 */
export interface EstimativaViagem {
  km_estimado: number;
  consumo_medio_km_l: number;
  consumo_fonte: 'historico' | 'padrao';
  preco_diesel_centavos: number;
  preco_diesel_fonte: 'tabela' | 'manual' | 'padrao';
  custo_combustivel_centavos: number;
  margem_bruta_centavos: number;
  margem_percentual: number;
}

/**
 * Combustivel preco entity as stored in the database.
 * Matches the `combustivel_preco` table schema.
 */
export interface CombustivelPreco {
  id: string;
  empresa_id: string;
  regiao: string;
  tipo: CombustivelTipo;
  preco_centavos: number;
  data_referencia: string;
  fonte: string | null;
  ativo: boolean;
  created_at: string;
  updated_at: string;
}

/**
 * Combustivel tipo enum matching the database enum.
 */
export type CombustivelTipo = 'diesel_s10' | 'diesel_comum';

/**
 * All combustivel tipo options for UI selects.
 */
export const COMBUSTIVEL_TIPO_OPTIONS: CombustivelTipo[] = [
  'diesel_s10',
  'diesel_comum',
];

/**
 * Labels for combustivel tipo display.
 */
export const COMBUSTIVEL_TIPO_LABELS: Record<CombustivelTipo, string> = {
  diesel_s10: 'Diesel S10',
  diesel_comum: 'Diesel Comum',
};

/**
 * Form data for creating/editing a combustivel preco.
 */
export interface CombustivelPrecoFormData {
  regiao: string;
  tipo: CombustivelTipo;
  preco: string;
  data_referencia: string;
  fonte: string;
}

/**
 * Server action response for combustivel preco operations.
 */
export interface CombustivelPrecoActionResult {
  success: boolean;
  error?: string;
  fieldErrors?: Partial<Record<keyof CombustivelPrecoFormData, string>>;
  preco?: CombustivelPreco;
}

/**
 * Default fuel consumption for cegonheiro trucks (km/l).
 * Used as fallback when no historical data available.
 */
export const CONSUMO_PADRAO_KM_L = 3.0;

/**
 * Default diesel price in centavos (R$ 6,50/l = 650 centavos).
 * Used as fallback when no price configured.
 */
export const PRECO_DIESEL_PADRAO_CENTAVOS = 650;
