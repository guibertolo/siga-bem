'use server';

import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import type { UsuarioRole } from '@/types/usuario';

/**
 * Complete the invitation acceptance flow.
 * Called after the user sets their password via Supabase Auth.
 * Creates the usuario record linking auth_id to empresa.
 */
export async function completeInviteAcceptance(): Promise<{
  error: string | null;
}> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: 'Nao autenticado. Faça login novamente.' };
  }

  // Check if usuario record already exists
  const adminClient = createAdminClient();
  const { data: existingUsuario } = await adminClient
    .from('usuario')
    .select('id')
    .eq('auth_id', user.id)
    .single();

  if (existingUsuario) {
    // Already has a record, redirect to dashboard
    redirect('/dashboard');
  }

  // Extract invitation metadata from user's app_metadata
  const metadata = user.user_metadata;
  const empresaId = metadata?.empresa_id as string | undefined;
  const role = metadata?.role as UsuarioRole | undefined;
  const nome = metadata?.nome as string | undefined;

  if (!empresaId || !role || !nome) {
    return {
      error:
        'Dados do convite incompletos. Solicite um novo convite ao administrador.',
    };
  }

  // Create usuario record (using admin client to bypass RLS for first insert)
  const { error: insertError } = await adminClient.from('usuario').insert({
    auth_id: user.id,
    empresa_id: empresaId,
    nome: nome,
    email: user.email ?? '',
    role: role,
    ativo: true,
  });

  if (insertError) {
    return { error: `Erro ao criar perfil: ${insertError.message}` };
  }

  redirect('/dashboard');
}
