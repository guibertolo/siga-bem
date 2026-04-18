/**
 * Assistente FrotaViva — Tool T4: motoristas_cnh_vencendo.
 *
 * Story 9.4 (AC-1). Queries motoristas with CNH expiring within N days
 * (default 30). Also includes already-expired CNH (dias_ate_vencer < 0),
 * ordered from most overdue to soonest to expire.
 *
 * RLS enforced via createClient() SSR + belt-and-suspenders empresaIds.
 */

import { z } from 'zod';

import { MAX_TOOL_ROWS, ToolExecutionError } from '@/lib/copilot/tools/constants';
import type { ToolContext } from '@/lib/copilot/tools/constants';

export const motoristasCnhVencendoSchema = z.object({
  dias: z
    .coerce.number()
    .int()
    .min(1)
    .max(365)
    .optional()
    .describe('Janela em dias para considerar CNH vencendo (default 30, max 365).'),
});

export type MotoristasCnhVencendoInput = z.infer<typeof motoristasCnhVencendoSchema>;

export interface MotoristasCnhVencendoResult {
  dias_janela: number;
  motoristas: Array<{
    id: string;
    nome: string;
    cnh_numero: string | null;
    cnh_categoria: string | null;
    cnh_validade: string;
    dias_ate_vencer: number;
  }>;
}

interface MotoristaRow {
  id: string;
  nome: string;
  cnh_numero: string | null;
  cnh_categoria: string | null;
  cnh_validade: string;
}

function todayIso(): string {
  const parts = new Intl.DateTimeFormat('sv-SE', {
    timeZone: 'America/Sao_Paulo',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date());
  return parts;
}

function diffDays(from: string, to: string): number {
  const a = new Date(from + 'T00:00:00Z');
  const b = new Date(to + 'T00:00:00Z');
  return Math.round((b.getTime() - a.getTime()) / (1000 * 60 * 60 * 24));
}

export async function executeMotoristasCnhVencendo(
  input: MotoristasCnhVencendoInput,
  ctx: ToolContext,
): Promise<MotoristasCnhVencendoResult> {
  try {
    const dias = input.dias ?? 30;
    const { supabase, empresaIds } = ctx;

    if (empresaIds.length === 0) {
      return { dias_janela: dias, motoristas: [] };
    }

    const hoje = todayIso();
    const futureDate = new Date(hoje + 'T00:00:00Z');
    futureDate.setUTCDate(futureDate.getUTCDate() + dias);
    const limiteIso = futureDate.toISOString().slice(0, 10);

    // Fetch motoristas with CNH already expired OR expiring within the window
    const { data, error } = await supabase
      .from('motorista')
      .select('id, nome, cnh_numero, cnh_categoria, cnh_validade')
      .eq('status', 'ativo')
      .not('cnh_validade', 'is', null)
      .lte('cnh_validade', limiteIso)
      .in('empresa_id', empresaIds)
      .order('cnh_validade', { ascending: true })
      .limit(MAX_TOOL_ROWS);

    if (error) {
      throw new ToolExecutionError(
        'motoristas_cnh_vencendo',
        `Falha ao buscar motoristas: ${error.message}`,
        { dias, empresaIds },
      );
    }

    const rows = (data ?? []) as MotoristaRow[];
    const motoristas = rows.map((row) => ({
      id: row.id,
      nome: row.nome,
      cnh_numero: row.cnh_numero,
      cnh_categoria: row.cnh_categoria,
      cnh_validade: row.cnh_validade,
      dias_ate_vencer: diffDays(hoje, row.cnh_validade),
    }));

    return { dias_janela: dias, motoristas };
  } catch (error) {
    if (error instanceof ToolExecutionError) {
      throw error;
    }
    throw new ToolExecutionError(
      'motoristas_cnh_vencendo',
      `Erro inesperado: ${error instanceof Error ? error.message : 'desconhecido'}`,
      { input },
    );
  }
}
