'use server';

/**
 * Server actions for the Fechamento detail page.
 * Story 4.2 — Relatorio e Impressao PDF (AC2, T4)
 *
 * getFechamentoCompleto: Fetches all data needed for PDF generation
 * in a single parallel query (fechamento + motorista + empresa + items).
 */

import { createClient } from '@/lib/supabase/server';
import { getCurrentUsuario } from '@/lib/auth/get-user-role';
import type {
  FechamentoCompleto,
  FechamentoCompletoResult,
  FechamentoViagemItem,
  FechamentoGastoItem,
} from '@/types/fechamento';

/**
 * Fetch complete fechamento data for PDF generation.
 * JOINs: fechamento + motorista(nome, cpf) + empresa(*) + fechamento_items with
 * viagem/gasto references.
 *
 * @param fechamentoId - UUID of the fechamento
 * @returns FechamentoCompletoResult with all data needed for the PDF
 */
export async function getFechamentoCompleto(
  fechamentoId: string,
): Promise<FechamentoCompletoResult> {
  const usuario = await getCurrentUsuario();
  if (!usuario) {
    return { success: false, error: 'Nao autenticado' };
  }

  const supabase = await createClient();

  // Parallel fetches for performance (AC3: < 5s)
  const [fechamentoResult, viagensResult, gastosResult] = await Promise.all([
    // 1. Fechamento with motorista and empresa
    supabase
      .from('fechamento')
      .select(`
        id,
        periodo_inicio,
        periodo_fim,
        tipo,
        status,
        total_viagens,
        total_gastos,
        saldo_motorista,
        observacao,
        fechado_em,
        motorista ( nome, cpf ),
        empresa:empresa_id ( razao_social, nome_fantasia, cnpj )
      `)
      .eq('id', fechamentoId)
      .single(),

    // 2. Viagem items with viagem reference data
    supabase
      .from('fechamento_item')
      .select(`
        id,
        valor,
        descricao,
        viagem:referencia_id (
          origem,
          destino,
          data_saida,
          valor_total,
          percentual_pagamento
        )
      `)
      .eq('fechamento_id', fechamentoId)
      .eq('tipo', 'viagem')
      .order('created_at', { ascending: true }),

    // 3. Gasto items with gasto reference data
    supabase
      .from('fechamento_item')
      .select(`
        id,
        valor,
        descricao,
        gasto:referencia_id (
          data,
          descricao,
          categoria_gasto ( nome )
        )
      `)
      .eq('fechamento_id', fechamentoId)
      .eq('tipo', 'gasto')
      .order('created_at', { ascending: true }),
  ]);

  if (fechamentoResult.error || !fechamentoResult.data) {
    return { success: false, error: 'Fechamento nao encontrado' };
  }

  const row = fechamentoResult.data;
  const mot = row.motorista as unknown as { nome: string; cpf: string } | null;
  const emp = row.empresa as unknown as {
    razao_social: string;
    nome_fantasia: string | null;
    cnpj: string;
  } | null;

  if (!mot || !emp) {
    return { success: false, error: 'Dados de motorista ou empresa nao encontrados' };
  }

  const viagens: FechamentoViagemItem[] = (viagensResult.data ?? []).map(
    (item) => {
      const v = item.viagem as unknown as {
        origem: string;
        destino: string;
        data_saida: string;
        valor_total: number;
        percentual_pagamento: number;
      } | null;
      return {
        id: item.id,
        valor: item.valor,
        descricao: item.descricao,
        viagem: v
          ? {
              origem: v.origem,
              destino: v.destino,
              data_saida: v.data_saida,
              valor_total: v.valor_total,
              percentual_pagamento: v.percentual_pagamento,
            }
          : null,
      };
    },
  );

  const gastos: FechamentoGastoItem[] = (gastosResult.data ?? []).map(
    (item) => {
      const g = item.gasto as unknown as {
        data: string;
        descricao: string | null;
        categoria_gasto: { nome: string } | null;
      } | null;
      return {
        id: item.id,
        valor: item.valor,
        descricao: item.descricao,
        gasto: g
          ? {
              data: g.data,
              descricao: g.descricao,
              categoria_gasto: g.categoria_gasto,
            }
          : null,
      };
    },
  );

  const data: FechamentoCompleto = {
    id: row.id,
    periodo_inicio: row.periodo_inicio,
    periodo_fim: row.periodo_fim,
    tipo: row.tipo,
    status: row.status,
    observacao: row.observacao,
    fechado_em: row.fechado_em,
    motorista: {
      nome: mot.nome,
      cpf: mot.cpf,
    },
    empresa: {
      razao_social: emp.razao_social,
      nome_fantasia: emp.nome_fantasia,
      cnpj: emp.cnpj,
    },
    viagens,
    gastos,
    totais: {
      total_viagens: row.total_viagens,
      total_gastos: row.total_gastos,
      saldo: row.saldo_motorista,
    },
  };

  return { success: true, data };
}
