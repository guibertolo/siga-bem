'use server';

import { createClient } from '@/lib/supabase/server';
import type { UserEmpresa } from '@/types/empresa-multi';

/**
 * Fetches all empresas linked to the authenticated user via fn_get_user_empresas() RPC.
 * Also joins with empresa.ativa to determine if the empresa itself is active (not just the binding).
 *
 * Returns empresas ordered: ultima_empresa_id first, then by razao_social ascending.
 */
export async function getUserEmpresas(): Promise<UserEmpresa[]> {
  const supabase = await createClient();

  const { data, error } = await supabase.rpc('fn_get_user_empresas');

  if (error || !data) {
    return [];
  }

  // The RPC returns: empresa_id, razao_social, nome_fantasia, cnpj, role, is_active
  // We need to also check empresa.ativa for "inactive empresa" badge (AC:4 of 7.2).
  // Fetch empresa.ativa for all returned empresa_ids.
  const empresaIds = (data as UserEmpresa[]).map((e) => e.empresa_id);

  const { data: empresaStatuses } = await supabase
    .from('empresa')
    .select('id, ativa')
    .in('id', empresaIds);

  const ativaMap = new Map<string, boolean>();
  if (empresaStatuses) {
    for (const e of empresaStatuses) {
      ativaMap.set(e.id, e.ativa);
    }
  }

  const empresas: UserEmpresa[] = (data as UserEmpresa[]).map((e) => ({
    ...e,
    empresa_ativa: ativaMap.get(e.empresa_id) ?? true,
  }));

  // Sort: active empresa first (is_active = true), then by razao_social
  empresas.sort((a, b) => {
    if (a.is_active && !b.is_active) return -1;
    if (!a.is_active && b.is_active) return 1;
    return a.razao_social.localeCompare(b.razao_social, 'pt-BR');
  });

  return empresas;
}
