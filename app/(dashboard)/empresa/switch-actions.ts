'use server';

import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';
import type { UsuarioEmpresaComEmpresa } from '@/types/usuario-empresa';

/**
 * Switch the authenticated user's active empresa.
 * Calls fn_switch_empresa() which validates the binding and syncs role.
 */
export async function trocarEmpresa(empresaId: string): Promise<{ success?: boolean; error?: string }> {
  const supabase = await createClient();

  const { error } = await supabase.rpc('fn_switch_empresa', {
    p_empresa_id: empresaId,
  });

  if (error) {
    return { error: error.message };
  }

  revalidatePath('/', 'layout');
  return { success: true };
}

/**
 * Get all empresas the authenticated user is linked to.
 * Calls fn_get_user_empresas() which returns empresas with role and active flag.
 */
export async function getEmpresasDoUsuario(): Promise<{
  empresas: UsuarioEmpresaComEmpresa[];
  error?: string;
}> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return { empresas: [] };
  }

  const { data, error } = await supabase.rpc('fn_get_user_empresas');

  if (error) {
    return { empresas: [], error: error.message };
  }

  return { empresas: (data as UsuarioEmpresaComEmpresa[]) || [] };
}
