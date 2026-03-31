'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { requireRole } from '@/lib/auth/get-user-role';
import type {
  InviteUsuarioInput,
  UpdateUsuarioRoleInput,
  ToggleUsuarioAtivoInput,
  UsuarioListItem,
} from '@/types/usuario';

/**
 * List all usuarios for the current user's empresa.
 * Requires role: dono or admin.
 */
export async function listUsuarios(): Promise<{
  data: UsuarioListItem[] | null;
  error: string | null;
}> {
  try {
    await requireRole(['dono', 'admin']);
  } catch (err) {
    return {
      data: null,
      error: err instanceof Error ? err.message : 'Permissão insuficiente',
    };
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from('usuario')
    .select('id, nome, email, role, ativo, created_at')
    .order('created_at', { ascending: true });

  if (error) {
    return { data: null, error: error.message };
  }

  return { data: data as UsuarioListItem[], error: null };
}

/**
 * Invite a new user to the empresa via Supabase Auth Invite.
 * Requires role: dono or admin.
 * Only admin and motorista roles can be invited (dono cannot be invited).
 */
export async function inviteUsuario(
  input: InviteUsuarioInput,
): Promise<{ error: string | null }> {
  let currentUsuario;
  try {
    currentUsuario = await requireRole(['dono', 'admin']);
  } catch (err) {
    return {
      error: err instanceof Error ? err.message : 'Permissão insuficiente',
    };
  }

  if (!['admin', 'motorista'].includes(input.role)) {
    return { error: 'Role invalido para convite. Use admin ou motorista.' };
  }

  // Gestor (admin) can only invite motorista, not other gestores
  if (currentUsuario.role === 'admin' && input.role !== 'motorista') {
    return { error: 'Gestores podem convidar apenas motoristas.' };
  }

  if (!input.email || !input.nome) {
    return { error: 'Email e nome são obrigatórios.' };
  }

  const adminClient = createAdminClient();

  // Invite user via Supabase Auth (sends email with magic link)
  const { error: inviteError } =
    await adminClient.auth.admin.inviteUserByEmail(input.email, {
      redirectTo: `${process.env.NEXT_PUBLIC_SITE_URL || ''}/aceitar-convite`,
      data: {
        empresa_id: currentUsuario.empresa_id,
        role: input.role,
        nome: input.nome,
      },
    });

  if (inviteError) {
    return { error: inviteError.message };
  }

  revalidatePath('/usuarios');
  return { error: null };
}

/**
 * Update a user's role.
 * Requires role: dono.
 * Cannot change own role. Cannot change to 'dono'.
 */
export async function updateUsuarioRole(
  input: UpdateUsuarioRoleInput,
): Promise<{ error: string | null }> {
  let currentUsuario;
  try {
    currentUsuario = await requireRole(['dono']);
  } catch (err) {
    return {
      error: err instanceof Error ? err.message : 'Permissão insuficiente',
    };
  }

  if (input.usuario_id === currentUsuario.id) {
    return { error: 'Não é permitido alterar o próprio role.' };
  }

  if (input.role === 'dono') {
    return { error: 'Não é permitido promover outro usuário a dono.' };
  }

  const supabase = await createClient();

  // Verify the target user belongs to the same empresa
  const { data: targetUser, error: fetchError } = await supabase
    .from('usuario')
    .select('id, empresa_id')
    .eq('id', input.usuario_id)
    .single();

  if (fetchError || !targetUser) {
    return { error: 'Usuario não encontrado.' };
  }

  if (targetUser.empresa_id !== currentUsuario.empresa_id) {
    return { error: 'Usuário não pertence à sua empresa.' };
  }

  const { error: updateError } = await supabase
    .from('usuario')
    .update({ role: input.role })
    .eq('id', input.usuario_id);

  if (updateError) {
    return { error: updateError.message };
  }

  revalidatePath('/usuarios');
  return { error: null };
}

/**
 * Toggle a user's active status.
 * Requires role: dono or admin.
 * Cannot deactivate yourself. Cannot deactivate a dono.
 */
export async function toggleUsuarioAtivo(
  input: ToggleUsuarioAtivoInput,
): Promise<{ error: string | null }> {
  let currentUsuario;
  try {
    currentUsuario = await requireRole(['dono', 'admin']);
  } catch (err) {
    return {
      error: err instanceof Error ? err.message : 'Permissão insuficiente',
    };
  }

  if (input.usuario_id === currentUsuario.id) {
    return { error: 'Não é permitido desativar a si mesmo.' };
  }

  const supabase = await createClient();

  // Check if target is a dono
  const { data: targetUser, error: fetchError } = await supabase
    .from('usuario')
    .select('id, role, empresa_id')
    .eq('id', input.usuario_id)
    .single();

  if (fetchError || !targetUser) {
    return { error: 'Usuario não encontrado.' };
  }

  if (targetUser.empresa_id !== currentUsuario.empresa_id) {
    return { error: 'Usuário não pertence à sua empresa.' };
  }

  if (targetUser.role === 'dono') {
    return { error: 'Não é permitido desativar o dono da empresa.' };
  }

  // Gestor (admin) can only toggle motorista users, not other gestores
  if (currentUsuario.role === 'admin' && targetUser.role !== 'motorista') {
    return { error: 'Apenas o proprietario pode alterar gestores.' };
  }

  const { error: updateError } = await supabase
    .from('usuario')
    .update({ ativo: input.ativo })
    .eq('id', input.usuario_id);

  if (updateError) {
    return { error: updateError.message };
  }

  revalidatePath('/usuarios');
  return { error: null };
}
