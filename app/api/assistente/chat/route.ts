/**
 * Assistente FrotaViva — chat route handler.
 *
 * Story 9.5 (AC-4). POST /api/assistente/chat
 * Auth -> rate limit -> streamText with 6 tools -> streaming response.
 */

import { streamText, stepCountIs, convertToModelMessages } from 'ai';
import type { UIMessage } from 'ai';

import { getAssistenteModel } from '@/lib/copilot/client';
import { checkRateLimit } from '@/lib/copilot/rate-limit';
import { logger } from '@/lib/copilot/logger';
import { SYSTEM_PROMPT } from '@/lib/copilot/system-prompt';
import { buildToolset } from '@/lib/copilot/tools/index';
import { getCurrentUsuario } from '@/lib/auth/get-user-role';
import { getMultiEmpresaContext } from '@/lib/queries/multi-empresa';
import { createClient } from '@/lib/supabase/server';

export const runtime = 'nodejs';

export async function POST(request: Request) {
  try {
    // 1. Auth
    const usuario = await getCurrentUsuario();
    if (!usuario) {
      return Response.json(
        { error: 'Nao autenticado' },
        { status: 401 },
      );
    }

    // 2. Rate limit
    const rateLimit = await checkRateLimit(usuario.id);
    if (!rateLimit.allowed) {
      const minutes = Math.max(1, Math.ceil((rateLimit.retryAfterSeconds ?? 60) / 60));
      return Response.json(
        {
          error: `Limite de perguntas atingido. Tente de novo em ${minutes} minuto(s).`,
          retryAfterSeconds: rateLimit.retryAfterSeconds,
        },
        { status: 429 },
      );
    }

    // 3. Parse body
    const body = await request.json() as { messages?: UIMessage[] };
    const messages = body.messages ?? [];

    if (messages.length === 0) {
      return Response.json(
        { error: 'Nenhuma mensagem enviada.' },
        { status: 400 },
      );
    }

    // 4. Build context
    const supabase = await createClient();
    const multiEmpresa = await getMultiEmpresaContext();
    const empresaIds = multiEmpresa.empresaIds;

    const tools = buildToolset({ supabase, usuario, empresaIds });

    logger.info('chat request', {
      usuarioId: usuario.id,
      empresaCount: empresaIds.length,
      empresaIds: empresaIds.join(','),
      messageCount: messages.length,
      role: usuario.role,
    });

    // 5. Stream
    const result = streamText({
      model: getAssistenteModel(),
      system: SYSTEM_PROMPT,
      messages: await convertToModelMessages(messages),
      tools,
      stopWhen: stepCountIs(5),
      maxOutputTokens: 1024,
      maxRetries: 0,
    });

    return result.toUIMessageStreamResponse();
  } catch (error) {
    logger.error('chat handler failed', error, {});

    const errorMsg = error instanceof Error ? error.message : '';
    if (errorMsg.includes('quota') || errorMsg.includes('rate') || errorMsg.includes('429')) {
      return Response.json(
        { error: 'O servico esta temporariamente sobrecarregado. Espere alguns segundos e tente de novo.' },
        { status: 429 },
      );
    }

    return Response.json(
      { error: 'Erro ao processar sua pergunta. Tente novamente.' },
      { status: 500 },
    );
  }
}
