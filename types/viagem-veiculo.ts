/**
 * ViagemVeiculo — vehicle transported on a trip.
 * Matches the `viagem_veiculo` table schema.
 */
export interface ViagemVeiculo {
  id: string;
  empresa_id: string;
  viagem_id: string;
  marca: string | null;
  modelo: string;
  placa: string | null;
  chassi: string | null;
  cor: string | null;
  observacao: string | null;
  posicao: number | null;
  created_at: string;
  updated_at: string;
}

/**
 * Form data for creating/editing a viagem veiculo.
 * Excludes server-managed fields (id, empresa_id, viagem_id, timestamps).
 */
export interface ViagemVeiculoFormData {
  modelo: string;
  marca?: string;
  placa?: string;
  chassi?: string;
  cor?: string;
  posicao?: number | null;
  observacao?: string;
}

/**
 * Server action response for viagem veiculo operations.
 */
export interface ViagemVeiculoActionResult {
  success: boolean;
  error?: string;
  fieldErrors?: Partial<Record<keyof ViagemVeiculoFormData, string>>;
  veiculo?: ViagemVeiculo;
}

/**
 * Placa validation regex patterns.
 */
const PLACA_ANTIGA = /^[A-Z]{3}-?\d{4}$/;
const PLACA_MERCOSUL = /^[A-Z]{3}\d[A-Z]\d{2}$/;

/**
 * Validates a placa string against both Brazilian formats.
 * Returns true if valid or empty (placa is optional).
 */
export function isPlacaValida(placa: string): boolean {
  const upper = placa.toUpperCase().replace(/\s/g, '');
  if (upper.length === 0) return true;
  return PLACA_ANTIGA.test(upper) || PLACA_MERCOSUL.test(upper);
}
