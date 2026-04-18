'use server';

import { z } from 'zod';
import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import { requireRole } from '@/lib/auth/get-user-role';
import { validatePlaca, normalizePlaca } from '@/lib/utils/validate-placa';
import { validateRenavam, stripRenavam } from '@/lib/utils/validate-renavam';
import { parseBrlInputToCentavos } from '@/lib/utils/currency';
import { isValidDateBr } from '@/lib/utils/validate-date-br';
import type { CaminhaoActionResult, CaminhaoFormData } from '@/types/caminhao';
import { logAuditEvent } from '@/lib/observability/audit';

const caminhaoSchema = z.object({
  placa: z.string()
    .min(1, 'Placa é obrigatória')
    .refine((val) => validatePlaca(val), 'Placa inválida. Use formato Mercosul (ABC1D23) ou antigo (ABC-1234)'),
  modelo: z.string()
    .min(1, 'Modelo é obrigatório')
    .max(100, 'Modelo deve ter no máximo 100 caracteres'),
  marca: z.string().max(100, 'Marca deve ter no máximo 100 caracteres'),
  ano: z.string().refine(
    (val) => {
      if (val === '') return true;
      const num = parseInt(val, 10);
      const maxYear = new Date().getFullYear() + 1;
      return !isNaN(num) && num >= 1970 && num <= maxYear;
    },
    'Ano inválido (1970 até ano atual + 1)',
  ),
  renavam: z.string().refine(
    (val) => validateRenavam(val),
    'RENAVAM inválido',
  ),
  tipo_cegonha: z.enum(['aberta', 'fechada'], {
    error: 'Tipo de cegonha é obrigatório',
  }),
  capacidade_veiculos: z.string()
    .min(1, 'Capacidade é obrigatória')
    .refine(
      (val) => {
        const num = parseInt(val, 10);
        return !isNaN(num) && num >= 1 && num <= 15;
      },
      'Capacidade deve ser entre 1 e 15 veículos',
    ),
  km_atual: z.string().refine(
    (val) => {
      if (val === '' || val === '0') return true;
      const num = parseInt(val, 10);
      return !isNaN(num) && num >= 0;
    },
    'Km deve ser um número positivo',
  ),
  observacao: z.string().max(500, 'Observação deve ter no máximo 500 caracteres'),
  doc_vencimento: z.string().refine(isValidDateBr, 'Data invalida. Use DD/MM/AAAA'),
  ipva_pago: z.boolean().default(false),
  ipva_valor_centavos: z.string().refine(
    (val) => {
      if (val === '' || val === '0,00') return true;
      const centavos = parseBrlInputToCentavos(val);
      return centavos !== null && centavos >= 0;
    },
    'Valor invalido',
  ),
  ipva_ano_referencia: z.string().refine(
    (val) => {
      if (val === '') return true;
      const num = parseInt(val, 10);
      return !isNaN(num) && num >= 2000 && num <= new Date().getFullYear() + 1;
    },
    'Ano invalido (2000 ate ano atual + 1)',
  ),
});

function parseDocVencimento(val: string): string | null {
  if (!val) return null;
  if (/^\d{4}-\d{2}-\d{2}$/.test(val)) return val;
  if (/^\d{2}\/\d{2}\/\d{4}$/.test(val)) {
    const [d, m, y] = val.split('/');
    return `${y}-${m}-${d}`;
  }
  return null;
}

function extractFieldErrors(
  error: z.ZodError,
): Partial<Record<keyof CaminhaoFormData, string>> {
  const fieldErrors: Partial<Record<keyof CaminhaoFormData, string>> = {};
  for (const issue of error.issues) {
    const field = issue.path[0] as keyof CaminhaoFormData;
    if (!fieldErrors[field]) {
      fieldErrors[field] = issue.message;
    }
  }
  return fieldErrors;
}

/**
 * List all caminhoes for the current user's empresa.
 * Requires role: dono or admin.
 */
export async function listCaminhoes(): Promise<{
  data: Array<{
    id: string;
    placa: string;
    modelo: string;
    marca: string | null;
    tipo_cegonha: string;
    capacidade_veiculos: number;
    km_atual: number;
    ativo: boolean;
    doc_vencimento: string | null;
  }> | null;
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
    .select('id, placa, modelo, marca, tipo_cegonha, capacidade_veiculos, km_atual, ativo, doc_vencimento')
    .order('created_at', { ascending: false });

  if (error) {
    return { data: null, error: error.message };
  }

  return { data, error: null };
}

/**
 * Get a single caminhao by ID.
 * Requires role: dono or admin.
 */
export async function getCaminhao(id: string): Promise<CaminhaoActionResult> {
  try {
    await requireRole(['dono', 'admin']);
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Permissão insuficiente',
    };
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from('caminhao')
    .select('*')
    .eq('id', id)
    .single();

  if (error || !data) {
    return { success: false, error: 'Caminhão não encontrado' };
  }

  return { success: true, caminhao: data };
}

/**
 * Create a new caminhao.
 * Requires role: dono or admin.
 */
export async function createCaminhao(
  formData: CaminhaoFormData,
): Promise<CaminhaoActionResult> {
  let currentUsuario;
  try {
    currentUsuario = await requireRole(['dono', 'admin']);
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Permissão insuficiente',
    };
  }

  const parsed = caminhaoSchema.safeParse(formData);
  if (!parsed.success) {
    return { success: false, fieldErrors: extractFieldErrors(parsed.error) };
  }

  const data = parsed.data;
  const placaNormalized = normalizePlaca(data.placa);
  const renavamStripped = data.renavam ? stripRenavam(data.renavam) : null;

  const supabase = await createClient();

  // Check duplicate placa within empresa
  const { data: existing } = await supabase
    .from('caminhao')
    .select('id')
    .eq('empresa_id', currentUsuario.empresa_id)
    .eq('placa', placaNormalized)
    .maybeSingle();

  if (existing) {
    return {
      success: false,
      fieldErrors: { placa: 'Placa ja cadastrada nesta empresa' },
    };
  }

  const { data: caminhao, error: insertError } = await supabase
    .from('caminhao')
    .insert({
      empresa_id: currentUsuario.empresa_id,
      placa: placaNormalized,
      modelo: data.modelo,
      marca: data.marca || null,
      ano: data.ano ? parseInt(data.ano, 10) : null,
      renavam: renavamStripped || null,
      tipo_cegonha: data.tipo_cegonha,
      capacidade_veiculos: parseInt(data.capacidade_veiculos, 10),
      km_atual: data.km_atual ? parseInt(data.km_atual, 10) : 0,
      observacao: data.observacao || null,
      doc_vencimento: parseDocVencimento(data.doc_vencimento),
      ipva_pago: data.ipva_pago ?? false,
      ipva_valor_centavos: data.ipva_valor_centavos ? parseBrlInputToCentavos(data.ipva_valor_centavos) : null,
      ipva_ano_referencia: data.ipva_ano_referencia ? parseInt(data.ipva_ano_referencia, 10) : null,
    })
    .select()
    .single();

  if (insertError) {
    if (insertError.code === '23505') {
      return {
        success: false,
        fieldErrors: { placa: 'Placa ja cadastrada nesta empresa' },
      };
    }
    return { success: false, error: 'Erro ao cadastrar caminhao. Tente novamente.' };
  }

  await logAuditEvent({
    supabase,
    usuarioId: currentUsuario.id,
    usuarioRole: currentUsuario.role,
    usuarioNome: currentUsuario.nome,
    empresaId: currentUsuario.empresa_id!,
    acao: 'create',
    entidade: 'caminhao',
    entidadeId: caminhao.id,
    entidadeDescricao: `${placaNormalized} — ${data.modelo}`,
    valoresDepois: {
      placa: placaNormalized,
      modelo: data.modelo,
      marca: data.marca,
      ano: data.ano,
      tipo_cegonha: data.tipo_cegonha,
      capacidade_veiculos: data.capacidade_veiculos,
    },
  });

  revalidatePath('/caminhoes');
  return { success: true, caminhao };
}

/**
 * Update an existing caminhao.
 * Requires role: dono or admin.
 */
export async function updateCaminhao(
  caminhaoId: string,
  formData: CaminhaoFormData,
): Promise<CaminhaoActionResult> {
  let currentUsuario;
  try {
    currentUsuario = await requireRole(['dono', 'admin']);
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Permissão insuficiente',
    };
  }

  const parsed = caminhaoSchema.safeParse(formData);
  if (!parsed.success) {
    return { success: false, fieldErrors: extractFieldErrors(parsed.error) };
  }

  const data = parsed.data;
  const placaNormalized = normalizePlaca(data.placa);
  const renavamStripped = data.renavam ? stripRenavam(data.renavam) : null;

  const supabase = await createClient();

  // Check duplicate placa within empresa (excluding this caminhao)
  const { data: existing } = await supabase
    .from('caminhao')
    .select('id')
    .eq('empresa_id', currentUsuario.empresa_id)
    .eq('placa', placaNormalized)
    .neq('id', caminhaoId)
    .maybeSingle();

  if (existing) {
    return {
      success: false,
      fieldErrors: { placa: 'Placa ja cadastrada nesta empresa' },
    };
  }

  const { data: caminhao, error: updateError } = await supabase
    .from('caminhao')
    .update({
      placa: placaNormalized,
      modelo: data.modelo,
      marca: data.marca || null,
      ano: data.ano ? parseInt(data.ano, 10) : null,
      renavam: renavamStripped || null,
      tipo_cegonha: data.tipo_cegonha,
      capacidade_veiculos: parseInt(data.capacidade_veiculos, 10),
      km_atual: data.km_atual ? parseInt(data.km_atual, 10) : 0,
      observacao: data.observacao || null,
      doc_vencimento: parseDocVencimento(data.doc_vencimento),
      ipva_pago: data.ipva_pago ?? false,
      ipva_valor_centavos: data.ipva_valor_centavos ? parseBrlInputToCentavos(data.ipva_valor_centavos) : null,
      ipva_ano_referencia: data.ipva_ano_referencia ? parseInt(data.ipva_ano_referencia, 10) : null,
    })
    .eq('id', caminhaoId)
    .select()
    .single();

  if (updateError) {
    if (updateError.code === '23505') {
      return {
        success: false,
        fieldErrors: { placa: 'Placa ja cadastrada nesta empresa' },
      };
    }
    return { success: false, error: 'Erro ao atualizar caminhao. Tente novamente.' };
  }

  await logAuditEvent({
    supabase,
    usuarioId: currentUsuario.id,
    usuarioRole: currentUsuario.role,
    usuarioNome: currentUsuario.nome,
    empresaId: currentUsuario.empresa_id!,
    acao: 'update',
    entidade: 'caminhao',
    entidadeId: caminhaoId,
    entidadeDescricao: `${placaNormalized} — ${data.modelo}`,
    valoresDepois: {
      placa: placaNormalized,
      modelo: data.modelo,
      km_atual: data.km_atual,
      doc_vencimento: parseDocVencimento(data.doc_vencimento),
      ipva_pago: data.ipva_pago,
      ipva_ano_referencia: data.ipva_ano_referencia,
    },
  });

  revalidatePath('/caminhoes');
  return { success: true, caminhao };
}

/**
 * Soft-delete: toggle caminhao ativo status.
 * Requires role: dono or admin.
 */
export async function toggleCaminhaoAtivo(
  caminhaoId: string,
  ativo: boolean,
): Promise<{ error: string | null }> {
  let currentUsuario;
  try {
    currentUsuario = await requireRole(['dono', 'admin']);
  } catch (err) {
    return {
      error: err instanceof Error ? err.message : 'Permissão insuficiente',
    };
  }

  const supabase = await createClient();

  // Capta placa antes pra descricao do audit
  const { data: caminhaoAntes } = await supabase
    .from('caminhao')
    .select('placa, modelo, ativo')
    .eq('id', caminhaoId)
    .single();

  const { error } = await supabase
    .from('caminhao')
    .update({ ativo })
    .eq('id', caminhaoId);

  if (error) {
    return { error: 'Erro ao alterar status do caminhao.' };
  }

  await logAuditEvent({
    supabase,
    usuarioId: currentUsuario.id,
    usuarioRole: currentUsuario.role,
    usuarioNome: currentUsuario.nome,
    empresaId: currentUsuario.empresa_id!,
    acao: 'update',
    entidade: 'caminhao',
    entidadeId: caminhaoId,
    entidadeDescricao: caminhaoAntes
      ? `${caminhaoAntes.placa} — ${ativo ? 'reativado' : 'inativado'}`
      : `Status: ${ativo ? 'ativo' : 'inativo'}`,
    valoresAntes: { ativo: caminhaoAntes?.ativo },
    valoresDepois: { ativo },
  });

  revalidatePath('/caminhoes');
  return { error: null };
}
