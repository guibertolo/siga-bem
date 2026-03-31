'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import { getCurrentUsuario } from '@/lib/auth/get-user-role';
import { viagemVeiculoSchema } from '@/lib/validations/viagem-veiculo';
import type {
  ViagemVeiculoActionResult,
  ViagemVeiculoFormData,
  ViagemVeiculo,
} from '@/types/viagem-veiculo';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function extractFieldErrors(
  error: import('zod').ZodError,
): Partial<Record<keyof ViagemVeiculoFormData, string>> {
  const fieldErrors: Partial<Record<keyof ViagemVeiculoFormData, string>> = {};
  for (const issue of error.issues) {
    const field = issue.path[0] as keyof ViagemVeiculoFormData;
    if (!fieldErrors[field]) {
      fieldErrors[field] = issue.message;
    }
  }
  return fieldErrors;
}

/**
 * Check if viagem status allows mutation (add/edit/remove vehicles).
 * Returns error string if blocked, null if allowed.
 */
async function checkViagemEditable(
  viagemId: string,
): Promise<{ error: string | null; empresaId: string | null }> {
  const supabase = await createClient();
  const { data: viagem, error } = await supabase
    .from('viagem')
    .select('status, empresa_id')
    .eq('id', viagemId)
    .single();

  if (error || !viagem) {
    return { error: 'Viagem não encontrada', empresaId: null };
  }

  if (viagem.status === 'concluida' || viagem.status === 'cancelada') {
    return {
      error: 'Não é possível alterar veículos de viagem concluída ou cancelada',
      empresaId: null,
    };
  }

  return { error: null, empresaId: viagem.empresa_id as string };
}

// ---------------------------------------------------------------------------
// List veiculos for a viagem
// ---------------------------------------------------------------------------

export async function listVeiculosViagem(
  viagemId: string,
): Promise<{ data: ViagemVeiculo[] | null; error: string | null }> {
  const usuario = await getCurrentUsuario();
  if (!usuario) {
    return { data: null, error: 'Não autenticado' };
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from('viagem_veiculo')
    .select('*')
    .eq('viagem_id', viagemId)
    .order('posicao', { ascending: true, nullsFirst: false });

  if (error) {
    return { data: null, error: error.message };
  }

  return { data: data as ViagemVeiculo[], error: null };
}

// ---------------------------------------------------------------------------
// Add veiculo to viagem
// ---------------------------------------------------------------------------

export async function addVeiculoViagem(
  viagemId: string,
  formData: ViagemVeiculoFormData,
): Promise<ViagemVeiculoActionResult> {
  const usuario = await getCurrentUsuario();
  if (!usuario) {
    return { success: false, error: 'Não autenticado' };
  }

  if (!usuario.ativo) {
    return { success: false, error: 'Usuário desativado' };
  }

  const { error: statusError, empresaId } = await checkViagemEditable(viagemId);
  if (statusError || !empresaId) {
    return { success: false, error: statusError ?? 'Viagem não encontrada' };
  }

  const parsed = viagemVeiculoSchema.safeParse(formData);
  if (!parsed.success) {
    return { success: false, fieldErrors: extractFieldErrors(parsed.error) };
  }

  const data = parsed.data;

  const supabase = await createClient();
  const { data: veiculo, error: insertError } = await supabase
    .from('viagem_veiculo')
    .insert({
      empresa_id: empresaId,
      viagem_id: viagemId,
      modelo: data.modelo,
      marca: data.marca ?? null,
      placa: data.placa ?? null,
      chassi: data.chassi ?? null,
      cor: data.cor ?? null,
      posicao: data.posicao ?? null,
      observacao: data.observacao ?? null,
    })
    .select()
    .single();

  if (insertError) {
    return { success: false, error: 'Erro ao adicionar veiculo. Tente novamente.' };
  }

  revalidatePath(`/viagens/${viagemId}`);
  return { success: true, veiculo: veiculo as ViagemVeiculo };
}

// ---------------------------------------------------------------------------
// Update veiculo
// ---------------------------------------------------------------------------

export async function updateVeiculoViagem(
  veiculoId: string,
  viagemId: string,
  formData: ViagemVeiculoFormData,
): Promise<ViagemVeiculoActionResult> {
  const usuario = await getCurrentUsuario();
  if (!usuario) {
    return { success: false, error: 'Não autenticado' };
  }

  if (!usuario.ativo) {
    return { success: false, error: 'Usuário desativado' };
  }

  const { error: statusError } = await checkViagemEditable(viagemId);
  if (statusError) {
    return { success: false, error: statusError };
  }

  const parsed = viagemVeiculoSchema.safeParse(formData);
  if (!parsed.success) {
    return { success: false, fieldErrors: extractFieldErrors(parsed.error) };
  }

  const data = parsed.data;

  const supabase = await createClient();
  const { data: veiculo, error: updateError } = await supabase
    .from('viagem_veiculo')
    .update({
      modelo: data.modelo,
      marca: data.marca ?? null,
      placa: data.placa ?? null,
      chassi: data.chassi ?? null,
      cor: data.cor ?? null,
      posicao: data.posicao ?? null,
      observacao: data.observacao ?? null,
    })
    .eq('id', veiculoId)
    .select()
    .single();

  if (updateError) {
    return { success: false, error: 'Erro ao atualizar veiculo. Tente novamente.' };
  }

  revalidatePath(`/viagens/${viagemId}`);
  return { success: true, veiculo: veiculo as ViagemVeiculo };
}

// ---------------------------------------------------------------------------
// Remove veiculo
// ---------------------------------------------------------------------------

export async function removeVeiculoViagem(
  veiculoId: string,
  viagemId: string,
): Promise<{ success: boolean; error?: string }> {
  const usuario = await getCurrentUsuario();
  if (!usuario) {
    return { success: false, error: 'Não autenticado' };
  }

  const { error: statusError } = await checkViagemEditable(viagemId);
  if (statusError) {
    return { success: false, error: statusError };
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from('viagem_veiculo')
    .delete()
    .eq('id', veiculoId);

  if (error) {
    return { success: false, error: 'Erro ao remover veiculo. Tente novamente.' };
  }

  revalidatePath(`/viagens/${viagemId}`);
  return { success: true };
}
