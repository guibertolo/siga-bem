'use server';

import { createClient } from '@/lib/supabase/server';
import { getCurrentUsuario } from '@/lib/auth/get-user-role';
import { logError } from '@/lib/observability/logger';
import type {
  RelatorioMotoristaActionResult,
  RelatorioMotoristaResult,
  RelatorioMotoristaViagem,
} from '@/types/relatorios';

/**
 * Gera relatorio completo de viagens de um motorista em um periodo.
 * Defesa-em-profundidade: valida empresa_id antes de chamar RPC.
 * Signed URLs geradas aqui (TypeScript), nunca no SQL.
 *
 * Story 23.5
 */
export async function gerarRelatorioMotorista(
  motoristId: string,
  inicio: string,
  fim: string,
): Promise<RelatorioMotoristaActionResult> {
  const usuario = await getCurrentUsuario();
  if (!usuario) {
    return { success: false, error: 'Nao autenticado', status: 401 };
  }

  const supabase = await createClient();

  // -----------------------------------------------------------------------
  // Defesa-em-profundidade: motorista pertence a empresa da sessao?
  // -----------------------------------------------------------------------
  const { data: motorista, error: motError } = await supabase
    .from('motorista')
    .select('empresa_id')
    .eq('id', motoristId)
    .single();

  if (motError || !motorista) {
    return { success: false, error: 'Motorista nao encontrado', status: 404 };
  }

  if (motorista.empresa_id !== usuario.empresa_id) {
    logError(
      {
        action: 'gerarRelatorioMotorista',
        empresaId: usuario.empresa_id,
        usuarioId: usuario.id,
        params: { motoristId, tentativa_empresa: motorista.empresa_id },
      },
      new Error('Acesso negado: motorista de outra empresa'),
    );
    return { success: false, error: 'Acesso negado', status: 403 };
  }

  // -----------------------------------------------------------------------
  // Chamar RPC
  // -----------------------------------------------------------------------
  const { data: rpcData, error: rpcError } = await supabase.rpc(
    'relatorio_motorista_periodo',
    {
      p_motorista_id: motoristId,
      p_inicio: inicio,
      p_fim: fim,
    },
  );

  if (rpcError) {
    logError(
      {
        action: 'gerarRelatorioMotorista.rpc',
        empresaId: usuario.empresa_id,
        usuarioId: usuario.id,
        params: { motoristId, inicio, fim },
      },
      rpcError,
    );
    return { success: false, error: 'Erro ao gerar relatorio' };
  }

  const result = rpcData as RelatorioMotoristaResult;

  if ('error' in result && (result as Record<string, unknown>).error) {
    return { success: false, error: String((result as Record<string, unknown>).error) };
  }

  // -----------------------------------------------------------------------
  // Gerar signed URLs para comprovantes (TypeScript, nao SQL)
  // -----------------------------------------------------------------------
  const viagensComUrls: RelatorioMotoristaViagem[] = await Promise.all(
    (result.viagens ?? []).map(async (viagem) => {
      const comprovantesComUrl = await Promise.all(
        (viagem.comprovantes ?? []).map(async (comp) => {
          const { data: signedUrlData } = await supabase.storage
            .from('comprovantes')
            .createSignedUrl(comp.storage_path, 300);
          return {
            storage_path: comp.storage_path,
            url_signed: signedUrlData?.signedUrl ?? null,
          };
        }),
      );
      return {
        ...viagem,
        comprovantes: comprovantesComUrl,
      };
    }),
  );

  return {
    success: true,
    data: {
      ...result,
      viagens: viagensComUrls,
    },
  };
}
