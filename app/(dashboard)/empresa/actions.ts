'use server';

import { z } from 'zod';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { validateCNPJ, formatCNPJ, stripCNPJ } from '@/lib/utils/validate-cnpj';
import type { EmpresaActionResult, EmpresaFormData } from '@/types/empresa';

const empresaSchema = z.object({
  cnpj: z.string()
    .min(1, 'CNPJ e obrigatorio')
    .refine((val) => validateCNPJ(val), 'CNPJ invalido'),
  razao_social: z.string()
    .min(1, 'Razao Social e obrigatoria')
    .max(255, 'Razao Social deve ter no maximo 255 caracteres'),
  nome_fantasia: z.string().max(255, 'Nome Fantasia deve ter no maximo 255 caracteres'),
  endereco: z.string(),
  cidade: z.string(),
  estado: z.string().refine(
    (val) => val === '' || /^[A-Z]{2}$/.test(val),
    'UF deve ter 2 letras maiusculas',
  ),
  cep: z.string(),
  telefone: z.string().max(20, 'Telefone deve ter no maximo 20 caracteres'),
  email: z.string().refine(
    (val) => val === '' || z.string().email().safeParse(val).success,
    'Email invalido',
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
    return { success: false, error: 'Usuario nao autenticado' };
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

  // Insert empresa
  const { data: empresa, error: insertError } = await supabase
    .from('empresa')
    .insert({
      cnpj: formattedCNPJ,
      razao_social: data.razao_social,
      nome_fantasia: data.nome_fantasia || null,
      endereco: data.endereco || null,
      cidade: data.cidade || null,
      estado: data.estado || null,
      cep: data.cep || null,
      telefone: data.telefone || null,
      email: data.email || null,
    })
    .select()
    .single();

  if (insertError) {
    if (insertError.code === '23505') {
      return {
        success: false,
        fieldErrors: { cnpj: 'CNPJ ja cadastrado' },
      };
    }
    return { success: false, error: 'Erro ao cadastrar empresa. Tente novamente.' };
  }

  // Create usuario record linking auth user to empresa as 'dono'
  const { error: usuarioError } = await supabase
    .from('usuario')
    .insert({
      auth_id: user.id,
      empresa_id: empresa.id,
      nome: user.user_metadata?.full_name ?? user.email ?? 'Dono',
      email: user.email ?? '',
      role: 'dono',
    });

  if (usuarioError) {
    // Rollback: delete empresa if usuario creation fails
    await supabase.from('empresa').delete().eq('id', empresa.id);
    return { success: false, error: 'Erro ao vincular usuario a empresa. Tente novamente.' };
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
    return { success: false, error: 'Usuario nao autenticado' };
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
    return { success: false, error: 'Erro ao atualizar empresa. Tente novamente.' };
  }

  return { success: true, empresa };
}

export async function getEmpresa(): Promise<EmpresaActionResult> {
  const supabase = await createClient();

  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    return { success: false, error: 'Usuario nao autenticado' };
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
    return { success: false, error: 'Empresa nao encontrada' };
  }

  return { success: true, empresa };
}
