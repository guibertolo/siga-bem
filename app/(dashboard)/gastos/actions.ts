'use server';

import { z } from 'zod';
import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import { getCurrentUsuario } from '@/lib/auth/get-user-role';
import { parseBrlInputToCentavos } from '@/lib/utils/currency';
import type {
  GastoActionResult,
  GastoFormData,
  GastoFilters,
  GastoListItem,
  GastoListResult,
  GastoFilterOptions,
} from '@/types/gasto';
import type { CategoriaGastoOption } from '@/types/categoria-gasto';
import { getGastos, getGastoFilterOptions } from '@/lib/queries/gastos';
import { generateGastosCsv } from '@/lib/utils/export-gastos-csv';

const gastoSchema = z.object({
  categoria_id: z.string().uuid('Categoria é obrigatória'),
  motorista_id: z.string().uuid('Motorista é obrigatório'),
  caminhao_id: z.string().refine(
    (val) => val === '' || z.string().uuid().safeParse(val).success,
    'Caminhão inválido',
  ),
  viagem_id: z.string().refine(
    (val) => val === '' || z.string().uuid().safeParse(val).success,
    'Viagem inválida',
  ),
  valor: z.string()
    .min(1, 'Valor é obrigatório')
    .refine((val) => {
      const centavos = parseBrlInputToCentavos(val);
      return centavos !== null && centavos > 0;
    }, 'Valor deve ser maior que zero'),
  data: z.string()
    .min(1, 'Data é obrigatória')
    .refine((val) => !isNaN(Date.parse(val)), 'Data inválida'),
  descricao: z.string().max(1000, 'Descrição deve ter no máximo 1000 caracteres'),
});

function extractFieldErrors(
  error: z.ZodError,
): Partial<Record<keyof GastoFormData, string>> {
  const fieldErrors: Partial<Record<keyof GastoFormData, string>> = {};
  for (const issue of error.issues) {
    const field = issue.path[0] as keyof GastoFormData;
    if (!fieldErrors[field]) {
      fieldErrors[field] = issue.message;
    }
  }
  return fieldErrors;
}

/**
 * List categorias de gasto (global + empresa custom).
 */
export async function listCategorias(): Promise<{
  data: CategoriaGastoOption[] | null;
  error: string | null;
}> {
  const usuario = await getCurrentUsuario();
  if (!usuario) {
    return { data: null, error: 'Não autenticado' };
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from('categoria_gasto')
    .select('id, nome, icone, cor')
    .or(`empresa_id.is.null,empresa_id.eq.${usuario.empresa_id}`)
    .eq('ativa', true)
    .order('ordem');

  if (error) {
    return { data: null, error: error.message };
  }

  return { data, error: null };
}

/**
 * List motoristas ativos for select (dono/admin see all, motorista sees self).
 */
export async function listMotoristasAtivos(): Promise<{
  data: Array<{ id: string; nome: string }> | null;
  error: string | null;
}> {
  const usuario = await getCurrentUsuario();
  if (!usuario) {
    return { data: null, error: 'Não autenticado' };
  }

  const supabase = await createClient();

  if (usuario.role === 'motorista') {
    // Motorista only sees themselves
    const { data, error } = await supabase
      .from('motorista')
      .select('id, nome')
      .eq('empresa_id', usuario.empresa_id)
      .eq('usuario_id', usuario.id)
      .eq('status', 'ativo');

    if (error) return { data: null, error: error.message };
    return { data, error: null };
  }

  // Dono/admin sees all active motoristas
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
 * List caminhoes ativos for select.
 * Motorista role: only caminhoes linked via active vinculos.
 */
export async function listCaminhoesAtivos(): Promise<{
  data: Array<{ id: string; placa: string; modelo: string }> | null;
  error: string | null;
}> {
  const usuario = await getCurrentUsuario();
  if (!usuario) {
    return { data: null, error: 'Não autenticado' };
  }

  const supabase = await createClient();

  if (usuario.role === 'motorista') {
    // Get motorista record for this user
    const { data: motoristaRecord } = await supabase
      .from('motorista')
      .select('id')
      .eq('usuario_id', usuario.id)
      .eq('empresa_id', usuario.empresa_id)
      .maybeSingle();

    if (!motoristaRecord) {
      return { data: [], error: null };
    }

    // Get caminhoes linked via active vinculos
    const { data: vinculos, error: vincError } = await supabase
      .from('motorista_caminhao')
      .select('caminhao_id')
      .eq('motorista_id', motoristaRecord.id)
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

  // Dono/admin sees all active caminhoes
  const { data, error } = await supabase
    .from('caminhao')
    .select('id, placa, modelo')
    .eq('empresa_id', usuario.empresa_id)
    .eq('ativo', true)
    .order('placa');

  if (error) return { data: null, error: error.message };
  return { data, error: null };
}

/**
 * Create a new gasto.
 * Motorista role: forced to their own motorista_id.
 */
export async function createGasto(
  formData: GastoFormData,
): Promise<GastoActionResult> {
  const usuario = await getCurrentUsuario();
  if (!usuario) {
    return { success: false, error: 'Não autenticado' };
  }

  if (!usuario.ativo) {
    return { success: false, error: 'Usuário desativado' };
  }

  const parsed = gastoSchema.safeParse(formData);
  if (!parsed.success) {
    return { success: false, fieldErrors: extractFieldErrors(parsed.error) };
  }

  const data = parsed.data;

  // Convert BRL string to centavos
  const valorCentavos = parseBrlInputToCentavos(data.valor);
  if (valorCentavos === null || valorCentavos <= 0) {
    return { success: false, fieldErrors: { valor: 'Valor inválido' } };
  }

  // Motorista ownership enforcement
  let motoristaId = data.motorista_id;
  if (usuario.role === 'motorista') {
    // Get motorista record linked to this user
    const supabase = await createClient();
    const { data: motoristaRecord } = await supabase
      .from('motorista')
      .select('id')
      .eq('usuario_id', usuario.id)
      .eq('empresa_id', usuario.empresa_id)
      .maybeSingle();

    if (!motoristaRecord) {
      return { success: false, error: 'Motorista não vinculado ao usuário' };
    }

    // Force motorista to use their own ID regardless of what was submitted
    motoristaId = motoristaRecord.id;
  }

  const supabase = await createClient();
  const { data: gasto, error: insertError } = await supabase
    .from('gasto')
    .insert({
      empresa_id: usuario.empresa_id,
      categoria_id: data.categoria_id,
      motorista_id: motoristaId,
      caminhao_id: data.caminhao_id || null,
      viagem_id: data.viagem_id || null,
      valor: valorCentavos,
      data: data.data,
      descricao: data.descricao || null,
      created_by: usuario.id,
    })
    .select()
    .single();

  if (insertError) {
    return { success: false, error: 'Erro ao registrar gasto. Tente novamente.' };
  }

  revalidatePath('/gastos');
  revalidatePath('/dashboard');
  if (data.viagem_id) {
    revalidatePath(`/viagens/${data.viagem_id}`);
  }
  return { success: true, gasto };
}

/**
 * Update an existing gasto.
 * Motorista role: can only update their own.
 */
export async function updateGasto(
  gastoId: string,
  formData: GastoFormData,
): Promise<GastoActionResult> {
  const usuario = await getCurrentUsuario();
  if (!usuario) {
    return { success: false, error: 'Não autenticado' };
  }

  if (!usuario.ativo) {
    return { success: false, error: 'Usuário desativado' };
  }

  // Only dono can edit gastos after creation
  if (usuario.role !== 'dono') {
    return { success: false, error: 'Apenas o proprietario pode editar despesas' };
  }

  const parsed = gastoSchema.safeParse(formData);
  if (!parsed.success) {
    return { success: false, fieldErrors: extractFieldErrors(parsed.error) };
  }

  const data = parsed.data;

  const valorCentavos = parseBrlInputToCentavos(data.valor);
  if (valorCentavos === null || valorCentavos <= 0) {
    return { success: false, fieldErrors: { valor: 'Valor inválido' } };
  }

  const supabase = await createClient();

  // Dono can freely set motorista_id
  const motoristaId = data.motorista_id;

  const { data: gasto, error: updateError } = await supabase
    .from('gasto')
    .update({
      categoria_id: data.categoria_id,
      motorista_id: motoristaId,
      caminhao_id: data.caminhao_id || null,
      viagem_id: data.viagem_id || null,
      valor: valorCentavos,
      data: data.data,
      descricao: data.descricao || null,
    })
    .eq('id', gastoId)
    .select()
    .single();

  if (updateError) {
    return { success: false, error: 'Erro ao atualizar gasto. Tente novamente.' };
  }

  revalidatePath('/gastos');
  revalidatePath('/dashboard');
  return { success: true, gasto };
}

/**
 * Delete a gasto (hard delete).
 * Only dono/admin can delete gastos. Motorista CANNOT delete.
 */
export async function deleteGasto(
  gastoId: string,
): Promise<{ success: boolean; error?: string }> {
  const usuario = await getCurrentUsuario();
  if (!usuario) {
    return { success: false, error: 'Não autenticado' };
  }

  // Only dono can delete gastos
  if (usuario.role !== 'dono') {
    return { success: false, error: 'Apenas o proprietario pode excluir despesas' };
  }

  const supabase = await createClient();

  const { error } = await supabase
    .from('gasto')
    .delete()
    .eq('id', gastoId);

  if (error) {
    return { success: false, error: 'Erro ao excluir gasto. Tente novamente.' };
  }

  revalidatePath('/gastos');
  revalidatePath('/dashboard');
  return { success: true };
}

/**
 * List gastos for the current user's empresa.
 * Motorista sees only their own (enforced by RLS).
 */
export async function listGastos(): Promise<{
  data: GastoListItem[] | null;
  error: string | null;
}> {
  const usuario = await getCurrentUsuario();
  if (!usuario) {
    return { data: null, error: 'Não autenticado' };
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from('gasto')
    .select(`
      id,
      data,
      valor,
      descricao,
      categoria_gasto ( nome ),
      motorista ( nome ),
      caminhao ( placa )
    `)
    .order('data', { ascending: false })
    .order('created_at', { ascending: false });

  if (error) {
    return { data: null, error: error.message };
  }

  const items: GastoListItem[] = (data ?? []).map((row) => {
    const cat = row.categoria_gasto as unknown as { nome: string } | null;
    const mot = row.motorista as unknown as { nome: string } | null;
    const cam = row.caminhao as unknown as { placa: string } | null;

    return {
      id: row.id,
      data: row.data,
      valor: row.valor,
      descricao: row.descricao,
      categoria_nome: cat?.nome ?? 'Sem categoria',
      motorista_nome: mot?.nome ?? 'Desconhecido',
      caminhao_placa: cam?.placa ?? null,
    };
  });

  return { data: items, error: null };
}

/**
 * Get a single gasto by ID (for edit form).
 */
export async function getGasto(
  gastoId: string,
): Promise<GastoActionResult> {
  const usuario = await getCurrentUsuario();
  if (!usuario) {
    return { success: false, error: 'Não autenticado' };
  }

  const supabase = await createClient();
  const { data: gasto, error } = await supabase
    .from('gasto')
    .select('*')
    .eq('id', gastoId)
    .single();

  if (error || !gasto) {
    return { success: false, error: 'Gasto não encontrado' };
  }

  // Motorista ownership check
  if (usuario.role === 'motorista') {
    const { data: motoristaRecord } = await supabase
      .from('motorista')
      .select('id')
      .eq('usuario_id', usuario.id)
      .eq('empresa_id', usuario.empresa_id)
      .maybeSingle();

    if (!motoristaRecord || gasto.motorista_id !== motoristaRecord.id) {
      return { success: false, error: 'Permissão insuficiente' };
    }
  }

  return { success: true, gasto };
}

/**
 * Fetch filtered gastos with pagination, totals, and subtotals.
 * Story 2.3 — Main listing query.
 */
export async function listGastosFiltered(
  filters: GastoFilters,
): Promise<{ data: GastoListResult | null; error: string | null }> {
  const usuario = await getCurrentUsuario();
  if (!usuario) {
    return { data: null, error: 'Não autenticado' };
  }

  try {
    const result = await getGastos(filters);
    return { data: result, error: null };
  } catch (err) {
    const message =
      err instanceof Error ? err.message : 'Erro ao buscar gastos';
    return { data: null, error: message };
  }
}

/**
 * Fetch filter options (motoristas, caminhoes, categorias).
 * Motorista role: only their own motorista returned.
 */
export async function fetchFilterOptions(): Promise<{
  data: GastoFilterOptions | null;
  error: string | null;
}> {
  const usuario = await getCurrentUsuario();
  if (!usuario) {
    return { data: null, error: 'Não autenticado' };
  }

  try {
    const options = await getGastoFilterOptions(
      usuario.empresa_id!,
      usuario.role,
      usuario.id,
    );
    return { data: options, error: null };
  } catch (err) {
    const message =
      err instanceof Error ? err.message : 'Erro ao buscar opções de filtro';
    return { data: null, error: message };
  }
}

/**
 * Export filtered gastos as CSV.
 * AC9: Only available for dono/admin.
 * Returns CSV string to be downloaded client-side.
 */
export async function exportGastosCsv(
  filters: GastoFilters,
): Promise<{ csv: string | null; error: string | null }> {
  const usuario = await getCurrentUsuario();
  if (!usuario) {
    return { csv: null, error: 'Não autenticado' };
  }

  if (usuario.role === 'motorista') {
    return { csv: null, error: 'Permissão insuficiente' };
  }

  try {
    // Fetch ALL matching gastos (no pagination) for export
    const allFilters: GastoFilters = {
      ...filters,
      page: 1,
      pageSize: 100000, // effectively no limit
    };
    const result = await getGastos(allFilters);
    const csv = generateGastosCsv(result.gastos);
    return { csv, error: null };
  } catch (err) {
    const message =
      err instanceof Error ? err.message : 'Erro ao exportar gastos';
    return { csv: null, error: message };
  }
}

/**
 * Get total gastos for the current month (for dashboard card).
 * Returns total in centavos.
 */
export async function getGastosMesAtual(): Promise<{
  total: number; // centavos
  error: string | null;
}> {
  const usuario = await getCurrentUsuario();
  if (!usuario) {
    return { total: 0, error: 'Não autenticado' };
  }

  const now = new Date();
  const primeiroDiaMes = new Date(now.getFullYear(), now.getMonth(), 1)
    .toISOString()
    .split('T')[0];

  const supabase = await createClient();
  const { data, error } = await supabase
    .from('gasto')
    .select('valor')
    .gte('data', primeiroDiaMes);

  if (error) {
    return { total: 0, error: error.message };
  }

  const total = (data ?? []).reduce((sum, row) => sum + row.valor, 0);
  return { total, error: null };
}

/**
 * List viagens ativas (planejada or em_andamento) for the gasto form select.
 * Returns minimal fields needed for display and auto-fill.
 */
export async function listViagensAtivas(): Promise<{
  data: Array<{
    id: string;
    origem: string;
    destino: string;
    status: string;
    motorista_id: string;
    caminhao_id: string;
    motorista_nome: string | null;
    caminhao_placa: string | null;
  }> | null;
  error: string | null;
}> {
  const usuario = await getCurrentUsuario();
  if (!usuario) {
    return { data: null, error: 'Não autenticado' };
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from('viagem')
    .select('id, origem, destino, status, motorista_id, caminhao_id, motorista:motorista_id(nome), caminhao:caminhao_id(placa)')
    .in('status', ['planejada', 'em_andamento'])
    .order('data_saida', { ascending: false });

  if (error) {
    return { data: null, error: error.message };
  }

  const mapped = (data ?? []).map((v) => ({
    id: v.id,
    origem: v.origem,
    destino: v.destino,
    status: v.status,
    motorista_id: v.motorista_id,
    caminhao_id: v.caminhao_id,
    motorista_nome: (v.motorista as { nome: string } | null)?.nome ?? null,
    caminhao_placa: (v.caminhao as { placa: string } | null)?.placa ?? null,
  }));

  return { data: mapped, error: null };
}
