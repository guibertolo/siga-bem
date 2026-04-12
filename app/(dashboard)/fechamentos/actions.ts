'use server';

import { z } from 'zod';
import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import { singleRelation } from '@/lib/utils/supabase-types';
import { getCurrentUsuario } from '@/lib/auth/get-user-role';
import type {
  FechamentoActionResult,
  FechamentoFormData,
  Fechamento,
} from '@/types/fechamento';
import type { FechamentoStatus } from '@/types/database';
import { FECHAMENTO_STATUS_TRANSITIONS } from '@/types/fechamento';
import {
  calcularValorMotorista,
} from '@/lib/business/fechamentos';
import { logError } from '@/lib/observability/logger';
import {
  listMotoristasParaFechamentoRepo,
  previewFechamentoRepo,
  previewFechamentoDetalhadoRepo,
  getViagensPendentesAcertoRepo,
  listFechamentosRepo,
  getFechamentoDetalhadoRepo,
} from '@/lib/repositories/fechamentos';

// ---------------------------------------------------------------------------
// Re-export types so existing consumers don't need import changes
// ---------------------------------------------------------------------------

export type { ViagemPendenteAcerto } from '@/lib/repositories/fechamentos';

// ---------------------------------------------------------------------------
// Schemas
// ---------------------------------------------------------------------------

const fechamentoSchema = z.object({
  motorista_id: z.string().uuid('Selecione um motorista'),
  tipo: z.enum(['semanal', 'mensal'], {
    message: 'Selecione o tipo de fechamento',
  }),
  periodo_inicio: z.string()
    .min(1, 'Data início é obrigatória')
    .refine((val) => !isNaN(Date.parse(val)), 'Data início inválida'),
  periodo_fim: z.string()
    .min(1, 'Data fim é obrigatória')
    .refine((val) => !isNaN(Date.parse(val)), 'Data fim inválida'),
  observacao: z.string().max(1000, 'Observação deve ter no máximo 1000 caracteres'),
}).refine((data) => {
  return new Date(data.periodo_fim) >= new Date(data.periodo_inicio);
}, {
  message: 'Data fim deve ser maior ou igual a data inicio',
  path: ['periodo_fim'],
});

function extractFieldErrors(
  error: z.ZodError,
): Partial<Record<keyof FechamentoFormData, string>> {
  const fieldErrors: Partial<Record<keyof FechamentoFormData, string>> = {};
  for (const issue of error.issues) {
    const field = issue.path[0] as keyof FechamentoFormData;
    if (!fieldErrors[field]) {
      fieldErrors[field] = issue.message;
    }
  }
  return fieldErrors;
}

// ---------------------------------------------------------------------------
// Read operations — delegate to repository
// ---------------------------------------------------------------------------

/**
 * List motoristas ativos for select (only dono/admin).
 */
export async function listMotoristasParaFechamento() {
  const usuario = await getCurrentUsuario();
  if (!usuario) {
    return { data: null, error: 'Não autenticado' };
  }

  if (usuario.role === 'motorista') {
    return { data: null, error: 'Permissão insuficiente' };
  }

  const supabase = await createClient();
  return listMotoristasParaFechamentoRepo(supabase, [usuario.empresa_id!]);
}

/**
 * Preview calculation for a fechamento before creating.
 */
export async function previewFechamento(
  motoristaId: string,
  periodoInicio: string,
  periodoFim: string,
) {
  const usuario = await getCurrentUsuario();
  if (!usuario) {
    return { data: null, error: 'Não autenticado' };
  }

  if (usuario.role === 'motorista') {
    return { data: null, error: 'Permissão insuficiente' };
  }

  const supabase = await createClient();
  return previewFechamentoRepo(supabase, motoristaId, periodoInicio, periodoFim);
}

/**
 * Detailed preview with line-by-line viagens and gastos (AC2, AC3).
 */
export async function previewFechamentoDetalhado(
  motoristaId: string,
  periodoInicio: string,
  periodoFim: string,
) {
  const usuario = await getCurrentUsuario();
  if (!usuario) {
    return { data: null, error: 'Não autenticado' };
  }

  if (usuario.role === 'motorista') {
    return { data: null, error: 'Permissão insuficiente' };
  }

  const supabase = await createClient();
  return previewFechamentoDetalhadoRepo(supabase, motoristaId, periodoInicio, periodoFim);
}

/**
 * List viagens concluidas that are NOT yet part of any fechamento.
 */
export async function getViagensPendentesAcerto() {
  const usuario = await getCurrentUsuario();
  if (!usuario) {
    return { data: null, error: 'Não autenticado' };
  }

  if (usuario.role === 'motorista') {
    return { data: null, error: 'Permissão insuficiente' };
  }

  const supabase = await createClient();
  return getViagensPendentesAcertoRepo(supabase, [usuario.empresa_id!]);
}

/**
 * List fechamentos for the current empresa.
 */
export async function listFechamentos(filters?: {
  motorista_id?: string;
  status?: FechamentoStatus;
  page?: number;
  pageSize?: number;
}) {
  const usuario = await getCurrentUsuario();
  if (!usuario) {
    return { data: null, total: 0, error: 'Não autenticado' };
  }

  const supabase = await createClient();
  return listFechamentosRepo(supabase, [usuario.empresa_id!], filters);
}

/**
 * Get a single fechamento with its items (detail view).
 */
export async function getFechamentoDetalhado(fechamentoId: string) {
  const usuario = await getCurrentUsuario();
  if (!usuario) {
    return { data: null, error: 'Não autenticado' };
  }

  const supabase = await createClient();
  return getFechamentoDetalhadoRepo(supabase, fechamentoId);
}

// ---------------------------------------------------------------------------
// CRUD Operations (mutations stay here)
// ---------------------------------------------------------------------------

/**
 * Create a new fechamento with items in a single transaction.
 */
export async function createFechamento(
  formData: FechamentoFormData,
): Promise<FechamentoActionResult> {
  const usuario = await getCurrentUsuario();
  if (!usuario) {
    return { success: false, error: 'Não autenticado' };
  }

  if (!usuario.ativo) {
    return { success: false, error: 'Usuário desativado' };
  }

  if (usuario.role === 'motorista') {
    return { success: false, error: 'Motorista não pode criar fechamentos' };
  }

  const parsed = fechamentoSchema.safeParse(formData);
  if (!parsed.success) {
    return { success: false, fieldErrors: extractFieldErrors(parsed.error) };
  }

  const data = parsed.data;
  const supabase = await createClient();

  // 1. Calculate totals using database function
  const { data: calcResult, error: calcError } = await supabase.rpc('fn_calcular_fechamento', {
    p_motorista_id: data.motorista_id,
    p_periodo_inicio: data.periodo_inicio,
    p_periodo_fim: data.periodo_fim,
  });

  if (calcError) {
    logError({ action: 'createFechamento', empresaId: usuario.empresa_id, usuarioId: usuario.id, params: { motorista_id: data.motorista_id } }, calcError);
    return { success: false, error: 'Erro ao calcular fechamento. Tente novamente.' };
  }

  const calc = calcResult?.[0] ?? {
    total_viagens: 0,
    total_gastos: 0,
    saldo_motorista: 0,
  };

  // 2. Check for overlapping fechamento for this motorista
  const { data: overlapping } = await supabase
    .from('fechamento')
    .select('id')
    .eq('motorista_id', data.motorista_id)
    .lte('periodo_inicio', data.periodo_fim)
    .gte('periodo_fim', data.periodo_inicio)
    .limit(1);

  if (overlapping && overlapping.length > 0) {
    return {
      success: false,
      error: 'Já existe um fechamento para este motorista no período selecionado.',
    };
  }

  // 3. Create the fechamento record
  const { data: fechamento, error: insertError } = await supabase
    .from('fechamento')
    .insert({
      empresa_id: usuario.empresa_id,
      motorista_id: data.motorista_id,
      tipo: data.tipo,
      status: 'aberto' as FechamentoStatus,
      periodo_inicio: data.periodo_inicio,
      periodo_fim: data.periodo_fim,
      total_viagens: calc.total_viagens,
      total_gastos: calc.total_gastos,
      saldo_motorista: calc.saldo_motorista,
      observacao: data.observacao || null,
      created_by: usuario.id,
    })
    .select()
    .single();

  if (insertError) {
    logError({ action: 'createFechamento', empresaId: usuario.empresa_id, usuarioId: usuario.id }, insertError);
    return { success: false, error: 'Erro ao criar fechamento. Tente novamente.' };
  }

  // 4. Fetch viagens concluidas in period and create items
  const { data: viagens } = await supabase
    .from('viagem')
    .select('id, origem, destino, valor_total, percentual_pagamento, data_saida')
    .eq('motorista_id', data.motorista_id)
    .eq('status', 'concluida')
    .gte('data_saida', `${data.periodo_inicio}T00:00:00`)
    .lte('data_saida', `${data.periodo_fim}T23:59:59`);

  const viagemItems: Array<{
    fechamento_id: string;
    tipo: string;
    referencia_id: string;
    descricao: string;
    valor: number;
    data: string;
  }> = (viagens ?? []).map((v) => ({
    fechamento_id: fechamento.id,
    tipo: 'viagem',
    referencia_id: v.id,
    descricao: `${v.origem} -> ${v.destino}`,
    valor: calcularValorMotorista(v.valor_total, v.percentual_pagamento),
    data: v.data_saida.split('T')[0],
  }));

  // 5. Fetch gastos in period and create items
  const { data: gastos } = await supabase
    .from('gasto')
    .select('id, descricao, valor, data, categoria_gasto(nome)')
    .eq('motorista_id', data.motorista_id)
    .gte('data', data.periodo_inicio)
    .lte('data', data.periodo_fim);

  const gastoItems: Array<{
    fechamento_id: string;
    tipo: string;
    referencia_id: string;
    descricao: string;
    valor: number;
    data: string;
  }> = (gastos ?? []).map((g) => {
    const cat = singleRelation<{ nome: string }>(g.categoria_gasto);
    return {
      fechamento_id: fechamento.id,
      tipo: 'gasto',
      referencia_id: g.id,
      descricao: g.descricao || cat?.nome || 'Gasto',
      valor: g.valor,
      data: g.data,
    };
  });

  // 6. Insert all items
  const allItems = [...viagemItems, ...gastoItems];
  if (allItems.length > 0) {
    const { error: itemsError } = await supabase
      .from('fechamento_item')
      .insert(allItems);

    if (itemsError) {
      logError({ action: 'createFechamento.items', empresaId: usuario.empresa_id, usuarioId: usuario.id }, itemsError);
      // Rollback: delete the fechamento if items fail
      await supabase.from('fechamento').delete().eq('id', fechamento.id);
      return { success: false, error: 'Erro ao criar itens do fechamento. Tente novamente.' };
    }
  }

  revalidatePath('/fechamentos');
  revalidatePath('/dashboard');
  return { success: true, fechamento: fechamento as Fechamento };
}

/**
 * Fechar (close) a fechamento: aberto -> fechado.
 */
export async function fecharFechamento(
  fechamentoId: string,
): Promise<FechamentoActionResult> {
  return updateFechamentoStatus(fechamentoId, 'fechado');
}

/**
 * Reabrir (reopen) a fechamento: fechado -> aberto.
 */
export async function reabrirFechamento(
  fechamentoId: string,
): Promise<FechamentoActionResult> {
  const usuario = await getCurrentUsuario();
  if (!usuario) {
    return { success: false, error: 'Não autenticado' };
  }
  if (usuario.role !== 'dono') {
    return { success: false, error: 'Apenas o proprietario pode reabrir fechamentos.' };
  }
  return updateFechamentoStatus(fechamentoId, 'aberto');
}

/**
 * Marcar como pago: fechado -> pago.
 */
export async function marcarComoPago(
  fechamentoId: string,
): Promise<FechamentoActionResult> {
  const usuario = await getCurrentUsuario();
  if (!usuario) {
    return { success: false, error: 'Não autenticado' };
  }
  if (usuario.role !== 'dono') {
    return { success: false, error: 'Apenas o proprietario pode marcar como pago.' };
  }
  return updateFechamentoStatus(fechamentoId, 'pago');
}

/**
 * Internal: update fechamento status with transition validation.
 */
async function updateFechamentoStatus(
  fechamentoId: string,
  novoStatus: FechamentoStatus,
): Promise<FechamentoActionResult> {
  const usuario = await getCurrentUsuario();
  if (!usuario) {
    return { success: false, error: 'Não autenticado' };
  }

  if (usuario.role === 'motorista') {
    return { success: false, error: 'Permissão insuficiente' };
  }

  const supabase = await createClient();

  const { data: existing, error: fetchError } = await supabase
    .from('fechamento')
    .select('status')
    .eq('id', fechamentoId)
    .single();

  if (fetchError || !existing) {
    return { success: false, error: 'Fechamento não encontrado' };
  }

  const currentStatus = existing.status as FechamentoStatus;
  const validTransitions = FECHAMENTO_STATUS_TRANSITIONS[currentStatus];

  if (!validTransitions.includes(novoStatus)) {
    return {
      success: false,
      error: `Transição inválida: ${currentStatus} para ${novoStatus}`,
    };
  }

  const updatePayload: Record<string, unknown> = { status: novoStatus };

  if (novoStatus === 'fechado') {
    updatePayload.fechado_em = new Date().toISOString();
    updatePayload.fechado_por = usuario.id;
  } else if (novoStatus === 'pago') {
    updatePayload.pago_em = new Date().toISOString();
    updatePayload.pago_por = usuario.id;
  } else if (novoStatus === 'aberto') {
    updatePayload.fechado_em = null;
    updatePayload.fechado_por = null;
    updatePayload.pago_em = null;
    updatePayload.pago_por = null;
  }

  const { data: updated, error: updateError } = await supabase
    .from('fechamento')
    .update(updatePayload)
    .eq('id', fechamentoId)
    .select()
    .single();

  if (updateError) {
    logError({ action: 'updateFechamentoStatus', empresaId: usuario.empresa_id, usuarioId: usuario.id, params: { fechamentoId, novoStatus } }, updateError);
    return { success: false, error: 'Erro ao atualizar status. Tente novamente.' };
  }

  revalidatePath('/fechamentos');
  revalidatePath(`/fechamentos/${fechamentoId}`);
  revalidatePath('/dashboard');
  return { success: true, fechamento: updated as Fechamento };
}

/**
 * Delete a fechamento (only if status is 'aberto').
 */
export async function deleteFechamento(
  fechamentoId: string,
): Promise<{ success: boolean; error?: string }> {
  const usuario = await getCurrentUsuario();
  if (!usuario) {
    return { success: false, error: 'Não autenticado' };
  }

  if (usuario.role !== 'dono') {
    return { success: false, error: 'Apenas o proprietario pode excluir fechamentos.' };
  }

  const supabase = await createClient();

  const { data: existing, error: fetchError } = await supabase
    .from('fechamento')
    .select('status')
    .eq('id', fechamentoId)
    .single();

  if (fetchError || !existing) {
    return { success: false, error: 'Fechamento não encontrado' };
  }

  if (existing.status !== 'aberto') {
    return { success: false, error: 'Somente fechamentos abertos podem ser excluidos' };
  }

  // Items are CASCADE deleted
  const { error } = await supabase
    .from('fechamento')
    .delete()
    .eq('id', fechamentoId);

  if (error) {
    logError({ action: 'deleteFechamento', empresaId: usuario.empresa_id, usuarioId: usuario.id, params: { fechamentoId } }, error);
    return { success: false, error: 'Erro ao excluir fechamento. Tente novamente.' };
  }

  revalidatePath('/fechamentos');
  revalidatePath('/dashboard');
  return { success: true };
}
