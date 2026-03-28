import type { PlanoTipo } from '@/types/database';

/**
 * Empresa entity as stored in the database.
 * Matches the `empresa` table schema exactly.
 */
export interface Empresa {
  id: string;
  cnpj: string;
  razao_social: string;
  nome_fantasia: string | null;
  endereco: string | null;
  cidade: string | null;
  estado: string | null;
  cep: string | null;
  telefone: string | null;
  email: string | null;
  plano: PlanoTipo;
  max_caminhoes: number;
  ativa: boolean;
  created_at: string;
  updated_at: string;
}

/**
 * Form data for creating/editing an empresa.
 * Excludes server-managed fields (id, plano, max_caminhoes, ativa, timestamps).
 */
export interface EmpresaFormData {
  cnpj: string;
  razao_social: string;
  nome_fantasia: string;
  endereco: string;
  cidade: string;
  estado: string;
  cep: string;
  telefone: string;
  email: string;
}

/**
 * Server action response for empresa operations.
 */
export interface EmpresaActionResult {
  success: boolean;
  error?: string;
  fieldErrors?: Partial<Record<keyof EmpresaFormData, string>>;
  empresa?: Empresa;
}

/**
 * List of Brazilian UF codes.
 */
export const UF_LIST = [
  'AC', 'AL', 'AM', 'AP', 'BA', 'CE', 'DF', 'ES', 'GO',
  'MA', 'MG', 'MS', 'MT', 'PA', 'PB', 'PE', 'PI', 'PR',
  'RJ', 'RN', 'RO', 'RR', 'RS', 'SC', 'SE', 'SP', 'TO',
] as const;

export type UF = typeof UF_LIST[number];
