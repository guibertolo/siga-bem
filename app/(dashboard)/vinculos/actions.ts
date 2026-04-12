'use server';

import { z } from 'zod';
import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import { singleRelation } from '@/lib/utils/supabase-types';
import { requireRole } from '@/lib/auth/get-user-role';
import type {
  VinculoActionResult,
  MotoristaCaminhaoFormData,
  VinculoListItem,
  MotoristaOption,
  CaminhaoOption,
  VinculosDashboardData,
  CaminhaoComMotorista,
  CaminhaoSemMotorista,
} from '@/types/motorista-caminhao';

const vinculoSchema = z.object({
  motorista_id: z.string().uuid('Selecione um motorista'),
  caminhao_id: z.string().uuid('Selecione um caminhão'),
  data_inicio: z.string()
    .min(1, 'Data de início é obrigatória')
    .refine((val) => !isNaN(Date.parse(val)), 'Data inválida'),
  observacao: z.string().max(1000, 'Observação deve ter no máximo 1000 caracteres'),
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
 * Multiple active vinculos per caminhao are allowed (day/night shifts, alternating).
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
      error: err instanceof Error ? err.message : 'Permissão insuficiente',
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
      fieldErrors: { motorista_id: 'Motorista não encontrado na sua empresa' },
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
      fieldErrors: { caminhao_id: 'Caminhão não encontrado na sua empresa' },
    };
  }

  if (!caminhao.ativo) {
    return {
      success: false,
      fieldErrors: { caminhao_id: 'Caminhão está inativo' },
    };
  }

  // Create the new vinculo (multiple active vinculos per caminhao are allowed)
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
      error: err instanceof Error ? err.message : 'Permissão insuficiente',
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
    return { success: false, error: 'Vinculo não encontrado ou ja encerrado.' };
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
      error: err instanceof Error ? err.message : 'Permissão insuficiente',
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
    const motorista = singleRelation<{ nome: string; cpf: string }>(v.motorista);
    const caminhao = singleRelation<{ placa: string; modelo: string }>(v.caminhao);

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
      error: err instanceof Error ? err.message : 'Permissão insuficiente',
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
      error: err instanceof Error ? err.message : 'Permissão insuficiente',
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
 * Get all active vinculos for a specific motorista.
 * Returns array since a motorista can have multiple active vinculos.
 */
export async function getVinculoAtivoByMotorista(motoristaId: string): Promise<{
  data: VinculoListItem[];
  error: string | null;
}> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('motorista_caminhao')
    .select('id, motorista_id, caminhao_id, data_inicio, data_fim, ativo, observacao, motorista(nome, cpf), caminhao(placa, modelo)')
    .eq('motorista_id', motoristaId)
    .eq('ativo', true);

  if (error) {
    return { data: [], error: error.message };
  }

  if (!data || data.length === 0) {
    return { data: [], error: null };
  }

  const items: VinculoListItem[] = data.map((v) => {
    const motorista = singleRelation<{ nome: string; cpf: string }>(v.motorista);
    const caminhao = singleRelation<{ placa: string; modelo: string }>(v.caminhao);

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
 * Get all active vinculos for a specific caminhao.
 * Returns array since multiple drivers can be active on the same truck.
 */
export async function getVinculoAtivoByCaminhao(caminhaoId: string): Promise<{
  data: VinculoListItem[];
  error: string | null;
}> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('motorista_caminhao')
    .select('id, motorista_id, caminhao_id, data_inicio, data_fim, ativo, observacao, motorista(nome, cpf), caminhao(placa, modelo)')
    .eq('caminhao_id', caminhaoId)
    .eq('ativo', true);

  if (error) {
    return { data: [], error: error.message };
  }

  if (!data || data.length === 0) {
    return { data: [], error: null };
  }

  const items: VinculoListItem[] = data.map((v) => {
    const motorista = singleRelation<{ nome: string; cpf: string }>(v.motorista);
    const caminhao = singleRelation<{ placa: string; modelo: string }>(v.caminhao);

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
 * Lookup active vinculos for a caminhao — used by the form to show warnings.
 * Returns motorista names of existing active vinculos.
 */
export async function getVinculoAtivoCaminhao(caminhaoId: string): Promise<{
  motoristas: string[];
  error: string | null;
}> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('motorista_caminhao')
    .select('motorista(nome)')
    .eq('caminhao_id', caminhaoId)
    .eq('ativo', true);

  if (error) {
    return { motoristas: [], error: error.message };
  }

  const motoristas = (data ?? []).map((v) => {
    const motorista = singleRelation<{ nome: string }>(v.motorista);
    return motorista?.nome ?? 'N/A';
  });

  return { motoristas, error: null };
}

/**
 * Lookup active vinculos for a motorista — used by the form to show warnings.
 * Returns caminhao placas of existing active vinculos.
 */
export async function getVinculoAtivoMotorista(motoristaId: string): Promise<{
  caminhoes: string[];
  error: string | null;
}> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('motorista_caminhao')
    .select('caminhao(placa)')
    .eq('motorista_id', motoristaId)
    .eq('ativo', true);

  if (error) {
    return { caminhoes: [], error: error.message };
  }

  const caminhoes = (data ?? []).map((v) => {
    const caminhao = singleRelation<{ placa: string }>(v.caminhao);
    return caminhao?.placa ?? 'N/A';
  });

  return { caminhoes, error: null };
}

/**
 * Get dashboard data for the vinculos page.
 * Returns 3 groups: trucks with drivers, trucks without drivers, and history.
 * Requires role: dono or admin.
 */
export async function getDashboardVinculos(): Promise<VinculosDashboardData> {
  try {
    await requireRole(['dono', 'admin']);
  } catch (err) {
    return {
      caminhoesCom: [],
      caminhoesSem: [],
      historico: [],
      contadores: { totalVinculados: 0, totalSemMotorista: 0, totalEncerrados: 0 },
      error: err instanceof Error ? err.message : 'Permissão insuficiente',
    };
  }

  const supabase = await createClient();

  // Run all 3 queries in parallel
  const [activeResult, allCaminhoesResult, historicoResult] = await Promise.all([
    // 1. Active vinculos with motorista and caminhao data
    supabase
      .from('motorista_caminhao')
      .select('id, motorista_id, caminhao_id, data_inicio, observacao, motorista(id, nome, cpf), caminhao(id, placa, modelo)')
      .eq('ativo', true)
      .order('data_inicio', { ascending: false }),

    // 2. All active caminhoes for the empresa
    supabase
      .from('caminhao')
      .select('id, placa, modelo')
      .eq('ativo', true)
      .order('placa', { ascending: true }),

    // 3. Historical (inactive) vinculos, last 20
    supabase
      .from('motorista_caminhao')
      .select('id, motorista_id, caminhao_id, data_inicio, data_fim, ativo, observacao, motorista(nome, cpf), caminhao(placa, modelo)')
      .eq('ativo', false)
      .order('data_fim', { ascending: false })
      .limit(20),
  ]);

  if (activeResult.error) {
    return {
      caminhoesCom: [],
      caminhoesSem: [],
      historico: [],
      contadores: { totalVinculados: 0, totalSemMotorista: 0, totalEncerrados: 0 },
      error: activeResult.error.message,
    };
  }

  // Group active vinculos by caminhao
  const caminhaoMap = new Map<string, CaminhaoComMotorista>();
  for (const v of activeResult.data ?? []) {
    const motorista = singleRelation<{ id: string; nome: string; cpf: string }>(v.motorista);
    const caminhao = singleRelation<{ id: string; placa: string; modelo: string }>(v.caminhao);
    if (!caminhao) continue;

    const key = caminhao.id;
    if (!caminhaoMap.has(key)) {
      caminhaoMap.set(key, {
        caminhao_id: caminhao.id,
        caminhao_placa: caminhao.placa,
        caminhao_modelo: caminhao.modelo,
        motoristas: [],
      });
    }
    caminhaoMap.get(key)!.motoristas.push({
      vinculo_id: v.id,
      motorista_id: motorista?.id ?? '',
      motorista_nome: motorista?.nome ?? 'N/A',
      motorista_cpf: motorista?.cpf ?? 'N/A',
      data_inicio: v.data_inicio,
      observacao: v.observacao,
    });
  }

  const caminhoesCom = Array.from(caminhaoMap.values());

  // Determine caminhoes without any active vinculo
  const caminhoesComIds = new Set(caminhaoMap.keys());
  const caminhoesSem: CaminhaoSemMotorista[] = (allCaminhoesResult.data ?? [])
    .filter((c) => !caminhoesComIds.has(c.id))
    .map((c) => ({
      caminhao_id: c.id,
      caminhao_placa: c.placa,
      caminhao_modelo: c.modelo,
    }));

  // Map historico
  const historico: VinculoListItem[] = (historicoResult.data ?? []).map((v) => {
    const motorista = singleRelation<{ nome: string; cpf: string }>(v.motorista);
    const caminhao = singleRelation<{ placa: string; modelo: string }>(v.caminhao);
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

  // Count total encerrados (separate count query for accuracy)
  const { count: totalEncerrados } = await supabase
    .from('motorista_caminhao')
    .select('id', { count: 'exact', head: true })
    .eq('ativo', false);

  return {
    caminhoesCom,
    caminhoesSem,
    historico,
    contadores: {
      totalVinculados: caminhoesCom.length,
      totalSemMotorista: caminhoesSem.length,
      totalEncerrados: totalEncerrados ?? historico.length,
    },
    error: null,
  };
}
