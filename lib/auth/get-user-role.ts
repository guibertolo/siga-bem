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
export const getCurrentUsuario = cache(async (): Promise<Usuario | null> => {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  const { data } = await supabase
    .from('usuario')
    .select('id, auth_id, empresa_id, motorista_id, nome, email, telefone, role, ativo, selected_empresas, created_at, updated_at')
    .eq('auth_id', user.id)
    .single();

  return (data as Usuario) ?? null;
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
