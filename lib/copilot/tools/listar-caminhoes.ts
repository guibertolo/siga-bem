/**
 * Assistente FrotaViva — Tool T6: listar_caminhoes.
 *
 * Story 9.2 (AC-4). Helper tool the LLM calls when the user mentions a
 * caminhao by partial plate or nickname and the assistant needs to
 * resolve it to an ID for another query. Also useful for plain
 * "quais caminhoes tenho ativos?" questions.
 */

import { z } from 'zod';

import { MAX_TOOL_ROWS, ToolExecutionError } from '@/lib/copilot/tools/index';
import type { ToolContext } from '@/lib/copilot/tools/index';

export const listarCaminhoesSchema = z.object({
  busca: z
    .string()
    .optional()
    .describe(
      'Fragmento da placa ou modelo (case-insensitive). Se vazio, retorna todos os caminhoes ativos.',
    ),
});

export type ListarCaminhoesInput = z.infer<typeof listarCaminhoesSchema>;

export interface ListarCaminhoesResult {
  caminhoes: Array<{
    id: string;
    placa: string;
    modelo: string;
    marca: string | null;
    ano: number | null;
  }>;
  limite_aplicado: boolean;
}

interface CaminhaoRow {
  id: string;
  placa: string;
  modelo: string;
  marca: string | null;
  ano: number | null;
}

export async function executeListarCaminhoes(
  input: ListarCaminhoesInput,
  ctx: ToolContext,
): Promise<ListarCaminhoesResult> {
  try {
    const { supabase, empresaIds } = ctx;

    if (empresaIds.length === 0) {
      return { caminhoes: [], limite_aplicado: false };
    }

    let query = supabase
      .from('caminhao')
      .select('id, placa, modelo, marca, ano')
      .in('empresa_id', empresaIds)
      .eq('ativo', true)
      .order('placa', { ascending: true })
      .limit(MAX_TOOL_ROWS);

    if (input.busca && input.busca.trim().length > 0) {
      const needle = input.busca.trim();
      // ilike is case-insensitive. We search placa OR modelo.
      // PostgREST `.or()` accepts a comma-separated list.
      const pattern = `%${needle}%`;
      query = query.or(`placa.ilike.${pattern},modelo.ilike.${pattern}`);
    }

    const { data, error } = await query;
    if (error) {
      throw new ToolExecutionError(
        'listar_caminhoes',
        `Falha ao listar caminhoes: ${error.message}`,
        { input, empresaIds },
      );
    }

    const rows = (data ?? []) as CaminhaoRow[];
    return {
      caminhoes: rows.map((row) => ({
        id: row.id,
        placa: row.placa,
        modelo: row.modelo,
        marca: row.marca,
        ano: row.ano,
      })),
      limite_aplicado: rows.length === MAX_TOOL_ROWS,
    };
  } catch (error) {
    if (error instanceof ToolExecutionError) {
      throw error;
    }
    throw new ToolExecutionError(
      'listar_caminhoes',
      `Erro inesperado: ${error instanceof Error ? error.message : 'desconhecido'}`,
      { input },
    );
  }
}
