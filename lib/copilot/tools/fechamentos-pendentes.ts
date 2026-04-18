/**
 * Assistente FrotaViva — Tool T12: fechamentos_pendentes.
 *
 * Retorna fechamentos (acertos) pendentes e historico de pagamentos.
 *
 * Use cases:
 * - "Quanto devo pro Joao?"
 * - "Tem acerto pendente?"
 * - "Quanto paguei pro motorista nos ultimos 3 meses?"
 */

import { z } from 'zod';

import { parsePeriod } from '@/lib/copilot/utils/period';
import { MAX_TOOL_ROWS, ToolExecutionError } from '@/lib/copilot/tools/constants';
import type { ToolContext } from '@/lib/copilot/tools/constants';

export const fechamentosPendentesSchema = z.object({
  motorista_nome: z
    .string()
    .optional()
    .describe('Filtrar por motorista (nome parcial). Se omitido, retorna todos.'),
  status_filtro: z
    .enum(['pendentes', 'pagos', 'todos'])
    .optional()
    .describe('pendentes = aberto+fechado (default). pagos = so pagos. todos = todos.'),
  periodo: z
    .string()
    .optional()
    .describe('Periodo para filtrar. Se omitido, retorna todos os pendentes sem filtro de data.'),
});

export type FechamentosPendentesInput = z.infer<typeof fechamentosPendentesSchema>;

export interface FechamentosPendentesResult {
  filtro: {
    motorista: string | null;
    status: string;
    periodo: { start: string; end: string; label: string } | null;
  };
  resumo: {
    total_pendente_centavos: number;
    total_pago_centavos: number;
    qtd_pendentes: number;
    qtd_pagos: number;
  };
  fechamentos: Array<{
    id: string;
    motorista_nome: string;
    periodo_inicio: string;
    periodo_fim: string;
    total_viagens_centavos: number;
    total_gastos_centavos: number;
    saldo_motorista_centavos: number;
    status: string;
    pago_em: string | null;
  }>;
}

interface FechamentoRow {
  id: string;
  motorista_id: string;
  periodo_inicio: string;
  periodo_fim: string;
  total_viagens: number;
  total_gastos: number;
  saldo_motorista: number;
  status: string;
  pago_em: string | null;
}

interface MotoristaRow {
  id: string;
  nome: string;
}

export async function executeFechamentosPendentes(
  input: FechamentosPendentesInput,
  ctx: ToolContext,
): Promise<FechamentosPendentesResult> {
  try {
    const statusFiltro = input.status_filtro ?? 'pendentes';
    const { supabase, empresaIds } = ctx;

    const period = input.periodo ? parsePeriod(input.periodo) : null;

    if (empresaIds.length === 0) {
      return {
        filtro: { motorista: input.motorista_nome ?? null, status: statusFiltro, periodo: period ? { start: period.startDate, end: period.endDate, label: period.label } : null },
        resumo: { total_pendente_centavos: 0, total_pago_centavos: 0, qtd_pendentes: 0, qtd_pagos: 0 },
        fechamentos: [],
      };
    }

    // Fetch fechamentos + motoristas in parallel
    let fechamentoQuery = supabase
      .from('fechamento')
      .select('id, motorista_id, periodo_inicio, periodo_fim, total_viagens, total_gastos, saldo_motorista, status, pago_em')
      .in('empresa_id', empresaIds)
      .order('periodo_fim', { ascending: false })
      .limit(MAX_TOOL_ROWS);

    if (statusFiltro === 'pendentes') {
      fechamentoQuery = fechamentoQuery.in('status', ['aberto', 'fechado']);
    } else if (statusFiltro === 'pagos') {
      fechamentoQuery = fechamentoQuery.eq('status', 'pago');
    }

    if (period) {
      fechamentoQuery = fechamentoQuery
        .gte('periodo_fim', period.startDate)
        .lte('periodo_inicio', period.endDate);
    }

    const motoristasPromise = supabase
      .from('motorista')
      .select('id, nome')
      .in('empresa_id', empresaIds);

    const [fechamentosResult, motoristasResult] = await Promise.all([
      fechamentoQuery,
      motoristasPromise,
    ]);

    if (fechamentosResult.error) {
      throw new ToolExecutionError('fechamentos_pendentes', `Falha ao carregar fechamentos: ${fechamentosResult.error.message}`, {});
    }
    if (motoristasResult.error) {
      throw new ToolExecutionError('fechamentos_pendentes', `Falha ao carregar motoristas: ${motoristasResult.error.message}`, {});
    }

    let fechamentos = (fechamentosResult.data ?? []) as FechamentoRow[];
    const motoristas = (motoristasResult.data ?? []) as MotoristaRow[];

    const motoristaLookup = new Map<string, string>();
    for (const m of motoristas) motoristaLookup.set(m.id, m.nome);

    // Filter by motorista name if provided
    if (input.motorista_nome) {
      const needle = input.motorista_nome.toLocaleLowerCase('pt-BR');
      const matchedIds = motoristas
        .filter((m) => m.nome.toLocaleLowerCase('pt-BR').includes(needle))
        .map((m) => m.id);
      fechamentos = fechamentos.filter((f) => matchedIds.includes(f.motorista_id));
    }

    // Aggregate
    let totalPendente = 0;
    let totalPago = 0;
    let qtdPendentes = 0;
    let qtdPagos = 0;

    for (const f of fechamentos) {
      if (f.status === 'pago') {
        totalPago += f.saldo_motorista;
        qtdPagos += 1;
      } else {
        totalPendente += f.saldo_motorista;
        qtdPendentes += 1;
      }
    }

    const rows = fechamentos.map((f) => ({
      id: f.id,
      motorista_nome: motoristaLookup.get(f.motorista_id) ?? 'desconhecido',
      periodo_inicio: f.periodo_inicio,
      periodo_fim: f.periodo_fim,
      total_viagens_centavos: f.total_viagens,
      total_gastos_centavos: f.total_gastos,
      saldo_motorista_centavos: f.saldo_motorista,
      status: f.status,
      pago_em: f.pago_em,
    }));

    return {
      filtro: {
        motorista: input.motorista_nome ?? null,
        status: statusFiltro,
        periodo: period ? { start: period.startDate, end: period.endDate, label: period.label } : null,
      },
      resumo: {
        total_pendente_centavos: totalPendente,
        total_pago_centavos: totalPago,
        qtd_pendentes: qtdPendentes,
        qtd_pagos: qtdPagos,
      },
      fechamentos: rows,
    };
  } catch (error) {
    if (error instanceof ToolExecutionError) throw error;
    throw new ToolExecutionError(
      'fechamentos_pendentes',
      `Erro inesperado: ${error instanceof Error ? error.message : 'desconhecido'}`,
      { input },
    );
  }
}
