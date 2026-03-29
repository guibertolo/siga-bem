'use server';

import { z } from 'zod';
import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import { getCurrentUsuario } from '@/lib/auth/get-user-role';
import { parseBrlInputToCentavos } from '@/lib/utils/currency';
import type {
  CombustivelPreco,
  CombustivelPrecoActionResult,
  CombustivelPrecoFormData,
  MediaCombustivelRegiao,
} from '@/types/precificacao';
import { PRECO_DIESEL_PADRAO_CENTAVOS } from '@/types/precificacao';

// ---------------------------------------------------------------------------
// Schemas
// ---------------------------------------------------------------------------

const combustivelPrecoSchema = z.object({
  regiao: z.string()
    .min(1, 'Regiao e obrigatoria')
    .max(100, 'Regiao deve ter no maximo 100 caracteres'),
  tipo: z.enum(['diesel_s10', 'diesel_comum'], {
    error: 'Selecione um tipo de combustivel',
  }),
  preco: z.string()
    .min(1, 'Preco e obrigatorio')
    .refine((val) => {
      const centavos = parseBrlInputToCentavos(val);
      return centavos !== null && centavos > 0;
    }, 'Preco deve ser maior que zero'),
  data_referencia: z.string()
    .min(1, 'Data de referencia e obrigatoria')
    .refine((val) => !isNaN(Date.parse(val)), 'Data de referencia invalida'),
  fonte: z.string().max(100, 'Fonte deve ter no maximo 100 caracteres'),
});

function extractFieldErrors(
  error: z.ZodError,
): Partial<Record<keyof CombustivelPrecoFormData, string>> {
  const fieldErrors: Partial<Record<keyof CombustivelPrecoFormData, string>> = {};
  for (const issue of error.issues) {
    const field = issue.path[0] as keyof CombustivelPrecoFormData;
    if (!fieldErrors[field]) {
      fieldErrors[field] = issue.message;
    }
  }
  return fieldErrors;
}

// ---------------------------------------------------------------------------
// CRUD Operations
// ---------------------------------------------------------------------------

/**
 * Create a new combustivel preco.
 * Only dono/admin can manage fuel prices.
 */
export async function createCombustivelPreco(
  formData: CombustivelPrecoFormData,
): Promise<CombustivelPrecoActionResult> {
  const usuario = await getCurrentUsuario();
  if (!usuario) {
    return { success: false, error: 'Nao autenticado' };
  }

  if (usuario.role === 'motorista') {
    return { success: false, error: 'Motorista nao pode gerenciar precos de combustivel' };
  }

  const parsed = combustivelPrecoSchema.safeParse(formData);
  if (!parsed.success) {
    return { success: false, fieldErrors: extractFieldErrors(parsed.error) };
  }

  const data = parsed.data;
  const precoCentavos = parseBrlInputToCentavos(data.preco);
  if (precoCentavos === null || precoCentavos <= 0) {
    return { success: false, fieldErrors: { preco: 'Preco invalido' } };
  }

  const supabase = await createClient();

  const { data: preco, error: insertError } = await supabase
    .from('combustivel_preco')
    .insert({
      empresa_id: usuario.empresa_id,
      regiao: data.regiao,
      tipo: data.tipo,
      preco_centavos: precoCentavos,
      data_referencia: data.data_referencia,
      fonte: data.fonte || null,
      ativo: true,
    })
    .select()
    .single();

  if (insertError) {
    return { success: false, error: 'Erro ao cadastrar preco. Tente novamente.' };
  }

  revalidatePath('/configuracoes/combustivel');
  return { success: true, preco };
}

/**
 * Update an existing combustivel preco.
 */
export async function updateCombustivelPreco(
  precoId: string,
  formData: CombustivelPrecoFormData,
): Promise<CombustivelPrecoActionResult> {
  const usuario = await getCurrentUsuario();
  if (!usuario) {
    return { success: false, error: 'Nao autenticado' };
  }

  if (usuario.role === 'motorista') {
    return { success: false, error: 'Motorista nao pode gerenciar precos de combustivel' };
  }

  const parsed = combustivelPrecoSchema.safeParse(formData);
  if (!parsed.success) {
    return { success: false, fieldErrors: extractFieldErrors(parsed.error) };
  }

  const data = parsed.data;
  const precoCentavos = parseBrlInputToCentavos(data.preco);
  if (precoCentavos === null || precoCentavos <= 0) {
    return { success: false, fieldErrors: { preco: 'Preco invalido' } };
  }

  const supabase = await createClient();

  const { data: preco, error: updateError } = await supabase
    .from('combustivel_preco')
    .update({
      regiao: data.regiao,
      tipo: data.tipo,
      preco_centavos: precoCentavos,
      data_referencia: data.data_referencia,
      fonte: data.fonte || null,
    })
    .eq('id', precoId)
    .select()
    .single();

  if (updateError) {
    return { success: false, error: 'Erro ao atualizar preco. Tente novamente.' };
  }

  revalidatePath('/configuracoes/combustivel');
  return { success: true, preco };
}

/**
 * Delete (soft-delete via ativo=false) a combustivel preco.
 */
export async function deleteCombustivelPreco(
  precoId: string,
): Promise<{ success: boolean; error?: string }> {
  const usuario = await getCurrentUsuario();
  if (!usuario) {
    return { success: false, error: 'Nao autenticado' };
  }

  if (usuario.role === 'motorista') {
    return { success: false, error: 'Motorista nao pode gerenciar precos de combustivel' };
  }

  const supabase = await createClient();

  const { error } = await supabase
    .from('combustivel_preco')
    .update({ ativo: false })
    .eq('id', precoId);

  if (error) {
    return { success: false, error: 'Erro ao excluir preco. Tente novamente.' };
  }

  revalidatePath('/configuracoes/combustivel');
  return { success: true };
}

/**
 * List active combustivel precos for the current user's empresa.
 */
export async function listCombustivelPrecos(): Promise<{
  data: CombustivelPreco[] | null;
  error: string | null;
}> {
  const usuario = await getCurrentUsuario();
  if (!usuario) {
    return { data: null, error: 'Nao autenticado' };
  }

  const supabase = await createClient();

  const { data, error } = await supabase
    .from('combustivel_preco')
    .select('*')
    .eq('empresa_id', usuario.empresa_id)
    .eq('ativo', true)
    .order('data_referencia', { ascending: false });

  if (error) {
    return { data: null, error: error.message };
  }

  return { data, error: null };
}

/**
 * Get the most recent diesel price for the empresa.
 * Used by the estimativa calculation.
 * Falls back to PRECO_DIESEL_PADRAO_CENTAVOS if none configured.
 */
export async function getPrecoDieselAtual(): Promise<{
  precoCentavos: number;
  fonte: 'tabela' | 'padrao';
  regiao?: string;
}> {
  const usuario = await getCurrentUsuario();
  if (!usuario) {
    return { precoCentavos: PRECO_DIESEL_PADRAO_CENTAVOS, fonte: 'padrao' };
  }

  const supabase = await createClient();

  const { data, error } = await supabase
    .from('combustivel_preco')
    .select('preco_centavos, regiao')
    .eq('empresa_id', usuario.empresa_id)
    .eq('ativo', true)
    .eq('tipo', 'diesel_s10')
    .order('data_referencia', { ascending: false })
    .limit(1)
    .single();

  if (error || !data) {
    return { precoCentavos: PRECO_DIESEL_PADRAO_CENTAVOS, fonte: 'padrao' };
  }

  return {
    precoCentavos: data.preco_centavos,
    fonte: 'tabela',
    regiao: data.regiao,
  };
}

/**
 * Get fuel price averages by region from the vw_media_combustivel_regiao view.
 * Only accessible by role=dono (Story 5.4, AC 2).
 * RLS on the view filters by empresa_id automatically.
 */
export async function getMediaPorRegiao(): Promise<{
  data: MediaCombustivelRegiao[] | null;
  error: string | null;
}> {
  const usuario = await getCurrentUsuario();
  if (!usuario) {
    return { data: null, error: 'Nao autenticado' };
  }

  if (usuario.role !== 'dono') {
    return { data: null, error: 'Acesso restrito ao dono da empresa' };
  }

  const supabase = await createClient();

  const { data, error } = await supabase
    .from('vw_media_combustivel_regiao')
    .select('*')
    .order('uf_abastecimento', { ascending: true });

  if (error) {
    return { data: null, error: error.message };
  }

  return { data: data as MediaCombustivelRegiao[], error: null };
}
