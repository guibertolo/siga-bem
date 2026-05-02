'use server';

import { redirect } from 'next/navigation';
import { getAuthUser } from '@/lib/auth/get-user-role';

/**
 * Checks if the authenticated user must change their password (first login).
 * Test accounts (@frotaviva.com.br) are always excluded.
 * Redirects to /trocar-senha if change is required.
 *
 * Story 8.6 — usa getAuthUser cacheado pra evitar round-trip extra ao Supabase.
 * Compartilha o mesmo fetch que getCurrentUsuario via React.cache().
 */
export async function checkMustChangePassword(): Promise<void> {
  const user = await getAuthUser();

  if (!user) return;

  // Skip test accounts — never force password change
  if (user.email?.endsWith('@frotaviva.com.br')) return;

  // Check the metadata flag set during account creation
  if (user.user_metadata?.must_change_password === true) {
    redirect('/trocar-senha');
  }
}
