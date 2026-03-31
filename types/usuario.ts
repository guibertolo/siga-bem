/**
 * Types for the Usuario (user management) domain.
 * Story 1.6 — Gestao de Usuarios e Perfis
 */

export type UsuarioRole = 'dono' | 'motorista' | 'admin';

export interface Usuario {
  id: string;
  auth_id: string;
  empresa_id: string | null;
  motorista_id: string | null;
  nome: string;
  email: string;
  telefone: string | null;
  role: UsuarioRole;
  ativo: boolean;
  ultima_empresa_id: string | null;
  selected_empresas: string[] | null;
  created_at: string;
  updated_at: string;
}

export interface UsuarioListItem {
  id: string;
  nome: string;
  email: string;
  role: UsuarioRole;
  ativo: boolean;
  created_at: string;
}

export interface InviteUsuarioInput {
  email: string;
  role: 'admin' | 'motorista';
  nome: string;
}

export interface UpdateUsuarioRoleInput {
  usuario_id: string;
  role: UsuarioRole;
}

export interface ToggleUsuarioAtivoInput {
  usuario_id: string;
  ativo: boolean;
}

export interface UpdateUsuarioProfileInput {
  nome: string;
  telefone: string | null;
}
