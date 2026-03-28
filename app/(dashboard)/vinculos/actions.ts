'use server';

import { z } from 'zod';
import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import { requireRole } from '@/lib/auth/get-user-role';
import type {
  VinculoActionResult,
  MotoristaCaminhaoFormData,
  VinculoListItem,
  MotoristaOption,
  CaminhaoOption,
} from '@/types/motorista-caminhao';

const vinculoSchema = z.object({
  motorista_id: z.string().uuid('Selecione um motorista'),
  caminhao_id: z.string().uuid('Selecione um caminhao'),
  data_inicio: z.string()
    .min(1, 'Data de inicio e obrigatoria')
    .refine((val) => !isNaN(Date.parse(val)), 'Data invalida'),
  observacao: z.string().max(1000, 'Observacao deve ter no maximo 1000 caracteres'),
});

function extractFieldErrors(
  error: z.ZodError,
): Partial<Record<keyof MotoristaCaminhaoFormData, string>> {
  const fieldErrors: Partial<Record<keyof MotoristaCaminhaoFormData, string>> = {};
  for (const issue of error.issues) {
    const field = issue.path[0] as keyof MotoristaCaminhaoFormData;
    if (!fieldErrors[field]) {
      fieldErrors[field] = issue.message;
    }
  }
  return fieldErrors;
}

/**
 * Create a new vinculo motorista-caminhao.
 * Automatically closes any existing active vinculo for the same caminhao.
 * Requires role: dono or admin.
 */
export async function createVinculo(
  formData: MotoristaCaminhaoFormData,
): Promise<VinculoActionResult> {
  let currentUsuario;
  try {
    currentUsuario = await requireRole(['dono', 'admin']);
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Permissao insuficiente',
    };
  }

  const parsed = vinculoSchema.safeParse(formData);
  if (!parsed.success) {
    return { success: false, fieldErrors: extractFieldErrors(parsed.error) };
  }

  const data = parsed.data;
  const supabase = await createClient();

  // Verify motorista belongs to the same empresa and is active
  const { data: motorista } = await supabase
    .from('motorista')
    .select('id, empresa_id, status')
    .eq('id', data.motorista_id)
    .eq('empresa_id', currentUsuario.empresa_id)
    .single();

  if (!motorista) {
    return {
      success: false,
      fieldErrors: { motorista_id: 'Motorista nao encontrado na sua empresa' },
    };
  }

  if (motorista.status !== 'ativo') {
    return {
      success: false,
      fieldErrors: { motorista_id: 'Motorista esta inativo' },
    };
  }

  // Verify caminhao belongs to the same empresa and is active
  const { data: caminhao } = await supabase
    .from('caminhao')
    .select('id, empresa_id, ativo')
    .eq('id', data.caminhao_id)
    .eq('empresa_id', currentUsuario.empresa_id)
    .single();

  if (!caminhao) {
    return {
      success: false,
      fieldErrors: { caminhao_id: 'Caminhao nao encontrado na sua empresa' },
    };
  }

  if (!caminhao.ativo) {
    return {
      success: false,
      fieldErrors: { caminhao_id: 'Caminhao esta inativo' },
    };
  }

  // Check for existing active vinculo on this caminhao and close it
  const { data: vinculoAtivo } = await supabase
    .from('motorista_caminhao')
    .select('id')
    .eq('caminhao_id', data.caminhao_id)
    .eq('ativo', true)
    .maybeSingle();

  if (vinculoAtivo) {
    // Calculate data_fim as new data_inicio - 1 day
    const novaDataInicio = new Date(data.data_inicio);
    const dataFim = new Date(novaDataInicio);
    dataFim.setDate(dataFim.getDate() - 1);
    const dataFimStr = dataFim.toISOString().split('T')[0];

    const { error: closeError } = await supabase
      .from('motorista_caminhao')
      .update({
        ativo: false,
        data_fim: dataFimStr,
      })
      .eq('id', vinculoAtivo.id);

    if (closeError) {
      return {
        success: false,
        error: 'Erro ao encerrar vinculo anterior. Tente novamente.',
      };
    }
  }

  // Create the new vinculo
  const { data: vinculo, error: insertError } = await supabase
    .from('motorista_caminhao')
    .insert({
      empresa_id: currentUsuario.empresa_id,
      motorista_id: data.motorista_id,
      caminhao_id: data.caminhao_id,
      data_inicio: data.data_inicio,
      ativo: true,
      observacao: data.observacao || null,
    })
    .select()
    .single();

  if (insertError) {
    // Unique index violation — should not happen since we closed above,
    // but handle race condition gracefully
    if (insertError.code === '23505') {
      return {
        success: false,
        error: 'Ja existe um vinculo ativo para este caminhao. Tente novamente.',
      };
    }
    return { success: false, error: 'Erro ao criar vinculo. Tente novamente.' };
  }

  revalidatePath('/vinculos');
  revalidatePath('/motoristas');
  revalidatePath('/caminhoes');
  return { success: true, vinculo };
}

/**
 * Close (end) an active vinculo.
 * Sets ativo = false and data_fim = today.
 * Requires role: dono or admin.
 */
export async function encerrarVinculo(
  vinculoId: string,
  dataFim?: string,
): Promise<VinculoActionResult> {
  try {
    await requireRole(['dono', 'admin']);
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Permissao insuficiente',
    };
  }

  const supabase = await createClient();
  const finalDate = dataFim ?? new Date().toISOString().split('T')[0];

  const { data: vinculo, error } = await supabase
    .from('motorista_caminhao')
    .update({
      ativo: false,
      data_fim: finalDate,
    })
    .eq('id', vinculoId)
    .eq('ativo', true)
    .select()
    .single();

  if (error || !vinculo) {
    return { success: false, error: 'Vinculo nao encontrado ou ja encerrado.' };
  }

  revalidatePath('/vinculos');
  revalidatePath('/motoristas');
  revalidatePath('/caminhoes');
  return { success: true, vinculo };
}

/**
 * List all vinculos for the current empresa (active first, then historical).
 * Requires role: dono or admin.
 */
export async function listVinculos(filter?: {
  apenasAtivos?: boolean;
  motoristaId?: string;
  caminhaoId?: string;
}): Promise<{
  data: VinculoListItem[] | null;
  error: string | null;
}> {
  try {
    await requireRole(['dono', 'admin']);
  } catch (err) {
    return {
      data: null,
      error: err instanceof Error ? err.message : 'Permissao insuficiente',
    };
  }

  const supabase = await createClient();

  let query = supabase
    .from('motorista_caminhao')
    .select('id, motorista_id, caminhao_id, data_inicio, data_fim, ativo, observacao, motorista(nome, cpf), caminhao(placa, modelo)')
    .order('ativo', { ascending: false })
    .order('data_inicio', { ascending: false });

  if (filter?.apenasAtivos) {
    query = query.eq('ativo', true);
  }

  if (filter?.motoristaId) {
    query = query.eq('motorista_id', filter.motoristaId);
  }

  if (filter?.caminhaoId) {
    query = query.eq('caminhao_id', filter.caminhaoId);
  }

  const { data, error } = await query;

  if (error) {
    return { data: null, error: error.message };
  }

  const items: VinculoListItem[] = (data ?? []).map((v) => {
    const motorista = v.motorista as unknown as { nome: string; cpf: string } | null;
    const caminhao = v.caminhao as unknown as { placa: string; modelo: string } | null;

    return {
      id: v.id,
      motorista_nome: motorista?.nome ?? 'N/A',
      motorista_cpf: motorista?.cpf ?? 'N/A',
      caminhao_placa: caminhao?.placa ?? 'N/A',
      caminhao_modelo: caminhao?.modelo ?? 'N/A',
      data_inicio: v.data_inicio,
      data_fim: v.data_fim,
      ativo: v.ativo,
      observacao: v.observacao,
    };
  });

  return { data: items, error: null };
}

/**
 * Get active motoristas for dropdown (ativo, current empresa).
 */
export async function getActiveMotoristas(): Promise<{
  data: MotoristaOption[] | null;
  error: string | null;
}> {
  try {
    await requireRole(['dono', 'admin']);
  } catch (err) {
    return {
      data: null,
      error: err instanceof Error ? err.message : 'Permissao insuficiente',
    };
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from('motorista')
    .select('id, nome, cpf')
    .eq('status', 'ativo')
    .order('nome', { ascending: true });

  if (error) {
    return { data: null, error: error.message };
  }

  return { data: data as MotoristaOption[], error: null };
}

/**
 * Get active caminhoes for dropdown (ativo, current empresa).
 */
export async function getActiveCaminhoes(): Promise<{
  data: CaminhaoOption[] | null;
  error: string | null;
}> {
  try {
    await requireRole(['dono', 'admin']);
  } catch (err) {
    return {
      data: null,
      error: err instanceof Error ? err.message : 'Permissao insuficiente',
    };
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from('caminhao')
    .select('id, placa, modelo')
    .eq('ativo', true)
    .order('placa', { ascending: true });

  if (error) {
    return { data: null, error: error.message };
  }

  return { data: data as CaminhaoOption[], error: null };
}

/**
 * Get the current active vinculo for a specific motorista.
 */
export async function getVinculoAtivoByMotorista(motoristaId: string): Promise<{
  data: VinculoListItem | null;
  error: string | null;
}> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('motorista_caminhao')
    .select('id, motorista_id, caminhao_id, data_inicio, data_fim, ativo, observacao, motorista(nome, cpf), caminhao(placa, modelo)')
    .eq('motorista_id', motoristaId)
    .eq('ativo', true)
    .maybeSingle();

  if (error) {
    return { data: null, error: error.message };
  }

  if (!data) {
    return { data: null, error: null };
  }

  const motorista = data.motorista as unknown as { nome: string; cpf: string } | null;
  const caminhao = data.caminhao as unknown as { placa: string; modelo: string } | null;

  return {
    data: {
      id: data.id,
      motorista_nome: motorista?.nome ?? 'N/A',
      motorista_cpf: motorista?.cpf ?? 'N/A',
      caminhao_placa: caminhao?.placa ?? 'N/A',
      caminhao_modelo: caminhao?.modelo ?? 'N/A',
      data_inicio: data.data_inicio,
      data_fim: data.data_fim,
      ativo: data.ativo,
      observacao: data.observacao,
    },
    error: null,
  };
}

/**
 * Get the current active vinculo for a specific caminhao.
 */
export async function getVinculoAtivoByCaminhao(caminhaoId: string): Promise<{
  data: VinculoListItem | null;
  error: string | null;
}> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('motorista_caminhao')
    .select('id, motorista_id, caminhao_id, data_inicio, data_fim, ativo, observacao, motorista(nome, cpf), caminhao(placa, modelo)')
    .eq('caminhao_id', caminhaoId)
    .eq('ativo', true)
    .maybeSingle();

  if (error) {
    return { data: null, error: error.message };
  }

  if (!data) {
    return { data: null, error: null };
  }

  const motorista = data.motorista as unknown as { nome: string; cpf: string } | null;
  const caminhao = data.caminhao as unknown as { placa: string; modelo: string } | null;

  return {
    data: {
      id: data.id,
      motorista_nome: motorista?.nome ?? 'N/A',
      motorista_cpf: motorista?.cpf ?? 'N/A',
      caminhao_placa: caminhao?.placa ?? 'N/A',
      caminhao_modelo: caminhao?.modelo ?? 'N/A',
      data_inicio: data.data_inicio,
      data_fim: data.data_fim,
      ativo: data.ativo,
      observacao: data.observacao,
    },
    error: null,
  };
}
