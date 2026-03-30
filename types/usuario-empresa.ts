/**
 * Types for the UsuarioEmpresa (multi-empresa binding) domain.
 * Story 7.1 — Migration e Tabela usuario_empresa
 */

import type { UsuarioRole } from '@/types/usuario';

export interface UsuarioEmpresa {
  id: string;
  usuario_id: string;
  empresa_id: string;
  role: UsuarioRole;
  ativo: boolean;
  created_at: string;
  updated_at: string;
}

/**
 * Return type of fn_get_user_empresas() RPC.
 */
export interface UsuarioEmpresaComEmpresa {
  empresa_id: string;
  razao_social: string;
  nome_fantasia: string | null;
  cnpj: string;
  role: UsuarioRole;
  is_active: boolean;
}
