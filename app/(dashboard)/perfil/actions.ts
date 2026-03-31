'use server';

import { createClient } from '@/lib/supabase/server';
import { getCurrentUsuario } from '@/lib/auth/get-user-role';

export async function alterarSenha(formData: FormData) {
  const supabase = await createClient();
  const usuario = await getCurrentUsuario();

  if (!usuario) {
    return { error: 'Não autenticado' };
  }

  const senhaAtual = formData.get('senha_atual') as string;
  const novaSenha = formData.get('nova_senha') as string;
  const confirmarSenha = formData.get('confirmar_senha') as string;

  if (!senhaAtual || !novaSenha || !confirmarSenha) {
    return { error: 'Preencha todos os campos' };
  }

  if (novaSenha.length < 8) {
    return { error: 'A senha deve ter pelo menos 8 caracteres' };
  }

  if (novaSenha !== confirmarSenha) {
    return { error: 'As senhas não coincidem' };
  }

  // Verify current password by attempting sign-in
  const { error: signInError } = await supabase.auth.signInWithPassword({
    email: usuario.email,
    password: senhaAtual,
  });

  if (signInError) {
    return { error: 'Senha atual incorreta' };
  }

  // Update to new password
  const { error: updateError } = await supabase.auth.updateUser({
    password: novaSenha,
  });

  if (updateError) {
    return { error: updateError.message };
  }

  return { success: true };
}

export async function atualizarPerfil(formData: FormData) {
  const supabase = await createClient();
  const usuario = await getCurrentUsuario();

  if (!usuario) {
    return { error: 'Não autenticado' };
  }

  // REGRA CRITICA: motorista NAO pode alterar dados cadastrais
  if (usuario.role === 'motorista') {
    return { error: 'Motoristas não podem alterar dados cadastrais' };
  }

  const nome = formData.get('nome') as string;
  const telefone = formData.get('telefone') as string;

  if (!nome || nome.trim().length === 0) {
    return { error: 'Nome é obrigatório' };
  }

  const { error } = await supabase
    .from('usuario')
    .update({
      nome: nome.trim(),
      telefone: telefone?.trim() || null,
    })
    .eq('auth_id', usuario.auth_id);

  if (error) {
    return { error: error.message };
  }

  return { success: true };
}
