'use server';

import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';

export async function sendMagicLink(formData: FormData) {
  const supabase = await createClient();

  const email = formData.get('email') as string;

  const { error } = await supabase.auth.signInWithOtp({
    email,
    options: {
      emailRedirectTo: `${process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000'}/auth/callback`,
    },
  });

  if (error) {
    return { error: error.message };
  }

  return { success: true };
}

export async function solicitarResetSenha(formData: FormData) {
  const supabase = await createClient();
  const email = formData.get('email') as string;

  if (!email) {
    return { error: 'Informe o email' };
  }

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000';

  // Always return success to prevent user enumeration (AC 6)
  await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${siteUrl}/auth/reset-password`,
  });

  return { success: true };
}

export async function signInWithPassword(formData: FormData) {
  const supabase = await createClient();

  const email = formData.get('email') as string;
  const password = formData.get('password') as string;

  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) {
    return { error: error.message };
  }

  // Story 8.6 — Redirect to forced password change if flag is set
  // Skip test accounts (@frotaviva.com.br)
  const user = data.user;
  if (
    user?.user_metadata?.must_change_password === true &&
    !user.email?.endsWith('@frotaviva.com.br')
  ) {
    redirect('/trocar-senha');
  }

  redirect('/dashboard');
}
