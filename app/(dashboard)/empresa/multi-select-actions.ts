'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import { getCurrentUsuario } from '@/lib/auth/get-user-role';

/**
 * Set selected empresas for consolidated multi-empresa view.
 * Only dono/admin can activate multi-empresa mode.
 * Validates that all empresa IDs belong to the authenticated user.
 */
export async function setSelectedEmpresas(
  empresaIds: string[],
): Promise<{ success: boolean; error?: string }> {
  const usuario = await getCurrentUsuario();
  if (!usuario) {
    return { success: false, error: 'Nao autenticado' };
  }

  if (!['dono', 'admin'].includes(usuario.role)) {
    return { success: false, error: 'Apenas dono ou admin pode ativar modo multi-empresa' };
  }

  if (!empresaIds || empresaIds.length < 2) {
    return { success: false, error: 'Selecione pelo menos 2 empresas para o modo consolidado' };
  }

  const supabase = await createClient();

  // Validate all IDs belong to the user via usuario_empresa
  const { data: bindings } = await supabase
    .from('usuario_empresa')
    .select('empresa_id')
    .eq('usuario_id', usuario.id)
    .eq('ativo', true)
    .in('empresa_id', empresaIds);

  const validIds = new Set((bindings ?? []).map((b) => b.empresa_id));
  const invalidIds = empresaIds.filter((id) => !validIds.has(id));

  if (invalidIds.length > 0) {
    return { success: false, error: 'Empresas invalidas selecionadas' };
  }

  const { error } = await supabase
    .from('usuario')
    .update({ selected_empresas: empresaIds })
    .eq('id', usuario.id);

  if (error) {
    return { success: false, error: 'Erro ao salvar selecao de empresas' };
  }

  revalidatePath('/', 'layout');
  return { success: true };
}

/**
 * Clear selected empresas — return to single empresa mode.
 */
export async function clearSelectedEmpresas(): Promise<{
  success: boolean;
  error?: string;
}> {
  const usuario = await getCurrentUsuario();
  if (!usuario) {
    return { success: false, error: 'Nao autenticado' };
  }

  const supabase = await createClient();

  const { error } = await supabase
    .from('usuario')
    .update({ selected_empresas: null })
    .eq('id', usuario.id);

  if (error) {
    return { success: false, error: 'Erro ao limpar selecao de empresas' };
  }

  revalidatePath('/', 'layout');
  return { success: true };
}

/**
 * Get the user's selected empresas from the database.
 * Returns empty array if not in multi-empresa mode.
 */
export async function getSelectedEmpresas(): Promise<string[]> {
  const usuario = await getCurrentUsuario();
  if (!usuario) return [];

  const supabase = await createClient();

  const { data } = await supabase
    .from('usuario')
    .select('selected_empresas')
    .eq('id', usuario.id)
    .single();

  if (!data?.selected_empresas) return [];
  return data.selected_empresas as string[];
}
