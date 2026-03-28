'use server';

import { z } from 'zod';
import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import { getCurrentUsuario } from '@/lib/auth/get-user-role';
import type {
  FechamentoActionResult,
  FechamentoFormData,
  FechamentoListItem,
  FechamentoCalculo,
  Fechamento,
  FechamentoItem,
  FechamentoDetalhado,
  PreviewFechamento,
  PreviewViagemItem,
  PreviewGastoItem,
} from '@/types/fechamento';
import type { FechamentoStatus } from '@/types/database';
import { FECHAMENTO_STATUS_TRANSITIONS } from '@/types/fechamento';

// ---------------------------------------------------------------------------
// Schemas
// ---------------------------------------------------------------------------

const fechamentoSchema = z.object({
  motorista_id: z.string().uuid('Selecione um motorista'),
  tipo: z.enum(['semanal', 'mensal'], {
    message: 'Selecione o tipo de fechamento',
  }),
  periodo_inicio: z.string()
    .min(1, 'Data inicio e obrigatoria')
    .refine((val) => !isNaN(Date.parse(val)), 'Data inicio invalida'),
  periodo_fim: z.string()
    .min(1, 'Data fim e obrigatoria')
    .refine((val) => !isNaN(Date.parse(val)), 'Data fim invalida'),
  observacao: z.string().max(1000, 'Observacao deve ter no maximo 1000 caracteres'),
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
// Data Loading
// ---------------------------------------------------------------------------

/**
 * List motoristas ativos for select (only dono/admin).
 */
export async function listMotoristasParaFechamento(): Promise<{
  data: Array<{ id: string; nome: string }> | null;
  error: string | null;
}> {
  const usuario = await getCurrentUsuario();
  if (!usuario) {
    return { data: null, error: 'Nao autenticado' };
  }

  if (usuario.role === 'motorista') {
    return { data: null, error: 'Permissao insuficiente' };
  }

  const supabase = await createClient();
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
 * Preview calculation for a fechamento before creating.
 * Calls fn_calcular_fechamento database function.
 */
export async function previewFechamento(
  motoristaId: string,
  periodoInicio: string,
  periodoFim: string,
): Promise<{ data: FechamentoCalculo | null; error: string | null }> {
  const usuario = await getCurrentUsuario();
  if (!usuario) {
    return { data: null, error: 'Nao autenticado' };
  }

  if (usuario.role === 'motorista') {
    return { data: null, error: 'Permissao insuficiente' };
  }

  const supabase = await createClient();
  const { data, error } = await supabase.rpc('fn_calcular_fechamento', {
    p_motorista_id: motoristaId,
    p_periodo_inicio: periodoInicio,
    p_periodo_fim: periodoFim,
  });

  if (error) {
    return { data: null, error: error.message };
  }

  if (!data || data.length === 0) {
    return {
      data: {
        total_viagens: 0,
        total_gastos: 0,
        saldo_motorista: 0,
        qtd_viagens: 0,
        qtd_gastos: 0,
      },
      error: null,
    };
  }

  const row = data[0];
  return {
    data: {
      total_viagens: row.total_viagens,
      total_gastos: row.total_gastos,
      saldo_motorista: row.saldo_motorista,
      qtd_viagens: Number(row.qtd_viagens),
      qtd_gastos: Number(row.qtd_gastos),
    },
    error: null,
  };
}

/**
 * Detailed preview with line-by-line viagens and gastos (AC2, AC3).
 * Returns totals + individual items for the preview step.
 */
export async function previewFechamentoDetalhado(
  motoristaId: string,
  periodoInicio: string,
  periodoFim: string,
): Promise<{ data: PreviewFechamento | null; error: string | null }> {
  const usuario = await getCurrentUsuario();
  if (!usuario) {
    return { data: null, error: 'Nao autenticado' };
  }

  if (usuario.role === 'motorista') {
    return { data: null, error: 'Permissao insuficiente' };
  }

  const supabase = await createClient();

  // Parallel: totals + viagens + gastos
  const [calcResult, viagensResult, gastosResult] = await Promise.all([
    supabase.rpc('fn_calcular_fechamento', {
      p_motorista_id: motoristaId,
      p_periodo_inicio: periodoInicio,
      p_periodo_fim: periodoFim,
    }),
    supabase
      .from('viagem')
      .select('id, origem, destino, valor_total, percentual_pagamento, data_saida')
      .eq('motorista_id', motoristaId)
      .eq('status', 'concluida')
      .gte('data_saida', `${periodoInicio}T00:00:00`)
      .lte('data_saida', `${periodoFim}T23:59:59`)
      .order('data_saida', { ascending: true }),
    supabase
      .from('gasto')
      .select('id, descricao, valor, data, categoria_gasto(nome)')
      .eq('motorista_id', motoristaId)
      .gte('data', periodoInicio)
      .lte('data', periodoFim)
      .order('data', { ascending: true }),
  ]);

  if (calcResult.error) {
    return { data: null, error: calcResult.error.message };
  }

  const calc = calcResult.data?.[0] ?? {
    total_viagens: 0,
    total_gastos: 0,
    saldo_motorista: 0,
    qtd_viagens: 0,
    qtd_gastos: 0,
  };

  const viagens: PreviewViagemItem[] = (viagensResult.data ?? []).map((v) => ({
    id: v.id,
    origem: v.origem,
    destino: v.destino,
    data_saida: v.data_saida.split('T')[0],
    valor_total: v.valor_total,
    percentual_pagamento: v.percentual_pagamento,
    valor_motorista: Math.round((v.valor_total * v.percentual_pagamento) / 100),
  }));

  const gastos: PreviewGastoItem[] = (gastosResult.data ?? []).map((g) => {
    const cat = g.categoria_gasto as unknown as { nome: string } | null;
    return {
      id: g.id,
      data: g.data,
      categoria: cat?.nome ?? 'Sem categoria',
      descricao: g.descricao,
      valor: g.valor,
    };
  });

  return {
    data: {
      totais: {
        total_viagens: calc.total_viagens,
        total_gastos: calc.total_gastos,
        saldo_motorista: calc.saldo_motorista,
        qtd_viagens: Number(calc.qtd_viagens),
        qtd_gastos: Number(calc.qtd_gastos),
      },
      viagens,
      gastos,
    },
    error: null,
  };
}

// ---------------------------------------------------------------------------
// CRUD Operations
// ---------------------------------------------------------------------------

/**
 * Create a new fechamento with items in a single transaction.
 * Atomicity: fechamento + fechamento_item rows in one insert flow.
 * Only dono/admin can create.
 */
export async function createFechamento(
  formData: FechamentoFormData,
): Promise<FechamentoActionResult> {
  const usuario = await getCurrentUsuario();
  if (!usuario) {
    return { success: false, error: 'Nao autenticado' };
  }

  if (!usuario.ativo) {
    return { success: false, error: 'Usuario desativado' };
  }

  if (usuario.role === 'motorista') {
    return { success: false, error: 'Motorista nao pode criar fechamentos' };
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
      error: 'Ja existe um fechamento para este motorista no periodo selecionado.',
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
    valor: Math.round((v.valor_total * v.percentual_pagamento) / 100),
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
    const cat = g.categoria_gasto as unknown as { nome: string } | null;
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
 * List fechamentos for the current empresa.
 * Motorista sees only their own (filtered by RLS).
 */
export async function listFechamentos(filters?: {
  motorista_id?: string;
  status?: FechamentoStatus;
  page?: number;
  pageSize?: number;
}): Promise<{
  data: FechamentoListItem[] | null;
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
    .from('fechamento')
    .select(`
      id,
      tipo,
      status,
      periodo_inicio,
      periodo_fim,
      total_viagens,
      total_gastos,
      saldo_motorista,
      created_at,
      motorista ( nome )
    `, { count: 'exact' });

  if (filters?.motorista_id) {
    query = query.eq('motorista_id', filters.motorista_id);
  }

  if (filters?.status) {
    query = query.eq('status', filters.status);
  }

  query = query
    .order('periodo_inicio', { ascending: false })
    .range(from, to);

  const { data, count, error } = await query;

  if (error) {
    return { data: null, total: 0, error: error.message };
  }

  const items: FechamentoListItem[] = (data ?? []).map((row) => {
    const mot = row.motorista as unknown as { nome: string } | null;
    return {
      id: row.id,
      motorista_nome: mot?.nome ?? 'Desconhecido',
      tipo: row.tipo,
      status: row.status,
      periodo_inicio: row.periodo_inicio,
      periodo_fim: row.periodo_fim,
      total_viagens: row.total_viagens,
      total_gastos: row.total_gastos,
      saldo_motorista: row.saldo_motorista,
      created_at: row.created_at,
    };
  });

  return { data: items, total: count ?? 0, error: null };
}

/**
 * Get a single fechamento with its items (detail view).
 */
export async function getFechamentoDetalhado(
  fechamentoId: string,
): Promise<{ data: FechamentoDetalhado | null; error: string | null }> {
  const usuario = await getCurrentUsuario();
  if (!usuario) {
    return { data: null, error: 'Nao autenticado' };
  }

  const supabase = await createClient();

  const { data: fechamento, error: fetchError } = await supabase
    .from('fechamento')
    .select(`
      *,
      motorista ( nome )
    `)
    .eq('id', fechamentoId)
    .single();

  if (fetchError || !fechamento) {
    return { data: null, error: 'Fechamento nao encontrado' };
  }

  const { data: itens, error: itensError } = await supabase
    .from('fechamento_item')
    .select('*')
    .eq('fechamento_id', fechamentoId)
    .order('data', { ascending: true });

  if (itensError) {
    return { data: null, error: 'Erro ao buscar itens do fechamento' };
  }

  return {
    data: {
      ...(fechamento as unknown as Fechamento),
      itens: (itens ?? []) as FechamentoItem[],
    },
    error: null,
  };
}

/**
 * Fechar (close) a fechamento: aberto -> fechado.
 * Only dono/admin.
 */
export async function fecharFechamento(
  fechamentoId: string,
): Promise<FechamentoActionResult> {
  return updateFechamentoStatus(fechamentoId, 'fechado');
}

/**
 * Reabrir (reopen) a fechamento: fechado -> aberto.
 * Only dono/admin.
 */
export async function reabrirFechamento(
  fechamentoId: string,
): Promise<FechamentoActionResult> {
  return updateFechamentoStatus(fechamentoId, 'aberto');
}

/**
 * Marcar como pago: fechado -> pago.
 * Only dono/admin.
 */
export async function marcarComoPago(
  fechamentoId: string,
): Promise<FechamentoActionResult> {
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
    return { success: false, error: 'Nao autenticado' };
  }

  if (usuario.role === 'motorista') {
    return { success: false, error: 'Permissao insuficiente' };
  }

  const supabase = await createClient();

  // Get current status
  const { data: existing, error: fetchError } = await supabase
    .from('fechamento')
    .select('status')
    .eq('id', fechamentoId)
    .single();

  if (fetchError || !existing) {
    return { success: false, error: 'Fechamento nao encontrado' };
  }

  const currentStatus = existing.status as FechamentoStatus;
  const validTransitions = FECHAMENTO_STATUS_TRANSITIONS[currentStatus];

  if (!validTransitions.includes(novoStatus)) {
    return {
      success: false,
      error: `Transicao invalida: ${currentStatus} para ${novoStatus}`,
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
    // Reopen: clear fechado/pago timestamps
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
    return { success: false, error: 'Erro ao atualizar status. Tente novamente.' };
  }

  revalidatePath('/fechamentos');
  revalidatePath(`/fechamentos/${fechamentoId}`);
  revalidatePath('/dashboard');
  return { success: true, fechamento: updated as Fechamento };
}

/**
 * Delete a fechamento (only if status is 'aberto').
 * Only dono/admin.
 */
export async function deleteFechamento(
  fechamentoId: string,
): Promise<{ success: boolean; error?: string }> {
  const usuario = await getCurrentUsuario();
  if (!usuario) {
    return { success: false, error: 'Nao autenticado' };
  }

  if (usuario.role === 'motorista') {
    return { success: false, error: 'Permissao insuficiente' };
  }

  const supabase = await createClient();

  const { data: existing, error: fetchError } = await supabase
    .from('fechamento')
    .select('status')
    .eq('id', fechamentoId)
    .single();

  if (fetchError || !existing) {
    return { success: false, error: 'Fechamento nao encontrado' };
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
    return { success: false, error: 'Erro ao excluir fechamento. Tente novamente.' };
  }

  revalidatePath('/fechamentos');
  revalidatePath('/dashboard');
  return { success: true };
}
