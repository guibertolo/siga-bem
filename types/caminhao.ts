import type { TipoCegonha } from '@/types/database';

/**
 * Caminhao entity as stored in the database.
 * Matches the `caminhao` table schema exactly.
 */
export interface Caminhao {
  id: string;
  empresa_id: string;
  placa: string;
  modelo: string;
  marca: string | null;
  ano: number | null;
  renavam: string | null;
  tipo_cegonha: TipoCegonha;
  capacidade_veiculos: number;
  km_atual: number;
  ativo: boolean;
  observacao: string | null;
  created_at: string;
  updated_at: string;
}

/**
 * Form data for creating/editing a caminhao.
 * Excludes server-managed fields (id, empresa_id, ativo, timestamps).
 */
export interface CaminhaoFormData {
  placa: string;
  modelo: string;
  marca: string;
  ano: string;
  renavam: string;
  tipo_cegonha: TipoCegonha;
  capacidade_veiculos: string;
  km_atual: string;
  observacao: string;
}

/**
 * Server action response for caminhao operations.
 */
export interface CaminhaoActionResult {
  success: boolean;
  error?: string;
  fieldErrors?: Partial<Record<keyof CaminhaoFormData, string>>;
  caminhao?: Caminhao;
}

/**
 * Labels for tipo_cegonha enum values.
 */
export const TIPO_CEGONHA_OPTIONS = [
  { value: 'aberta' as const, label: 'Aberta' },
  { value: 'fechada' as const, label: 'Fechada' },
] as const;
