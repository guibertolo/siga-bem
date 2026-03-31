'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import type { SwitchEmpresaResult } from '@/types/empresa-multi';

/**
 * Server action: switch the authenticated user's active empresa.
 * Calls fn_switch_empresa() RPC which validates the binding and updates usuario.empresa_id.
 *
 * @param empresaId - UUID of the target empresa
 * @param redirectTo - Path to redirect after switch (defaults to /dashboard)
 */
export async function switchEmpresa(
  empresaId: string,
  redirectTo?: string,
): Promise<SwitchEmpresaResult> {
  const supabase = await createClient();

  // Verify authentication
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    return { success: false, error: 'Usuário não autenticado' };
  }

  // Call the SQL function that validates binding + switches empresa
  const { error } = await supabase.rpc('fn_switch_empresa', {
    p_empresa_id: empresaId,
  });

  if (error) {
    return {
      success: false,
      error: error.message.includes('vinculo')
        ? 'Você não possui vinculo ativo com esta empresa.'
        : 'Erro ao trocar empresa. Tente novamente.',
    };
  }

  // Invalidate all cached data since empresa context changed
  revalidatePath('/');

  // Redirect to target page
  redirect(redirectTo ?? '/dashboard');
}
