/**
 * Types for the Usuario (user management) domain.
 * Story 1.6 — Gestao de Usuarios e Perfis
 *
 * The canonical Usuario interface lives in types/database.ts.
 * This file re-exports it and adds domain-specific derived types.
 */

export type { UsuarioRole, Usuario } from '@/types/database';

export interface UsuarioListItem {
  id: string;
  nome: string;
  email: string;
  role: 'dono' | 'motorista' | 'admin';
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
  role: 'dono' | 'motorista' | 'admin';
}

export interface ToggleUsuarioAtivoInput {
  usuario_id: string;
  ativo: boolean;
}

export interface UpdateUsuarioProfileInput {
  nome: string;
  telefone: string | null;
}
