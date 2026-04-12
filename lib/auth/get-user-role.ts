'use server';

import { cache } from 'react';
import { createClient } from '@/lib/supabase/server';
import type { UsuarioRole, Usuario } from '@/types/usuario';

/**
 * Get the role of the currently authenticated user.
 * Returns null if not authenticated or no usuario record found.
 */
export async function getUserRole(): Promise<UsuarioRole | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  const { data } = await supabase
    .from('usuario')
    .select('role')
    .eq('auth_id', user.id)
    .single();

  return (data?.role as UsuarioRole) ?? null;
}

/**
 * Get the full usuario record for the currently authenticated user.
 * Returns null if not authenticated or no usuario record found.
 *
 * Wrapped with React.cache() to deduplicate calls within the same
 * server request (e.g. layout + page both calling getCurrentUsuario).
 */
/**
 * Internal cached fetch: returns both the Supabase auth user and the usuario record.
 * Used by getCurrentUsuario() and getAuthUser() to avoid duplicate getUser() calls.
 */
const _fetchCurrentUser = cache(async () => {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { authUser: null, usuario: null };

  const { data } = await supabase
    .from('usuario')
    .select('id, auth_id, empresa_id, motorista_id, nome, email, telefone, role, ativo, selected_empresas, created_at, updated_at')
    .eq('auth_id', user.id)
    .single();

  return { authUser: user, usuario: (data as Usuario) ?? null };
});

export const getCurrentUsuario = cache(async (): Promise<Usuario | null> => {
  const { usuario } = await _fetchCurrentUser();
  return usuario;
});

/**
 * Get the Supabase auth user (for metadata like onboarding state).
 * Shares the same cached fetch as getCurrentUsuario — no extra round trip.
 */
export const getAuthUser = cache(async () => {
  const { authUser } = await _fetchCurrentUser();
  return authUser;
});

/**
 * Check if the current user has one of the allowed roles.
 */
export async function requireRole(
  allowedRoles: UsuarioRole[],
): Promise<Usuario> {
  const usuario = await getCurrentUsuario();

  if (!usuario) {
    throw new Error('Não autenticado');
  }

  if (!allowedRoles.includes(usuario.role)) {
    throw new Error('Permissão insuficiente');
  }

  if (!usuario.ativo) {
    throw new Error('Usuario desativado');
  }

  return usuario;
}
