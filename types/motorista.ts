import type { MotoristaStatus } from '@/types/database';

/**
 * CNH category enum values.
 */
export type CnhCategoria = 'A' | 'B' | 'C' | 'D' | 'E' | 'AB' | 'AC' | 'AD' | 'AE';

/**
 * Motorista entity as stored in the database.
 * Matches the `motorista` table schema exactly.
 */
export interface Motorista {
  id: string;
  empresa_id: string;
  usuario_id: string | null;
  nome: string;
  cpf: string;
  cnh_numero: string;
  cnh_categoria: CnhCategoria;
  cnh_validade: string;
  telefone: string | null;
  status: MotoristaStatus;
  observacao: string | null;
  created_at: string;
  updated_at: string;
}

/**
 * Form data for creating/editing a motorista.
 * Excludes server-managed fields (id, empresa_id, usuario_id, timestamps).
 */
export interface MotoristaFormData {
  nome: string;
  cpf: string;
  cnh_numero: string;
  cnh_categoria: CnhCategoria;
  cnh_validade: string;
  telefone: string;
  observacao: string;
}

/**
 * Server action response for motorista operations.
 */
export interface MotoristaActionResult {
  success: boolean;
  error?: string;
  fieldErrors?: Partial<Record<keyof MotoristaFormData, string>>;
  motorista?: Motorista;
}

/**
 * Motorista list item for table display.
 */
export interface MotoristaListItem {
  id: string;
  nome: string;
  cpf: string;
  cnh_numero: string;
  cnh_categoria: CnhCategoria;
  cnh_validade: string;
  telefone: string | null;
  status: MotoristaStatus;
  cnh_vencida: boolean;
  cnh_vence_em_30_dias: boolean;
}

/**
 * Form data for creating a motorista WITH account (auth user + usuario + usuario_empresa).
 * Extends MotoristaFormData with email and criar_conta flag.
 * Story 8.1 — Server Action Atomica de Cadastro Motorista com Conta
 */
export interface MotoristaComContaFormData extends MotoristaFormData {
  email: string;
  criar_conta: true;
}

/**
 * Server action response for motorista + conta creation.
 * Returns credentials on success (senha shown once, never stored in project DB).
 */
export interface MotoristaComContaActionResult {
  success: boolean;
  error?: string;
  fieldErrors?: Partial<Record<keyof MotoristaComContaFormData, string>>;
  motorista?: Motorista;
  credenciais?: {
    email: string;
    senha: string;
  };
}

/**
 * CNH category options for select inputs.
 */
export const CNH_CATEGORIA_OPTIONS = [
  { value: 'A' as const, label: 'A' },
  { value: 'B' as const, label: 'B' },
  { value: 'C' as const, label: 'C' },
  { value: 'D' as const, label: 'D' },
  { value: 'E' as const, label: 'E' },
  { value: 'AB' as const, label: 'AB' },
  { value: 'AC' as const, label: 'AC' },
  { value: 'AD' as const, label: 'AD' },
  { value: 'AE' as const, label: 'AE' },
] as const;
