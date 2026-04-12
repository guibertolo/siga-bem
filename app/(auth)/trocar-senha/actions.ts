'use server';

import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { logError } from '@/lib/observability/logger';

/**
 * Server action: force password change on first login.
 * Updates the password and clears the must_change_password flag.
 *
 * Story 8.6
 */
export async function forcarTrocaSenha(novaSenha: string): Promise<{ error?: string }> {
  if (!novaSenha || novaSenha.length < 8) {
    return { error: 'A senha deve ter no mínimo 8 caracteres' };
  }

  const supabase = await createClient();

  // Verify user is authenticated
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: 'Sessao expirada. Faca login novamente.' };
  }

  // Update password and clear the flag
  const { error } = await supabase.auth.updateUser({
    password: novaSenha,
    data: { must_change_password: false },
  });

  if (error) {
    logError({ action: 'forcarTrocaSenha', usuarioId: user.id }, error);
    return { error: `Erro ao alterar senha: ${error.message}` };
  }

  redirect('/dashboard');
}
