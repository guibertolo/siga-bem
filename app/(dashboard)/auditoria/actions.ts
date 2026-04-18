'use server';

import { createClient } from '@/lib/supabase/server';
import { getCurrentUsuario } from '@/lib/auth/get-user-role';
import type { AuditLogEntry } from '@/lib/observability/audit';

export interface AuditFilter {
  entidade?: string;
  usuarioId?: string;
  dataInicio?: string;
  dataFim?: string;
  limit?: number;
}

export async function listAuditLog(
  filter?: AuditFilter,
): Promise<{ data: AuditLogEntry[] | null; error: string | null }> {
  const usuario = await getCurrentUsuario();
  if (!usuario) {
    return { data: null, error: 'Não autenticado' };
  }

  const supabase = await createClient();

  let query = supabase
    .from('audit_log')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(filter?.limit ?? 100);

  if (filter?.entidade) {
    query = query.eq('entidade', filter.entidade);
  }
  if (filter?.usuarioId) {
    query = query.eq('usuario_id', filter.usuarioId);
  }
  if (filter?.dataInicio) {
    query = query.gte('created_at', filter.dataInicio);
  }
  if (filter?.dataFim) {
    query = query.lte('created_at', filter.dataFim);
  }

  const { data, error } = await query;

  if (error) {
    return { data: null, error: 'Erro ao carregar auditoria.' };
  }

  return { data: (data ?? []) as AuditLogEntry[], error: null };
}
