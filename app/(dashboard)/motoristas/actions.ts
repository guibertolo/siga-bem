'use server';

import { z } from 'zod';
import { createClient } from '@/lib/supabase/server';
import { requireRole } from '@/lib/auth/get-user-role';
import { validateCPF, formatCPF, stripCPF } from '@/lib/utils/validate-cpf';
import type { MotoristaActionResult, MotoristaFormData, MotoristaListItem } from '@/types/motorista';
import { isCnhExpired, isCnhExpiringSoon } from '@/lib/utils/validate-cpf';

const CNH_CATEGORIAS = ['A', 'B', 'C', 'D', 'E', 'AB', 'AC', 'AD', 'AE'] as const;

const motoristaSchema = z.object({
  nome: z.string()
    .min(1, 'Nome e obrigatorio')
    .max(255, 'Nome deve ter no maximo 255 caracteres'),
  cpf: z.string()
    .min(1, 'CPF e obrigatorio')
    .refine((val) => validateCPF(val), 'CPF invalido'),
  cnh_numero: z.string()
    .min(1, 'Numero da CNH e obrigatorio')
    .max(20, 'Numero da CNH deve ter no maximo 20 caracteres'),
  cnh_categoria: z.enum(CNH_CATEGORIAS, {
    error: 'Categoria da CNH invalida',
  }),
  cnh_validade: z.string()
    .min(1, 'Validade da CNH e obrigatoria')
    .refine((val) => !isNaN(Date.parse(val)), 'Data invalida'),
  telefone: z.string().max(20, 'Telefone deve ter no maximo 20 caracteres'),
  observacao: z.string().max(1000, 'Observacao deve ter no maximo 1000 caracteres'),
});

const updateMotoristaSchema = motoristaSchema.omit({ cpf: true });

export async function createMotorista(
  formData: MotoristaFormData,
): Promise<MotoristaActionResult> {
  let currentUsuario;
  try {
    currentUsuario = await requireRole(['dono', 'admin']);
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Permissao insuficiente',
    };
  }

  // Validate input
  const parsed = motoristaSchema.safeParse(formData);
  if (!parsed.success) {
    const fieldErrors: Partial<Record<keyof MotoristaFormData, string>> = {};
    for (const issue of parsed.error.issues) {
      const field = issue.path[0] as keyof MotoristaFormData;
      if (!fieldErrors[field]) {
        fieldErrors[field] = issue.message;
      }
    }
    return { success: false, fieldErrors };
  }

  const data = parsed.data;
  const formattedCPF = formatCPF(stripCPF(data.cpf));

  const supabase = await createClient();

  // Check for duplicate CPF within empresa
  const { data: existing } = await supabase
    .from('motorista')
    .select('id')
    .eq('empresa_id', currentUsuario.empresa_id)
    .eq('cpf', formattedCPF)
    .maybeSingle();

  if (existing) {
    return {
      success: false,
      fieldErrors: { cpf: 'CPF ja cadastrado nesta empresa' },
    };
  }

  // Insert motorista
  const { data: motorista, error: insertError } = await supabase
    .from('motorista')
    .insert({
      empresa_id: currentUsuario.empresa_id,
      nome: data.nome,
      cpf: formattedCPF,
      cnh_numero: data.cnh_numero,
      cnh_categoria: data.cnh_categoria,
      cnh_validade: data.cnh_validade,
      telefone: data.telefone || null,
      observacao: data.observacao || null,
    })
    .select()
    .single();

  if (insertError) {
    if (insertError.code === '23505') {
      return {
        success: false,
        fieldErrors: { cpf: 'CPF ja cadastrado nesta empresa' },
      };
    }
    return { success: false, error: 'Erro ao cadastrar motorista. Tente novamente.' };
  }

  return { success: true, motorista };
}

export async function updateMotorista(
  motoristaId: string,
  formData: Omit<MotoristaFormData, 'cpf'>,
): Promise<MotoristaActionResult> {
  try {
    await requireRole(['dono', 'admin']);
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Permissao insuficiente',
    };
  }

  const parsed = updateMotoristaSchema.safeParse(formData);
  if (!parsed.success) {
    const fieldErrors: Partial<Record<keyof MotoristaFormData, string>> = {};
    for (const issue of parsed.error.issues) {
      const field = issue.path[0] as keyof MotoristaFormData;
      if (!fieldErrors[field]) {
        fieldErrors[field] = issue.message;
      }
    }
    return { success: false, fieldErrors };
  }

  const data = parsed.data;

  const supabase = await createClient();

  const { data: motorista, error: updateError } = await supabase
    .from('motorista')
    .update({
      nome: data.nome,
      cnh_numero: data.cnh_numero,
      cnh_categoria: data.cnh_categoria,
      cnh_validade: data.cnh_validade,
      telefone: data.telefone || null,
      observacao: data.observacao || null,
    })
    .eq('id', motoristaId)
    .select()
    .single();

  if (updateError) {
    return { success: false, error: 'Erro ao atualizar motorista. Tente novamente.' };
  }

  return { success: true, motorista };
}

export async function softDeleteMotorista(
  motoristaId: string,
): Promise<MotoristaActionResult> {
  try {
    await requireRole(['dono', 'admin']);
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Permissao insuficiente',
    };
  }

  const supabase = await createClient();

  const { data: motorista, error } = await supabase
    .from('motorista')
    .update({ status: 'inativo' })
    .eq('id', motoristaId)
    .select()
    .single();

  if (error) {
    return { success: false, error: 'Erro ao inativar motorista. Tente novamente.' };
  }

  return { success: true, motorista };
}

export async function reactivateMotorista(
  motoristaId: string,
): Promise<MotoristaActionResult> {
  try {
    await requireRole(['dono', 'admin']);
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Permissao insuficiente',
    };
  }

  const supabase = await createClient();

  const { data: motorista, error } = await supabase
    .from('motorista')
    .update({ status: 'ativo' })
    .eq('id', motoristaId)
    .select()
    .single();

  if (error) {
    return { success: false, error: 'Erro ao reativar motorista. Tente novamente.' };
  }

  return { success: true, motorista };
}

export async function listMotoristas(): Promise<{
  success: boolean;
  error?: string;
  motoristas?: MotoristaListItem[];
}> {
  try {
    await requireRole(['dono', 'admin']);
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Permissao insuficiente',
    };
  }

  const supabase = await createClient();

  const { data: motoristas, error } = await supabase
    .from('motorista')
    .select('id, nome, cpf, cnh_numero, cnh_categoria, cnh_validade, telefone, status')
    .order('nome', { ascending: true });

  if (error) {
    return { success: false, error: 'Erro ao carregar motoristas.' };
  }

  const items: MotoristaListItem[] = (motoristas ?? []).map((m) => ({
    id: m.id,
    nome: m.nome,
    cpf: m.cpf,
    cnh_numero: m.cnh_numero,
    cnh_categoria: m.cnh_categoria,
    cnh_validade: m.cnh_validade,
    telefone: m.telefone,
    status: m.status,
    cnh_vencida: isCnhExpired(m.cnh_validade),
    cnh_vence_em_30_dias: isCnhExpiringSoon(m.cnh_validade, 30),
  }));

  return { success: true, motoristas: items };
}

export async function getMotorista(
  motoristaId: string,
): Promise<MotoristaActionResult> {
  try {
    await requireRole(['dono', 'admin']);
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Permissao insuficiente',
    };
  }

  const supabase = await createClient();

  const { data: motorista, error } = await supabase
    .from('motorista')
    .select('*')
    .eq('id', motoristaId)
    .single();

  if (error || !motorista) {
    return { success: false, error: 'Motorista nao encontrado' };
  }

  return { success: true, motorista };
}
