import { NextRequest } from 'next/server';
import * as Sentry from '@sentry/nextjs';
import { renderToStream } from '@react-pdf/renderer';
import { createElement } from 'react';
import { createClient } from '@/lib/supabase/server';
import { getCurrentUsuario } from '@/lib/auth/get-user-role';
import { logError } from '@/lib/observability/logger';
import { RelatorioMotoristaPdf } from '@/components/pdf/RelatorioMotoristaPdf';
import { RelatorioCaminhaoPdf } from '@/components/pdf/RelatorioCaminhaoPdf';
import type { RelatorioMotoristaResult, RelatorioCaminhaoResult } from '@/types/relatorios';

export const runtime = 'nodejs'; // NAO remover - @react-pdf nao funciona em Edge
export const dynamic = 'force-dynamic';

const THRESHOLD_VIAGENS = 200;

type TipoRelatorio = 'motorista' | 'caminhao';

function isValidTipo(tipo: string): tipo is TipoRelatorio {
  return tipo === 'motorista' || tipo === 'caminhao';
}

/**
 * Sanitize filename: remove special chars, keep alphanumeric + hyphens.
 */
function sanitizeFilename(name: string): string {
  return name
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .toLowerCase()
    .slice(0, 60);
}

/**
 * Fetch motorista report data (mirrors gerarRelatorioMotorista logic).
 * Cannot use server action directly in route handler (server actions are
 * bound to form/fetch from client). Duplicate the RPC + signed URL logic.
 */
async function fetchRelatorioMotorista(
  motoristaId: string,
  empresaId: string,
  inicio: string,
  fim: string,
): Promise<{ data?: RelatorioMotoristaResult; error?: string; status?: number }> {
  const supabase = await createClient();

  const { data: motorista, error: motError } = await supabase
    .from('motorista')
    .select('empresa_id')
    .eq('id', motoristaId)
    .single();

  if (motError || !motorista) {
    return { error: 'Motorista nao encontrado', status: 404 };
  }

  if (motorista.empresa_id !== empresaId) {
    return { error: 'Acesso negado', status: 403 };
  }

  const { data: rpcData, error: rpcError } = await supabase.rpc(
    'relatorio_motorista_periodo',
    {
      p_motorista_id: motoristaId,
      p_inicio: inicio,
      p_fim: fim,
    },
  );

  if (rpcError) {
    logError(
      {
        action: 'pdf.relatorioMotorista.rpc',
        empresaId,
        params: { motoristaId, inicio, fim },
      },
      rpcError,
    );
    return { error: 'Erro ao gerar relatorio' };
  }

  const result = rpcData as RelatorioMotoristaResult;

  if ('error' in result && (result as Record<string, unknown>).error) {
    return { error: String((result as Record<string, unknown>).error) };
  }

  // Generate signed URLs for comprovantes
  const viagensComUrls = await Promise.all(
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
      return { ...viagem, comprovantes: comprovantesComUrl };
    }),
  );

  return { data: { ...result, viagens: viagensComUrls } };
}

/**
 * Fetch caminhao report data (mirrors gerarRelatorioCaminhao logic).
 */
async function fetchRelatorioCaminhao(
  caminhaoId: string,
  empresaId: string,
  inicio: string,
  fim: string,
): Promise<{ data?: RelatorioCaminhaoResult; error?: string; status?: number }> {
  const supabase = await createClient();

  const { data: caminhao, error: camError } = await supabase
    .from('caminhao')
    .select('empresa_id')
    .eq('id', caminhaoId)
    .single();

  if (camError || !caminhao) {
    return { error: 'Caminhao nao encontrado', status: 404 };
  }

  if (caminhao.empresa_id !== empresaId) {
    return { error: 'Acesso negado', status: 403 };
  }

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
        action: 'pdf.relatorioCaminhao.rpc',
        empresaId,
        params: { caminhaoId, inicio, fim },
      },
      rpcError,
    );
    return { error: 'Erro ao gerar relatorio' };
  }

  const result = rpcData as RelatorioCaminhaoResult;

  if ('error' in result && (result as Record<string, unknown>).error) {
    return { error: String((result as Record<string, unknown>).error) };
  }

  return { data: result };
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ tipo: string; id: string }> },
) {
  try {
    const { tipo, id } = await params;

    // Validate tipo
    if (!isValidTipo(tipo)) {
      return Response.json(
        { error: 'Tipo invalido. Use "motorista" ou "caminhao".' },
        { status: 400 },
      );
    }

    // Auth check
    const usuario = await getCurrentUsuario();
    if (!usuario) {
      return Response.json({ error: 'Nao autenticado' }, { status: 401 });
    }

    if (!usuario.empresa_id) {
      return Response.json({ error: 'Usuario sem empresa vinculada' }, { status: 403 });
    }

    const empresaId: string = usuario.empresa_id;

    // Read query params
    const searchParams = request.nextUrl.searchParams;
    const inicio = searchParams.get('inicio');
    const fim = searchParams.get('fim');

    if (!inicio || !fim) {
      return Response.json(
        { error: 'Parâmetros início e fim são obrigatórios' },
        { status: 400 },
      );
    }

    const inicioStr: string = inicio;
    const fimStr: string = fim;

    // Fetch data based on tipo
    let pdfName: string;
    let totalViagens: number;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let pdfStream: any;

    if (tipo === 'motorista') {
      const result = await fetchRelatorioMotorista(id, empresaId, inicioStr, fimStr);

      if (result.error || !result.data) {
        return Response.json(
          { error: result.error ?? 'Erro ao buscar dados' },
          { status: result.status ?? 500 },
        );
      }

      totalViagens = result.data.viagens.length;

      // Threshold check
      if (totalViagens > THRESHOLD_VIAGENS) {
        Sentry.captureMessage('Relatorio PDF grande solicitado', {
          extra: { tipo, id, totalViagens },
        });
        return Response.json(
          { status: 'queued', message: 'Relatorio grande, processando...' },
          { status: 202 },
        );
      }

      pdfName = sanitizeFilename(result.data.header.motorista_nome);
      pdfStream = await renderToStream(
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        createElement(RelatorioMotoristaPdf, { data: result.data }) as any,
      );
    } else {
      const result = await fetchRelatorioCaminhao(id, empresaId, inicioStr, fimStr);

      if (result.error || !result.data) {
        return Response.json(
          { error: result.error ?? 'Erro ao buscar dados' },
          { status: result.status ?? 500 },
        );
      }

      totalViagens = result.data.viagens.length;

      // Threshold check
      if (totalViagens > THRESHOLD_VIAGENS) {
        Sentry.captureMessage('Relatorio PDF grande solicitado', {
          extra: { tipo, id, totalViagens },
        });
        return Response.json(
          { status: 'queued', message: 'Relatorio grande, processando...' },
          { status: 202 },
        );
      }

      pdfName = sanitizeFilename(
        `${result.data.header.caminhao_placa}-${result.data.header.caminhao_modelo}`,
      );
      pdfStream = await renderToStream(
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        createElement(RelatorioCaminhaoPdf, { data: result.data }) as any,
      );
    }

    const periodo = `${inicioStr}_${fimStr}`;
    const filename = `relatorio-${tipo}-${pdfName}-${periodo}.pdf`;

    return new Response(pdfStream as unknown as ReadableStream, {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${filename}"`,
      },
    });
  } catch (error) {
    logError(
      { action: 'pdf.route.GET' },
      error instanceof Error ? error : new Error(String(error)),
    );
    Sentry.captureException(error);
    return Response.json(
      { error: 'Erro interno ao gerar PDF' },
      { status: 500 },
    );
  }
}
