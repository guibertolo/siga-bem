'use server';

import { createClient } from '@/lib/supabase/server';
import { getCurrentUsuario } from '@/lib/auth/get-user-role';
import { logError } from '@/lib/observability/logger';
import type {
  RelatorioCaminhaoActionResult,
  RelatorioCaminhaoResult,
} from '@/types/relatorios';

/**
 * Gera relatorio completo de um caminhao em um periodo.
 * Defesa-em-profundidade: valida empresa_id antes de chamar RPC.
 * Nao ha signed URLs nesta versao (relatorio agrega custos por categoria,
 * nao exibe comprovantes individuais).
 *
 * Story 23.6
 *
 * NOTE: Secao proximos_alertas omitida — depende de Story 18.1 (Draft).
 * Campos ipva/crlv/proxima_revisao_km NAO existem na tabela caminhao.
 */
export async function gerarRelatorioCaminhao(
  caminhaoId: string,
  inicio: string,
  fim: string,
): Promise<RelatorioCaminhaoActionResult> {
  const usuario = await getCurrentUsuario();
  if (!usuario) {
    return { success: false, error: 'Nao autenticado', status: 401 };
  }

  const supabase = await createClient();

  // -----------------------------------------------------------------------
  // Defesa-em-profundidade: caminhao pertence a empresa da sessao?
  // -----------------------------------------------------------------------
  const { data: caminhao, error: camError } = await supabase
    .from('caminhao')
    .select('empresa_id')
    .eq('id', caminhaoId)
    .single();

  if (camError || !caminhao) {
    return { success: false, error: 'Caminhao nao encontrado', status: 404 };
  }

  if (caminhao.empresa_id !== usuario.empresa_id) {
    logError(
      {
        action: 'gerarRelatorioCaminhao',
        empresaId: usuario.empresa_id,
        usuarioId: usuario.id,
        params: { caminhaoId, tentativa_empresa: caminhao.empresa_id },
      },
      new Error('Acesso negado: caminhao de outra empresa'),
    );
    return { success: false, error: 'Acesso negado', status: 403 };
  }

  // -----------------------------------------------------------------------
  // Chamar RPC
  // -----------------------------------------------------------------------
  const { data: rpcData, error: rpcError } = await supabase.rpc(
    'relatorio_caminhao_periodo',
    {
      p_caminhao_id: caminhaoId,
      p_inicio: inicio,
      p_fim: fim,
    },
  );

  if (rpcError) {
    logError(
      {
        action: 'gerarRelatorioCaminhao.rpc',
        empresaId: usuario.empresa_id,
        usuarioId: usuario.id,
        params: { caminhaoId, inicio, fim },
      },
      rpcError,
    );
    return { success: false, error: 'Erro ao gerar relatorio' };
  }

  const result = rpcData as RelatorioCaminhaoResult;

  if ('error' in result && (result as Record<string, unknown>).error) {
    return { success: false, error: String((result as Record<string, unknown>).error) };
  }

  return {
    success: true,
    data: result,
  };
}
