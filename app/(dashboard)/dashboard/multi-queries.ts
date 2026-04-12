/**
 * Multi-empresa dashboard actions — admin client versions that accept
 * (admin, empresaId) and filter by empresa_id explicitly.
 *
 * These bypass RLS. Ownership MUST be validated by the caller
 * (queryMultiEmpresa validates via getMultiEmpresaContext).
 */

import type { SupabaseClient } from '@supabase/supabase-js';
import { singleRelation } from '@/lib/utils/supabase-types';
import type {
  DashboardData,
  DonoMicroData,
  ViagemAtivaData,
  ViagemAtivaItem,
  MotoristaStatusItem,
  CaminhaoStatusItem,
} from '@/app/(dashboard)/dashboard/actions';

// ---------------------------------------------------------------------------
// Dashboard summary data for a specific empresa
// ---------------------------------------------------------------------------

export async function getDashboardDataForEmpresa(
  admin: SupabaseClient,
  empresaId: string,
): Promise<DashboardData> {
  const now = new Date();
  const inicioMes = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
  const primeiroDiaMes = inicioMes.split('T')[0];

  const [viagensEmAndamento, gastosMes, fechamentos, receitaCusto] = await Promise.all([
    // Viagens em andamento count
    admin
      .from('viagem')
      .select('id', { count: 'exact', head: true })
      .eq('empresa_id', empresaId)
      .eq('status', 'em_andamento'),
    // Gastos do mes
    admin
      .from('gasto')
      .select('valor')
      .eq('empresa_id', empresaId)
      .gte('data', primeiroDiaMes),
    // Fechamentos pendentes (viagens concluidas sem acerto)
    admin
      .from('viagem')
      .select('id, valor_total, percentual_pagamento')
      .eq('empresa_id', empresaId)
      .eq('status', 'concluida'),
    // Receita/custo do mes
    Promise.all([
      admin
        .from('viagem')
        .select('valor_total')
        .eq('empresa_id', empresaId)
        .eq('status', 'concluida')
        .gte('data_saida', inicioMes),
      admin
        .from('gasto')
        .select('valor')
        .eq('empresa_id', empresaId)
        .gte('data', primeiroDiaMes),
    ]),
  ]);

  // Process viagens em andamento
  const viagensCount = viagensEmAndamento.count ?? 0;
  const viagensError = viagensEmAndamento.error?.message ?? null;

  // Process gastos
  const totalGastos = (gastosMes.data ?? []).reduce((sum, g) => sum + g.valor, 0);
  const gastosError = gastosMes.error?.message ?? null;

  // Process fechamentos pendentes
  const viagensConcluidasData = fechamentos.data ?? [];
  let fechamentosCount = 0;
  let fechamentosTotalCentavos = 0;

  if (viagensConcluidasData.length > 0) {
    const viagemIds = viagensConcluidasData.map((v: { id: string }) => v.id);
    const { data: itens } = await admin
      .from('fechamento_item')
      .select('referencia_id')
      .eq('tipo', 'viagem')
      .in('referencia_id', viagemIds);

    const idsComAcerto = new Set((itens ?? []).map((i: { referencia_id: string }) => i.referencia_id));
    const pendentes = viagensConcluidasData.filter((v: { id: string }) => !idsComAcerto.has(v.id));

    fechamentosCount = pendentes.length;
    fechamentosTotalCentavos = pendentes.reduce(
      (sum: number, v: { valor_total: number; percentual_pagamento: number }) =>
        sum + Math.round((v.valor_total * v.percentual_pagamento) / 100),
      0,
    );
  }

  // Process receita/custo
  const [viagensReceita, gastosCusto] = receitaCusto;
  const receita = (viagensReceita.data ?? []).reduce(
    (sum: number, v: { valor_total: number }) => sum + v.valor_total, 0,
  );
  const custo = (gastosCusto.data ?? []).reduce(
    (sum: number, g: { valor: number }) => sum + g.valor, 0,
  );

  return {
    viagens: { count: viagensCount, error: viagensError },
    gastos: { total: totalGastos, error: gastosError },
    fechamentos: { count: fechamentosCount, totalCentavos: fechamentosTotalCentavos },
    receitaCusto: { receita, custo },
  };
}

// ---------------------------------------------------------------------------
// Viagem ativa for a specific empresa
// ---------------------------------------------------------------------------

export async function getViagemAtivaForEmpresa(
  admin: SupabaseClient,
  empresaId: string,
): Promise<ViagemAtivaData> {
  const { data, count, error } = await admin
    .from('viagem')
    .select(`
      id,
      origem,
      destino,
      status,
      data_saida,
      valor_total,
      motorista ( nome ),
      caminhao ( placa, modelo )
    `, { count: 'exact' })
    .eq('empresa_id', empresaId)
    .eq('status', 'em_andamento')
    .order('data_saida', { ascending: true })
    .limit(5);

  if (error) {
    return { viagens: [], count: 0, error: error.message };
  }

  const items: ViagemAtivaItem[] = (data ?? []).map((row) => {
    const mot = singleRelation<{ nome: string }>(row.motorista);
    const cam = singleRelation<{ placa: string; modelo: string }>(row.caminhao);
    return {
      id: row.id,
      origem: row.origem,
      destino: row.destino,
      status: row.status,
      data_saida: row.data_saida,
      valor_total: row.valor_total,
      motorista_nome: mot?.nome ?? 'Desconhecido',
      caminhao_placa: cam?.placa ?? '-',
      caminhao_modelo: cam?.modelo ?? '-',
    };
  });

  return { viagens: items, count: count ?? 0, error: null };
}

// ---------------------------------------------------------------------------
// Dono micro data for a specific empresa
// ---------------------------------------------------------------------------

export async function getDonoMicroDataForEmpresa(
  admin: SupabaseClient,
  empresaId: string,
): Promise<DonoMicroData> {
  const [motoristasResult, caminhoesResult, viagensAtivas] = await Promise.all([
    admin
      .from('motorista')
      .select('id, nome')
      .eq('empresa_id', empresaId)
      .eq('status', 'ativo')
      .order('nome'),
    admin
      .from('caminhao')
      .select('id, placa, modelo')
      .eq('empresa_id', empresaId)
      .eq('ativo', true)
      .order('placa'),
    admin
      .from('viagem')
      .select('motorista_id, caminhao_id')
      .eq('empresa_id', empresaId)
      .eq('status', 'em_andamento'),
  ]);

  const motoristasEmViagem = new Set(
    (viagensAtivas.data ?? []).map((v) => v.motorista_id),
  );
  const caminhoesRodando = new Set(
    (viagensAtivas.data ?? []).map((v) => v.caminhao_id),
  );

  const motoristas: MotoristaStatusItem[] = (motoristasResult.data ?? []).map((m) => ({
    id: m.id,
    nome: m.nome,
    situacao: motoristasEmViagem.has(m.id) ? 'em_viagem' : 'livre',
  }));

  const caminhoes: CaminhaoStatusItem[] = (caminhoesResult.data ?? []).map((c) => ({
    id: c.id,
    placa: c.placa,
    modelo: c.modelo,
    situacao: caminhoesRodando.has(c.id) ? 'rodando' : 'parado',
  }));

  return { motoristas, caminhoes };
}
