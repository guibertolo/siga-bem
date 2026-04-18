'use server';

import { z } from 'zod';
import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import { validateCNPJ, formatCNPJ, stripCNPJ } from '@/lib/utils/validate-cnpj';
import type { EmpresaActionResult, EmpresaFormData } from '@/types/empresa';
import { logError } from '@/lib/observability/logger';

const empresaSchema = z.object({
  cnpj: z.string()
    .min(1, 'CNPJ é obrigatório')
    .refine((val) => validateCNPJ(val), 'CNPJ inválido'),
  razao_social: z.string()
    .min(1, 'Razão Social é obrigatória')
    .max(255, 'Razão Social deve ter no máximo 255 caracteres'),
  nome_fantasia: z.string().max(255, 'Nome Fantasia deve ter no máximo 255 caracteres'),
  endereco: z.string(),
  cidade: z.string(),
  estado: z.string().refine(
    (val) => val === '' || /^[A-Z]{2}$/.test(val),
    'UF deve ter 2 letras maiusculas',
  ),
  cep: z.string(),
  telefone: z.string().max(20, 'Telefone deve ter no máximo 20 caracteres'),
  email: z.string().refine(
    (val) => val === '' || z.string().email().safeParse(val).success,
    'Email inválido',
  ),
});

const updateEmpresaSchema = empresaSchema.omit({ cnpj: true });

export async function createEmpresa(
  formData: EmpresaFormData,
): Promise<EmpresaActionResult> {
  const supabase = await createClient();

  // Verify authentication
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    return { success: false, error: 'Usuário não autenticado' };
  }

  // Validate input
  const parsed = empresaSchema.safeParse(formData);
  if (!parsed.success) {
    const fieldErrors: Partial<Record<keyof EmpresaFormData, string>> = {};
    for (const issue of parsed.error.issues) {
      const field = issue.path[0] as keyof EmpresaFormData;
      if (!fieldErrors[field]) {
        fieldErrors[field] = issue.message;
      }
    }
    return { success: false, fieldErrors };
  }

  const data = parsed.data;

  // Format CNPJ for storage (00.000.000/0000-00)
  const formattedCNPJ = formatCNPJ(stripCNPJ(data.cnpj));

  // Check for duplicate CNPJ
  const { data: existing } = await supabase
    .from('empresa')
    .select('id')
    .eq('cnpj', formattedCNPJ)
    .maybeSingle();

  if (existing) {
    return {
      success: false,
      fieldErrors: { cnpj: 'CNPJ ja cadastrado' },
    };
  }

  // Create usuario record first (required for RPC lookup)
  const { error: usuarioError } = await supabase
    .from('usuario')
    .insert({
      auth_id: user.id,
      nome: user.user_metadata?.full_name ?? user.email ?? 'Dono',
      email: user.email ?? '',
      role: 'dono',
    });

  if (usuarioError) {
    // If usuario already exists (e.g., from invite flow), that's OK — continue
    if (usuarioError.code !== '23505') {
      logError({ action: 'createEmpresa.createUsuario', usuarioId: user.id }, usuarioError);
      return { success: false, error: 'Erro ao criar usuario. Tente novamente.' };
    }
  }

  // Create empresa + vinculo dono atomicamente via RPC SECURITY DEFINER
  const { error: rpcError } = await supabase.rpc(
    'fn_create_empresa_with_owner',
    {
      p_razao_social: data.razao_social,
      p_cnpj: formattedCNPJ,
      p_nome_fantasia: data.nome_fantasia || null,
      p_plano: 'free',
    },
  );

  if (rpcError) {
    if (rpcError.code === '23505') {
      return {
        success: false,
        fieldErrors: { cnpj: 'CNPJ ja cadastrado' },
      };
    }
    logError({ action: 'createEmpresa', usuarioId: user.id }, rpcError);
    return { success: false, error: 'Erro ao cadastrar empresa. Tente novamente.' };
  }

  redirect('/dashboard');
}

export async function updateEmpresa(
  empresaId: string,
  formData: Omit<EmpresaFormData, 'cnpj'>,
): Promise<EmpresaActionResult> {
  const supabase = await createClient();

  // Verify authentication
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    return { success: false, error: 'Usuário não autenticado' };
  }

  // Validate input
  const parsed = updateEmpresaSchema.safeParse(formData);
  if (!parsed.success) {
    const fieldErrors: Partial<Record<keyof EmpresaFormData, string>> = {};
    for (const issue of parsed.error.issues) {
      const field = issue.path[0] as keyof EmpresaFormData;
      if (!fieldErrors[field]) {
        fieldErrors[field] = issue.message;
      }
    }
    return { success: false, fieldErrors };
  }

  const data = parsed.data;

  // Update empresa (RLS ensures only dono of their own empresa can update)
  const { data: empresa, error: updateError } = await supabase
    .from('empresa')
    .update({
      razao_social: data.razao_social,
      nome_fantasia: data.nome_fantasia || null,
      endereco: data.endereco || null,
      cidade: data.cidade || null,
      estado: data.estado || null,
      cep: data.cep || null,
      telefone: data.telefone || null,
      email: data.email || null,
    })
    .eq('id', empresaId)
    .select()
    .single();

  if (updateError) {
    logError({ action: 'updateEmpresa', params: { empresaId } }, updateError);
    return { success: false, error: 'Erro ao atualizar empresa. Tente novamente.' };
  }

  return { success: true, empresa };
}

export async function createEmpresaAdicional(
  formData: EmpresaFormData,
): Promise<EmpresaActionResult> {
  const supabase = await createClient();

  // Verify authentication
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    return { success: false, error: 'Usuário não autenticado' };
  }

  // Validate input
  const parsed = empresaSchema.safeParse(formData);
  if (!parsed.success) {
    const fieldErrors: Partial<Record<keyof EmpresaFormData, string>> = {};
    for (const issue of parsed.error.issues) {
      const field = issue.path[0] as keyof EmpresaFormData;
      if (!fieldErrors[field]) {
        fieldErrors[field] = issue.message;
      }
    }
    return { success: false, fieldErrors };
  }

  const data = parsed.data;

  // Format CNPJ for storage (00.000.000/0000-00)
  const formattedCNPJ = formatCNPJ(stripCNPJ(data.cnpj));

  // Check for duplicate CNPJ
  const { data: existing } = await supabase
    .from('empresa')
    .select('id')
    .eq('cnpj', formattedCNPJ)
    .maybeSingle();

  if (existing) {
    return {
      success: false,
      fieldErrors: {
        cnpj: 'Este CNPJ ja esta cadastrado. Solicite um convite ao administrador.',
      },
    };
  }

  // Create empresa + vinculo dono atomicamente via RPC SECURITY DEFINER
  const { data: empresaId, error: rpcError } = await supabase.rpc(
    'fn_create_empresa_with_owner',
    {
      p_razao_social: data.razao_social,
      p_cnpj: formattedCNPJ,
      p_nome_fantasia: data.nome_fantasia || null,
      p_plano: 'free',
    },
  );

  if (rpcError) {
    if (rpcError.code === '23505') {
      return {
        success: false,
        fieldErrors: {
          cnpj: 'Este CNPJ ja esta cadastrado. Solicite um convite ao administrador.',
        },
      };
    }
    return { success: false, error: 'Erro ao cadastrar empresa. Tente novamente.' };
  }

  // Switch to the new empresa via RPC
  const { error: switchError } = await supabase.rpc('fn_switch_empresa', {
    p_empresa_id: empresaId,
  });

  if (switchError) {
    // Non-fatal: empresa was created, just couldn't auto-switch
    console.error('[createEmpresaAdicional] switch failed:', switchError.message);
  }

  // Revalidate all paths since empresa context changed
  revalidatePath('/');

  redirect('/dashboard');
}

export async function getEmpresa(): Promise<EmpresaActionResult> {
  const supabase = await createClient();

  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    return { success: false, error: 'Usuário não autenticado' };
  }

  // Get usuario to find empresa_id
  const { data: usuario } = await supabase
    .from('usuario')
    .select('empresa_id')
    .eq('auth_id', user.id)
    .maybeSingle();

  if (!usuario) {
    return { success: false, error: 'EMPRESA_NOT_FOUND' };
  }

  // Get empresa (RLS will also filter, but this is explicit)
  const { data: empresa, error } = await supabase
    .from('empresa')
    .select('*')
    .eq('id', usuario.empresa_id)
    .single();

  if (error || !empresa) {
    return { success: false, error: 'Empresa não encontrada' };
  }

  return { success: true, empresa };
}
