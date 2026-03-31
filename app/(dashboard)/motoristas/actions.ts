'use server';

import { z } from 'zod';
import { createClient } from '@/lib/supabase/server';
import { requireRole } from '@/lib/auth/get-user-role';
import { validateCPF, formatCPF, stripCPF } from '@/lib/utils/validate-cpf';
import type {
  MotoristaActionResult,
  MotoristaFormData,
  MotoristaComContaFormData,
  MotoristaComContaActionResult,
  MotoristaListItem,
} from '@/types/motorista';
import { createAdminClient } from '@/lib/supabase/admin';
import { gerarSenhaTemporaria } from '@/lib/utils/gerar-senha';
import { isCnhExpired, isCnhExpiringSoon } from '@/lib/utils/validate-cpf';

const CNH_CATEGORIAS = ['A', 'B', 'C', 'D', 'E', 'AB', 'AC', 'AD', 'AE'] as const;

const motoristaSchema = z.object({
  nome: z.string()
    .min(1, 'Nome é obrigatório')
    .max(255, 'Nome deve ter no máximo 255 caracteres'),
  cpf: z.string()
    .min(1, 'CPF é obrigatório')
    .refine((val) => validateCPF(val), 'CPF inválido'),
  cnh_numero: z.string()
    .min(1, 'Número da CNH é obrigatório')
    .max(20, 'Número da CNH deve ter no máximo 20 caracteres'),
  cnh_categoria: z.enum(CNH_CATEGORIAS, {
    error: 'Categoria da CNH inválida',
  }),
  cnh_validade: z.string()
    .min(1, 'Validade da CNH é obrigatória')
    .refine((val) => !isNaN(Date.parse(val)), 'Data inválida'),
  telefone: z.string().max(20, 'Telefone deve ter no máximo 20 caracteres'),
  observacao: z.string().max(1000, 'Observação deve ter no máximo 1000 caracteres'),
  percentual_pagamento: z.string()
    .refine(
      (val) => {
        if (val === '') return true;
        const num = parseFloat(val.replace(',', '.'));
        return !isNaN(num) && num >= 0 && num <= 100;
      },
      'Percentual deve ser entre 0 e 100',
    ),
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
      error: err instanceof Error ? err.message : 'Permissão insuficiente',
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

  // Parse percentual
  const percentualStr = data.percentual_pagamento?.replace(',', '.') ?? '';
  const percentualValue = percentualStr !== '' ? parseFloat(percentualStr) : null;

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
      percentual_pagamento: percentualValue,
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

/**
 * Schema de validacao para motorista com conta.
 * Estende o schema base com email obrigatorio.
 */
const motoristaComContaSchema = motoristaSchema.extend({
  email: z.string().min(1, 'Email é obrigatório').email('Email inválido'),
  criar_conta: z.literal(true),
});

/**
 * Server action atomica: cria auth user + motorista + usuario + usuario_empresa.
 *
 * Estrategia de atomicidade:
 * - Supabase JS SDK nao suporta transacoes cross-schema
 * - Auth user e criado primeiro via admin API
 * - Se qualquer insercao no banco falhar, o auth user e deletado (rollback)
 * - A senha temporaria e retornada UMA VEZ para exibicao — nunca armazenada no projeto
 *
 * Story 8.1
 */
export async function createMotoristaComConta(
  formData: MotoristaComContaFormData,
): Promise<MotoristaComContaActionResult> {
  // 1. Validar role do usuario autenticado (AC: 12)
  let currentUsuario;
  try {
    currentUsuario = await requireRole(['dono', 'admin']);
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Permissão insuficiente',
    };
  }

  // 2. Validar schema incluindo email (AC: 2)
  const parsed = motoristaComContaSchema.safeParse(formData);
  if (!parsed.success) {
    const fieldErrors: Partial<Record<keyof MotoristaComContaFormData, string>> = {};
    for (const issue of parsed.error.issues) {
      const field = issue.path[0] as keyof MotoristaComContaFormData;
      if (!fieldErrors[field]) {
        fieldErrors[field] = issue.message;
      }
    }
    return { success: false, fieldErrors };
  }

  const data = parsed.data;
  const formattedCPF = formatCPF(stripCPF(data.cpf));
  const empresaId = currentUsuario.empresa_id;

  if (!empresaId) {
    return { success: false, error: 'Usuario sem empresa vinculada' };
  }

  const supabase = await createClient();

  // Check for duplicate CPF within empresa
  const { data: existingMotorista } = await supabase
    .from('motorista')
    .select('id')
    .eq('empresa_id', empresaId)
    .eq('cpf', formattedCPF)
    .maybeSingle();

  if (existingMotorista) {
    return {
      success: false,
      fieldErrors: { cpf: 'CPF ja cadastrado nesta empresa' },
    };
  }

  // 3. Gerar senha temporaria (AC: 3)
  const senhaGerada = gerarSenhaTemporaria();

  // 4. Criar auth user via admin client (AC: 4, 5)
  const adminClient = createAdminClient();
  const { data: authData, error: authError } = await adminClient.auth.admin.createUser({
    email: data.email,
    password: senhaGerada,
    email_confirm: true,
    user_metadata: { nome: data.nome, must_change_password: true },
  });

  if (authError || !authData.user) {
    // AC: 5 — Se createUser falhar, retornar erro imediatamente
    const message = authError?.message?.includes('already been registered')
      ? 'Este email ja esta em uso no sistema'
      : `Erro ao criar conta de acesso: ${authError?.message ?? 'Erro desconhecido'}`;
    return { success: false, fieldErrors: { email: message } };
  }

  const authUserId = authData.user.id;

  // De agora em diante, qualquer falha exige rollback do auth user (AC: 10)
  try {
    // Parse percentual
    const percStr = data.percentual_pagamento?.replace(',', '.') ?? '';
    const percValue = percStr !== '' ? parseFloat(percStr) : null;

    // 5. Inserir motorista com usuario_id = null provisoriamente (AC: 6)
    const { data: motorista, error: motoristaError } = await supabase
      .from('motorista')
      .insert({
        empresa_id: empresaId,
        nome: data.nome,
        cpf: formattedCPF,
        cnh_numero: data.cnh_numero,
        cnh_categoria: data.cnh_categoria,
        cnh_validade: data.cnh_validade,
        telefone: data.telefone || null,
        observacao: data.observacao || null,
        percentual_pagamento: percValue,
        usuario_id: null,
      })
      .select()
      .single();

    if (motoristaError || !motorista) {
      if (motoristaError?.code === '23505') {
        throw new Error('CPF ja cadastrado nesta empresa');
      }
      throw new Error(`Erro ao cadastrar motorista: ${motoristaError?.message ?? 'Erro desconhecido'}`);
    }

    // 6. Inserir usuario com motorista_id (AC: 7)
    const { data: usuario, error: usuarioError } = await supabase
      .from('usuario')
      .insert({
        auth_id: authUserId,
        empresa_id: empresaId,
        motorista_id: motorista.id,
        nome: data.nome,
        email: data.email,
        role: 'motorista',
        ativo: true,
      })
      .select()
      .single();

    if (usuarioError || !usuario) {
      throw new Error(`Erro ao criar registro de usuario: ${usuarioError?.message ?? 'Erro desconhecido'}`);
    }

    // 7. Inserir usuario_empresa (AC: 8)
    const { error: vinculoError } = await supabase
      .from('usuario_empresa')
      .insert({
        usuario_id: usuario.id,
        empresa_id: empresaId,
        role: 'motorista',
      });

    if (vinculoError) {
      throw new Error(`Erro ao vincular usuario a empresa: ${vinculoError.message}`);
    }

    // 8. Atualizar motorista.usuario_id — vinculo bidirecional (AC: 9)
    const { error: updateMotoristaError } = await supabase
      .from('motorista')
      .update({ usuario_id: usuario.id })
      .eq('id', motorista.id);

    if (updateMotoristaError) {
      throw new Error(`Erro ao vincular usuario ao motorista: ${updateMotoristaError.message}`);
    }

    // 9. Sucesso — retornar credenciais (AC: 11)
    return {
      success: true,
      motorista: { ...motorista, usuario_id: usuario.id },
      credenciais: {
        email: data.email,
        senha: senhaGerada,
      },
    };
  } catch (error) {
    // AC: 10 — Rollback: deletar auth user criado
    await adminClient.auth.admin.deleteUser(authUserId);

    return {
      success: false,
      error: error instanceof Error ? error.message : 'Erro ao cadastrar motorista com conta. Tente novamente.',
    };
  }
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
      error: err instanceof Error ? err.message : 'Permissão insuficiente',
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

  // Parse percentual
  const percentualStr = (data as Record<string, string>).percentual_pagamento?.replace(',', '.') ?? '';
  const percentualValue = percentualStr !== '' ? parseFloat(percentualStr) : null;

  const { data: motorista, error: updateError } = await supabase
    .from('motorista')
    .update({
      nome: data.nome,
      cnh_numero: data.cnh_numero,
      cnh_categoria: data.cnh_categoria,
      cnh_validade: data.cnh_validade,
      telefone: data.telefone || null,
      observacao: data.observacao || null,
      percentual_pagamento: percentualValue,
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
      error: err instanceof Error ? err.message : 'Permissão insuficiente',
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
      error: err instanceof Error ? err.message : 'Permissão insuficiente',
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
      error: err instanceof Error ? err.message : 'Permissão insuficiente',
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
      error: err instanceof Error ? err.message : 'Permissão insuficiente',
    };
  }

  const supabase = await createClient();

  const { data: motorista, error } = await supabase
    .from('motorista')
    .select('*')
    .eq('id', motoristaId)
    .single();

  if (error || !motorista) {
    return { success: false, error: 'Motorista não encontrado' };
  }

  return { success: true, motorista };
}
