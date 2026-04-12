/**
 * Viagens repository — unified read queries for viagem data.
 *
 * Accepts a SupabaseClient and empresaIds[] so the same logic serves
 * both single-empresa (RLS) and multi-empresa (admin bypass) callers.
 */

import type { SupabaseClient } from '@supabase/supabase-js';
import { singleRelation } from '@/lib/utils/supabase-types';
import type { ViagemListItem } from '@/types/viagem';
import type { ViagemStatus } from '@/types/database';

// ---------------------------------------------------------------------------
// Repository functions
// ---------------------------------------------------------------------------

/**
 * List viagens with optional filters.
 */
export async function listViagensRepo(
  client: SupabaseClient,
  empresaIds: string[],
  filters?: {
    status?: ViagemStatus[];
    motorista_id?: string;
    data_inicio?: string;
    data_fim?: string;
    texto?: string;
    page?: number;
    pageSize?: number;
  },
): Promise<{
  data: ViagemListItem[] | null;
  total: number;
  error: string | null;
}> {
  const page = filters?.page ?? 1;
  const pageSize = filters?.pageSize ?? 20;
  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;

  let query = client
    .from('viagem')
    .select(`
      id,
      motorista_id,
      origem,
      destino,
      data_saida,
      valor_total,
      percentual_pagamento,
      status,
      motorista ( nome ),
      caminhao ( placa )
    `, { count: 'exact' })
    .in('empresa_id', empresaIds);

  if (filters?.status && filters.status.length > 0) {
    query = query.in('status', filters.status);
  }

  if (filters?.motorista_id) {
    query = query.eq('motorista_id', filters.motorista_id);
  }

  if (filters?.data_inicio) {
    query = query.gte('data_saida', filters.data_inicio);
  }

  if (filters?.data_fim) {
    query = query.lte('data_saida', `${filters.data_fim}T23:59:59`);
  }

  if (filters?.texto) {
    query = query.or(
      `origem.ilike.%${filters.texto}%,destino.ilike.%${filters.texto}%`,
    );
  }

  query = query
    .order('data_saida', { ascending: false })
    .range(from, to);

  const { data, count, error } = await query;

  if (error) {
    return { data: null, total: 0, error: error.message };
  }

  const items: ViagemListItem[] = (data ?? []).map((row) => {
    const mot = singleRelation<{ nome: string }>(row.motorista);
    const cam = singleRelation<{ placa: string }>(row.caminhao);

    return {
      id: row.id,
      motorista_id: row.motorista_id,
      origem: row.origem,
      destino: row.destino,
      motorista_nome: mot?.nome ?? 'Desconhecido',
      caminhao_placa: cam?.placa ?? '-',
      data_saida: row.data_saida,
      valor_total: row.valor_total,
      percentual_pagamento: row.percentual_pagamento,
      status: row.status,
    };
  });

  return { data: items, total: count ?? 0, error: null };
}

/**
 * List motoristas ativos for select dropdowns.
 * motoristaFilter: when set, filters to only that motorista's own record (for motorista role).
 */
export async function listMotoristasAtivosRepo(
  client: SupabaseClient,
  empresaIds: string[],
  motoristaFilter?: { usuarioId: string },
): Promise<{
  data: Array<{ id: string; nome: string; percentual_pagamento?: number | null }> | null;
  error: string | null;
}> {
  if (motoristaFilter) {
    const { data, error } = await client
      .from('motorista')
      .select('id, nome, percentual_pagamento')
      .in('empresa_id', empresaIds)
      .eq('usuario_id', motoristaFilter.usuarioId)
      .eq('status', 'ativo');

    if (error) return { data: null, error: error.message };
    return { data, error: null };
  }

  const { data, error } = await client
    .from('motorista')
    .select('id, nome, percentual_pagamento')
    .in('empresa_id', empresaIds)
    .eq('status', 'ativo')
    .order('nome');

  if (error) return { data: null, error: error.message };
  return { data, error: null };
}

/**
 * List caminhoes by motorista (via vinculos) or all active.
 */
export async function listCaminhoesPorMotoristaRepo(
  client: SupabaseClient,
  empresaIds: string[],
  motoristaId?: string,
): Promise<{
  data: Array<{ id: string; placa: string; modelo: string }> | null;
  error: string | null;
}> {
  if (motoristaId) {
    const { data: vinculos, error: vincError } = await client
      .from('motorista_caminhao')
      .select('caminhao_id')
      .eq('motorista_id', motoristaId)
      .eq('ativo', true);

    if (vincError) return { data: null, error: vincError.message };

    const caminhaoIds = (vinculos ?? []).map((v) => v.caminhao_id);
    if (caminhaoIds.length === 0) {
      return { data: [], error: null };
    }

    const { data, error } = await client
      .from('caminhao')
      .select('id, placa, modelo')
      .in('id', caminhaoIds)
      .eq('ativo', true)
      .order('placa');

    if (error) return { data: null, error: error.message };
    return { data, error: null };
  }

  const { data, error } = await client
    .from('caminhao')
    .select('id, placa, modelo')
    .in('empresa_id', empresaIds)
    .eq('ativo', true)
    .order('placa');

  if (error) return { data: null, error: error.message };
  return { data, error: null };
}

/**
 * Get a single viagem by ID with joins.
 */
export async function getViagemRepo(
  client: SupabaseClient,
  viagemId: string,
): Promise<{ data: unknown | null; error: string | null }> {
  const { data, error } = await client
    .from('viagem')
    .select(`
      *,
      motorista ( nome ),
      caminhao ( placa, modelo, capacidade_veiculos )
    `)
    .eq('id', viagemId)
    .single();

  if (error || !data) {
    return { data: null, error: 'Viagem não encontrada' };
  }

  return { data, error: null };
}

/**
 * Get count of viagens em_andamento.
 */
export async function getViagensEmAndamentoRepo(
  client: SupabaseClient,
  empresaIds: string[],
): Promise<{ count: number; error: string | null }> {
  const { count, error } = await client
    .from('viagem')
    .select('id', { count: 'exact', head: true })
    .in('empresa_id', empresaIds)
    .eq('status', 'em_andamento');

  if (error) {
    return { count: 0, error: error.message };
  }

  return { count: count ?? 0, error: null };
}

/**
 * List unique cities used in origem/destino.
 */
export async function listCidadesUsadasRepo(
  client: SupabaseClient,
  empresaIds: string[],
): Promise<{ data: string[]; error: string | null }> {
  const { data, error } = await client
    .from('viagem')
    .select('origem, destino')
    .in('empresa_id', empresaIds);

  if (error) {
    return { data: [], error: error.message };
  }

  const cidadesSet = new Set<string>();
  for (const row of data ?? []) {
    if (row.origem) cidadesSet.add(row.origem.trim());
    if (row.destino) cidadesSet.add(row.destino.trim());
  }

  const sorted = Array.from(cidadesSet).sort((a, b) =>
    a.localeCompare(b, 'pt-BR'),
  );

  return { data: sorted, error: null };
}
