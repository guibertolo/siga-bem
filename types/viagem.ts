import type { ViagemStatus } from '@/types/database';

/**
 * Viagem entity as stored in the database.
 * Matches the `viagem` table schema exactly.
 */
export interface Viagem {
  id: string;
  empresa_id: string;
  motorista_id: string;
  caminhao_id: string;
  origem: string;
  destino: string;
  data_saida: string;
  data_chegada_prevista: string | null;
  data_chegada_real: string | null;
  valor_total: number;           // centavos
  percentual_pagamento: number;  // e.g. 25.50
  status: ViagemStatus;
  km_estimado: number | null;    // Story 3.3: estimated distance in km (manual input)
  km_saida: number | null;
  km_chegada: number | null;
  observacao: string | null;
  editavel_motorista: boolean;
  created_by: string | null;
  created_at: string;
  updated_at: string;
  // joins
  motorista?: { nome: string };
  caminhao?: { placa: string; modelo: string; capacidade_veiculos: number };
}

/**
 * Form data for creating/editing a viagem.
 * String types for monetary/percentage inputs (UI masks).
 */
export interface ViagemFormData {
  motorista_id: string;
  caminhao_id: string;
  origem: string;
  destino: string;
  data_saida: string;
  data_chegada_prevista: string;
  valor_total: string;            // string for BRL mask, convert to centavos before save
  percentual_pagamento: string;   // string for input, convert to number
  km_estimado: string;            // Story 3.3: estimated distance in km (manual input, CON-006)
  km_saida: string;
  observacao: string;
}

/**
 * Form data for updating status (separate from full edit).
 */
export interface ViagemStatusUpdateData {
  status: ViagemStatus;
  data_chegada_real?: string;
  km_chegada?: number;
}

/**
 * Server action response for viagem operations.
 */
export interface ViagemActionResult {
  success: boolean;
  error?: string;
  fieldErrors?: Partial<Record<keyof ViagemFormData, string>>;
  viagem?: Viagem;
}

/**
 * List item for viagem display in tables.
 */
export interface ViagemListItem {
  id: string;
  motorista_id: string;
  origem: string;
  destino: string;
  motorista_nome: string;
  caminhao_placa: string;
  data_saida: string;
  valor_total: number;           // centavos
  percentual_pagamento: number;
  status: ViagemStatus;
}

/**
 * Status label mapping for display.
 */
export const VIAGEM_STATUS_LABELS: Record<ViagemStatus, string> = {
  planejada: 'Planejada',
  em_andamento: 'Em Viagem',
  concluida: 'Concluida',
  cancelada: 'Cancelada',
};

/**
 * Status color mapping for badges (Tailwind classes).
 */
export const VIAGEM_STATUS_COLORS: Record<ViagemStatus, string> = {
  planejada: 'bg-blue-100 text-blue-800',
  em_andamento: 'bg-yellow-100 text-yellow-800',
  concluida: 'bg-green-100 text-green-800',
  cancelada: 'bg-red-100 text-red-800',
};

/**
 * Valid status transitions.
 * planejada -> em_andamento | cancelada
 * em_andamento -> concluida
 * concluida -> (none)
 * cancelada -> (none)
 */
export const VIAGEM_STATUS_TRANSITIONS: Record<ViagemStatus, ViagemStatus[]> = {
  planejada: ['em_andamento', 'cancelada'],
  em_andamento: ['concluida'],
  concluida: [],
  cancelada: [],
};

/**
 * All viagem status values for iteration.
 */
export const VIAGEM_STATUS_OPTIONS: ViagemStatus[] = [
  'planejada',
  'em_andamento',
  'concluida',
  'cancelada',
];
