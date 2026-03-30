/**
 * Types for multi-empresa features (Stories 7.2 + 7.3).
 * Represents the shape returned by fn_get_user_empresas() RPC.
 */

import type { UsuarioRole } from '@/types/usuario';

export interface UserEmpresa {
  empresa_id: string;
  razao_social: string;
  nome_fantasia: string | null;
  cnpj: string;
  role: UsuarioRole;
  is_active: boolean;
  empresa_ativa: boolean;
}

export interface SwitchEmpresaResult {
  success: boolean;
  error?: string;
}

/**
 * Role display labels for the UI (Portuguese).
 */
export const ROLE_LABELS: Record<UsuarioRole, string> = {
  dono: 'Dono',
  admin: 'Gestor',
  motorista: 'Motorista',
} as const;
