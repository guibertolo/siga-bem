'use server';

import { z } from 'zod';
import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import { getCurrentUsuario } from '@/lib/auth/get-user-role';
import { parseBrlInputToCentavos } from '@/lib/utils/currency';
import type {
  ViagemActionResult,
  ViagemFormData,
  ViagemListItem,
  Viagem,
} from '@/types/viagem';
import type { ViagemStatus } from '@/types/database';
import { VIAGEM_STATUS_TRANSITIONS } from '@/types/viagem';

// ---------------------------------------------------------------------------
// Schemas
// ---------------------------------------------------------------------------

const viagemSchema = z.object({
  motorista_id: z.string().uuid('Selecione um motorista'),
  caminhao_id: z.string().uuid('Selecione um caminhao'),
  origem: z.string()
    .min(1, 'Origem e obrigatoria')
    .max(200, 'Origem deve ter no maximo 200 caracteres'),
  destino: z.string()
    .min(1, 'Destino e obrigatorio')
    .max(200, 'Destino deve ter no maximo 200 caracteres'),
  data_saida: z.string()
    .min(1, 'Data de saida e obrigatoria')
    .refine((val) => !isNaN(Date.parse(val)), 'Data de saida invalida'),
  data_chegada_prevista: z.string()
    .refine(
      (val) => val === '' || !isNaN(Date.parse(val)),
      'Data de chegada prevista invalida',
    ),
  valor_total: z.string()
    .min(1, 'Valor total e obrigatorio')
    .refine((val) => {
      const centavos = parseBrlInputToCentavos(val);
      return centavos !== null && centavos > 0;
    }, 'Valor total deve ser maior que zero'),
  percentual_pagamento: z.string()
    .min(1, 'Percentual e obrigatorio')
    .refine((val) => {
      const num = parseFloat(val.replace(',', '.'));
      return !isNaN(num) && num >= 0 && num <= 100;
    }, 'Percentual deve ser entre 0 e 100'),
  km_estimado: z.string()
    .refine(
      (val) => val === '' || (!isNaN(Number(val)) && Number(val) > 0),
      'Distancia estimada deve ser maior que zero',
    ),
  km_saida: z.string()
    .refine(
      (val) => val === '' || (!isNaN(Number(val)) && Number(val) >= 0),
      'KM saida deve ser um numero positivo',
    ),
  observacao: z.string().max(1000, 'Observacao deve ter no maximo 1000 caracteres'),
});

function extractFieldErrors(
  error: z.ZodError,
): Partial<Record<keyof ViagemFormData, string>> {
  const fieldErrors: Partial<Record<keyof ViagemFormData, string>> = {};
  for (const issue of error.issues) {
    const field = issue.path[0] as keyof ViagemFormData;
    if (!fieldErrors[field]) {
      fieldErrors[field] = issue.message;
    }
  }
  return fieldErrors;
}

// ---------------------------------------------------------------------------
// Data loading for selects
// ---------------------------------------------------------------------------

/**
 * List motoristas ativos for select (dono/admin see all, motorista sees self).
 */
export async function listMotoristasAtivos(): Promise<{
  data: Array<{ id: string; nome: string }> | null;
  error: string | null;
}> {
  const usuario = await getCurrentUsuario();
  if (!usuario) {
    return { data: null, error: 'Nao autenticado' };
  }

  const supabase = await createClient();

  if (usuario.role === 'motorista') {
    const { data, error } = await supabase
      .from('motorista')
      .select('id, nome')
      .eq('empresa_id', usuario.empresa_id)
      .eq('usuario_id', usuario.id)
      .eq('status', 'ativo');

    if (error) return { data: null, error: error.message };
    return { data, error: null };
  }

  const { data, error } = await supabase
    .from('motorista')
    .select('id, nome')
    .eq('empresa_id', usuario.empresa_id)
    .eq('status', 'ativo')
    .order('nome');

  if (error) return { data: null, error: error.message };
  return { data, error: null };
}

/**
 * List caminhoes ativos vinculados a um motorista (via motorista_caminhao ativo).
 * If no motorista_id provided, returns all active caminhoes.
 */
export async function listCaminhoesPorMotorista(
  motoristaId?: string,
): Promise<{
  data: Array<{ id: string; placa: string; modelo: string }> | null;
  error: string | null;
}> {
  const usuario = await getCurrentUsuario();
  if (!usuario) {
    return { data: null, error: 'Nao autenticado' };
  }

  const supabase = await createClient();

  if (motoristaId) {
    // Get caminhoes linked to this motorista via active vinculos
    const { data: vinculos, error: vincError } = await supabase
      .from('motorista_caminhao')
      .select('caminhao_id')
      .eq('motorista_id', motoristaId)
      .eq('ativo', true);

    if (vincError) return { data: null, error: vincError.message };

    const caminhaoIds = (vinculos ?? []).map((v) => v.caminhao_id);
    if (caminhaoIds.length === 0) {
      return { data: [], error: null };
    }

    const { data, error } = await supabase
      .from('caminhao')
      .select('id, placa, modelo')
      .in('id', caminhaoIds)
      .eq('ativo', true)
      .order('placa');

    if (error) return { data: null, error: error.message };
    return { data, error: null };
  }

  // No motorista filter: return all active caminhoes
  const { data, error } = await supabase
    .from('caminhao')
    .select('id, placa, modelo')
    .eq('empresa_id', usuario.empresa_id)
    .eq('ativo', true)
    .order('placa');

  if (error) return { data: null, error: error.message };
  return { data, error: null };
}

// ---------------------------------------------------------------------------
// CRUD Operations
// ---------------------------------------------------------------------------

/**
 * Create a new viagem.
 * Only dono/admin can create (enforced by RLS + app check).
 */
export async function createViagem(
  formData: ViagemFormData,
): Promise<ViagemActionResult> {
  const usuario = await getCurrentUsuario();
  if (!usuario) {
    return { success: false, error: 'Nao autenticado' };
  }

  if (!usuario.ativo) {
    return { success: false, error: 'Usuario desativado' };
  }

  // Motorista must have a motorista_id linked
  if (usuario.role === 'motorista' && !usuario.motorista_id) {
    return { success: false, error: 'Voce nao possui perfil de motorista vinculado. Solicite ao proprietario.' };
  }

  const parsed = viagemSchema.safeParse(formData);
  if (!parsed.success) {
    return { success: false, fieldErrors: extractFieldErrors(parsed.error) };
  }

  const data = parsed.data;

  const valorCentavos = parseBrlInputToCentavos(data.valor_total);
  if (valorCentavos === null || valorCentavos <= 0) {
    return { success: false, fieldErrors: { valor_total: 'Valor invalido' } };
  }

  const kmEstimado = data.km_estimado !== '' ? Number(data.km_estimado) : null;
  const kmSaida = data.km_saida !== '' ? Number(data.km_saida) : null;

  // Story 3.4: determine editavel_motorista and motorista_id based on role
  const isMotorista = usuario.role === 'motorista';
  const editavelMotorista = isMotorista; // true if motorista creates, false if dono/admin
  const motoristaId = isMotorista ? usuario.motorista_id! : data.motorista_id;

  const supabase = await createClient();

  // Block if motorista already has a viagem em_andamento
  const { count: emAndamento } = await supabase
    .from('viagem')
    .select('id', { count: 'exact', head: true })
    .eq('motorista_id', motoristaId)
    .eq('status', 'em_andamento');

  if (emAndamento && emAndamento > 0) {
    return { success: false, error: 'Este motorista ja possui uma viagem em andamento. Conclua ou cancele antes de criar outra.' };
  }

  // ALWAYS inherit percentual from motorista cadastro — never from form
  const { data: motoristaRecord } = await supabase
    .from('motorista')
    .select('percentual_pagamento')
    .eq('id', motoristaId)
    .single();

  const percentual = motoristaRecord?.percentual_pagamento ?? 0;

  const { data: viagem, error: insertError } = await supabase
    .from('viagem')
    .insert({
      empresa_id: usuario.empresa_id,
      motorista_id: motoristaId,
      caminhao_id: data.caminhao_id,
      origem: data.origem,
      destino: data.destino,
      data_saida: data.data_saida,
      data_chegada_prevista: data.data_chegada_prevista || null,
      valor_total: valorCentavos,
      percentual_pagamento: percentual,
      km_estimado: kmEstimado,
      km_saida: kmSaida,
      observacao: data.observacao || null,
      editavel_motorista: editavelMotorista,
      created_by: usuario.id,
    })
    .select()
    .single();

  if (insertError) {
    return { success: false, error: 'Erro ao cadastrar viagem. Tente novamente.' };
  }

  revalidatePath('/viagens');
  revalidatePath('/dashboard');
  return { success: true, viagem };
}

/**
 * Update an existing viagem.
 * Fields editable depend on status (enforced by caller / UI).
 * Only dono/admin can update (motorista read-only).
 */
export async function updateViagem(
  viagemId: string,
  formData: ViagemFormData,
): Promise<ViagemActionResult> {
  const usuario = await getCurrentUsuario();
  if (!usuario) {
    return { success: false, error: 'Nao autenticado' };
  }

  if (!usuario.ativo) {
    return { success: false, error: 'Usuario desativado' };
  }

  const supabase = await createClient();

  // Fetch current viagem to check status and editavel_motorista
  const { data: existing, error: fetchError } = await supabase
    .from('viagem')
    .select('status, editavel_motorista, origem, destino, valor_total, percentual_pagamento')
    .eq('id', viagemId)
    .single();

  if (fetchError || !existing) {
    return { success: false, error: 'Viagem nao encontrada' };
  }

  // Only editable when planejada or em_andamento
  if (existing.status !== 'planejada' && existing.status !== 'em_andamento') {
    return { success: false, error: 'Viagem concluida ou cancelada nao pode ser editada' };
  }

  const parsed = viagemSchema.safeParse(formData);
  if (!parsed.success) {
    return { success: false, fieldErrors: extractFieldErrors(parsed.error) };
  }

  const data = parsed.data;

  const valorCentavos = parseBrlInputToCentavos(data.valor_total);
  if (valorCentavos === null || valorCentavos <= 0) {
    return { success: false, fieldErrors: { valor_total: 'Valor invalido' } };
  }

  const kmEstimado = data.km_estimado !== '' ? Number(data.km_estimado) : null;
  const kmSaida = data.km_saida !== '' ? Number(data.km_saida) : null;

  // Story 3.4: 3-level edit lock for core fields (origem, destino, valor_total)
  // Core fields are editable IF AND ONLY IF:
  //   role === 'dono' OR (editavel_motorista === true AND status === 'planejada')
  const camposEditaveis =
    usuario.role === 'dono' ||
    (existing.editavel_motorista === true && existing.status === 'planejada');

  const coreFieldChanged =
    data.origem !== existing.origem ||
    data.destino !== existing.destino ||
    valorCentavos !== existing.valor_total;

  if (coreFieldChanged && !camposEditaveis) {
    return {
      success: false,
      error: 'Campos bloqueados para edicao. Origem, destino e valor nao podem ser alterados.',
    };
  }

  // percentual_pagamento is NEVER updated via viagem edit — it comes from motorista cadastro
  const { data: viagem, error: updateError } = await supabase
    .from('viagem')
    .update({
      motorista_id: data.motorista_id,
      caminhao_id: data.caminhao_id,
      origem: camposEditaveis ? data.origem : existing.origem,
      destino: camposEditaveis ? data.destino : existing.destino,
      data_saida: data.data_saida,
      data_chegada_prevista: data.data_chegada_prevista || null,
      valor_total: camposEditaveis ? valorCentavos : existing.valor_total,
      km_estimado: kmEstimado,
      km_saida: kmSaida,
      observacao: data.observacao || null,
    })
    .eq('id', viagemId)
    .select()
    .single();

  if (updateError) {
    return { success: false, error: 'Erro ao atualizar viagem. Tente novamente.' };
  }

  revalidatePath('/viagens');
  revalidatePath('/dashboard');
  return { success: true, viagem };
}

/**
 * Update viagem status with transition validation.
 * AC3: planejada -> em_andamento -> concluida; planejada -> cancelada.
 * AC7: km_chegada available when updating to concluida.
 */
export async function updateViagemStatus(
  viagemId: string,
  novoStatus: ViagemStatus,
  dataChegadaReal?: string,
  kmChegada?: number,
): Promise<ViagemActionResult> {
  const usuario = await getCurrentUsuario();
  if (!usuario) {
    return { success: false, error: 'Nao autenticado' };
  }

  const supabase = await createClient();

  const { data: viagem, error: fetchError } = await supabase
    .from('viagem')
    .select('status, motorista_id, caminhao_id')
    .eq('id', viagemId)
    .single();

  if (fetchError || !viagem) {
    return { success: false, error: 'Viagem nao encontrada' };
  }

  const transicoesValidas = VIAGEM_STATUS_TRANSITIONS[viagem.status as ViagemStatus];
  if (!transicoesValidas.includes(novoStatus)) {
    return {
      success: false,
      error: `Transicao invalida: ${viagem.status} para ${novoStatus}`,
    };
  }

  // Block: motorista can only have 1 viagem em_andamento at a time
  if (novoStatus === 'em_andamento') {
    const { count: emAndamento } = await supabase
      .from('viagem')
      .select('id', { count: 'exact', head: true })
      .eq('motorista_id', viagem.motorista_id)
      .eq('status', 'em_andamento')
      .neq('id', viagemId);

    if (emAndamento && emAndamento > 0) {
      return { success: false, error: 'Este motorista ja possui uma viagem em andamento. Conclua ou cancele antes de iniciar outra.' };
    }
  }

  // AC3: data_chegada_real required when concluding
  if (novoStatus === 'concluida' && !dataChegadaReal) {
    return {
      success: false,
      error: 'Data de chegada real e obrigatoria para concluir viagem',
    };
  }

  const updatePayload: Record<string, unknown> = { status: novoStatus };

  if (novoStatus === 'concluida') {
    updatePayload.data_chegada_real = dataChegadaReal;
    if (kmChegada != null) {
      updatePayload.km_chegada = kmChegada;
    }
  }

  const { data: updated, error: updateError } = await supabase
    .from('viagem')
    .update(updatePayload)
    .eq('id', viagemId)
    .select()
    .single();

  if (updateError) {
    return { success: false, error: 'Erro ao atualizar status. Tente novamente.' };
  }

  // Update caminhao km_atual when concluding viagem with km_chegada
  if (novoStatus === 'concluida' && kmChegada != null && viagem.caminhao_id) {
    await supabase
      .from('caminhao')
      .update({ km_atual: kmChegada })
      .eq('id', viagem.caminhao_id);
  }

  revalidatePath('/viagens');
  revalidatePath('/dashboard');
  return { success: true, viagem: updated };
}

/**
 * Update only observacao for concluida/cancelada viagens (AC6).
 */
export async function updateViagemObservacao(
  viagemId: string,
  observacao: string,
): Promise<ViagemActionResult> {
  const usuario = await getCurrentUsuario();
  if (!usuario) {
    return { success: false, error: 'Nao autenticado' };
  }

  const supabase = await createClient();

  const { data: viagem, error: updateError } = await supabase
    .from('viagem')
    .update({ observacao: observacao || null })
    .eq('id', viagemId)
    .select()
    .single();

  if (updateError) {
    return { success: false, error: 'Erro ao atualizar observacao. Tente novamente.' };
  }

  revalidatePath('/viagens');
  return { success: true, viagem };
}

/**
 * Delete a viagem.
 * AC6: Only deletable when status is 'planejada'.
 */
export async function deleteViagem(
  viagemId: string,
): Promise<{ success: boolean; error?: string }> {
  const usuario = await getCurrentUsuario();
  if (!usuario) {
    return { success: false, error: 'Nao autenticado' };
  }

  if (usuario.role === 'motorista') {
    return { success: false, error: 'Motorista nao pode excluir viagens' };
  }

  const supabase = await createClient();

  // Check status before delete
  const { data: existing, error: fetchError } = await supabase
    .from('viagem')
    .select('status')
    .eq('id', viagemId)
    .single();

  if (fetchError || !existing) {
    return { success: false, error: 'Viagem nao encontrada' };
  }

  if (existing.status !== 'planejada') {
    return { success: false, error: 'Somente viagens planejadas podem ser excluidas' };
  }

  const { error } = await supabase
    .from('viagem')
    .delete()
    .eq('id', viagemId);

  if (error) {
    return { success: false, error: 'Erro ao excluir viagem. Tente novamente.' };
  }

  revalidatePath('/viagens');
  revalidatePath('/dashboard');
  return { success: true };
}

/**
 * Get a single viagem by ID (with joins).
 */
export async function getViagem(
  viagemId: string,
): Promise<ViagemActionResult> {
  const usuario = await getCurrentUsuario();
  if (!usuario) {
    return { success: false, error: 'Nao autenticado' };
  }

  const supabase = await createClient();
  const { data: viagem, error } = await supabase
    .from('viagem')
    .select(`
      *,
      motorista ( nome ),
      caminhao ( placa, modelo, capacidade_veiculos )
    `)
    .eq('id', viagemId)
    .single();

  if (error || !viagem) {
    return { success: false, error: 'Viagem nao encontrada' };
  }

  return { success: true, viagem: viagem as unknown as Viagem };
}

/**
 * List viagens with optional filters (AC5).
 */
export async function listViagens(filters?: {
  status?: ViagemStatus[];
  motorista_id?: string;
  data_inicio?: string;
  data_fim?: string;
  texto?: string;
  page?: number;
  pageSize?: number;
}): Promise<{
  data: ViagemListItem[] | null;
  total: number;
  error: string | null;
}> {
  const usuario = await getCurrentUsuario();
  if (!usuario) {
    return { data: null, total: 0, error: 'Nao autenticado' };
  }

  const supabase = await createClient();
  const page = filters?.page ?? 1;
  const pageSize = filters?.pageSize ?? 20;
  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;

  let query = supabase
    .from('viagem')
    .select(`
      id,
      motorista_id,
      origem,
      destino,
      data_saida,
      valor_total,
      percentual_pagamento,
      status,
      motorista ( nome ),
      caminhao ( placa )
    `, { count: 'exact' });

  // Filters
  if (filters?.status && filters.status.length > 0) {
    query = query.in('status', filters.status);
  }

  if (filters?.motorista_id) {
    query = query.eq('motorista_id', filters.motorista_id);
  }

  if (filters?.data_inicio) {
    query = query.gte('data_saida', filters.data_inicio);
  }

  if (filters?.data_fim) {
    // Add time to include the whole end day
    query = query.lte('data_saida', `${filters.data_fim}T23:59:59`);
  }

  if (filters?.texto) {
    query = query.or(
      `origem.ilike.%${filters.texto}%,destino.ilike.%${filters.texto}%`,
    );
  }

  query = query
    .order('data_saida', { ascending: false })
    .range(from, to);

  const { data, count, error } = await query;

  if (error) {
    return { data: null, total: 0, error: error.message };
  }

  const items: ViagemListItem[] = (data ?? []).map((row) => {
    const mot = row.motorista as unknown as { nome: string } | null;
    const cam = row.caminhao as unknown as { placa: string } | null;

    return {
      id: row.id,
      motorista_id: row.motorista_id,
      origem: row.origem,
      destino: row.destino,
      motorista_nome: mot?.nome ?? 'Desconhecido',
      caminhao_placa: cam?.placa ?? '-',
      data_saida: row.data_saida,
      valor_total: row.valor_total,
      percentual_pagamento: row.percentual_pagamento,
      status: row.status,
    };
  });

  return { data: items, total: count ?? 0, error: null };
}

/**
 * Invalidar (cancel) a viagem — admin/dono override.
 * Bypasses normal status transitions. Works for any status except 'cancelada'.
 * Sets status to 'cancelada' and prepends motivo to observacao.
 */
export async function invalidarViagem(
  viagemId: string,
  motivo: string,
): Promise<{ success: boolean; error?: string }> {
  const usuario = await getCurrentUsuario();
  if (!usuario) {
    return { success: false, error: 'Nao autenticado' };
  }

  if (!usuario.ativo) {
    return { success: false, error: 'Usuario desativado' };
  }

  // Only dono/admin can invalidate
  if (usuario.role === 'motorista') {
    return { success: false, error: 'Motorista nao pode invalidar viagens' };
  }

  if (!motivo || motivo.trim().length < 10) {
    return { success: false, error: 'Motivo deve ter no minimo 10 caracteres' };
  }

  const supabase = await createClient();

  const { data: existing, error: fetchError } = await supabase
    .from('viagem')
    .select('status, observacao')
    .eq('id', viagemId)
    .single();

  if (fetchError || !existing) {
    return { success: false, error: 'Viagem nao encontrada' };
  }

  if (existing.status === 'cancelada') {
    return { success: false, error: 'Viagem ja esta cancelada' };
  }

  const observacaoOriginal = existing.observacao ?? '';
  const novaObservacao = observacaoOriginal
    ? `[INVALIDADA] ${motivo.trim()} | ${observacaoOriginal}`
    : `[INVALIDADA] ${motivo.trim()}`;

  const { error: updateError } = await supabase
    .from('viagem')
    .update({
      status: 'cancelada',
      observacao: novaObservacao,
    })
    .eq('id', viagemId);

  if (updateError) {
    return { success: false, error: 'Erro ao invalidar viagem. Tente novamente.' };
  }

  revalidatePath('/viagens');
  revalidatePath('/dashboard');
  return { success: true };
}

/**
 * List unique cities used in origem/destino for the current empresa.
 * Used for autocomplete suggestions in the viagem form.
 */
export async function listCidadesUsadas(): Promise<{
  data: string[];
  error: string | null;
}> {
  const usuario = await getCurrentUsuario();
  if (!usuario) {
    return { data: [], error: 'Nao autenticado' };
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from('viagem')
    .select('origem, destino');

  if (error) {
    return { data: [], error: error.message };
  }

  const cidadesSet = new Set<string>();
  for (const row of data ?? []) {
    if (row.origem) cidadesSet.add(row.origem.trim());
    if (row.destino) cidadesSet.add(row.destino.trim());
  }

  const sorted = Array.from(cidadesSet).sort((a, b) =>
    a.localeCompare(b, 'pt-BR'),
  );

  return { data: sorted, error: null };
}

/**
 * Get count of viagens em_andamento for dashboard card (T7).
 */
export async function getViagensEmAndamento(): Promise<{
  count: number;
  error: string | null;
}> {
  const usuario = await getCurrentUsuario();
  if (!usuario) {
    return { count: 0, error: 'Nao autenticado' };
  }

  const supabase = await createClient();
  const { count, error } = await supabase
    .from('viagem')
    .select('id', { count: 'exact', head: true })
    .eq('status', 'em_andamento');

  if (error) {
    return { count: 0, error: error.message };
  }

  return { count: count ?? 0, error: null };
}
