/**
 * Assistente FrotaViva — chat route handler com fallback multi-provider.
 *
 * Auth -> rate limit -> tenta provider 1 -> se falhar, tenta provider 2 -> streaming.
 */

import { streamText, stepCountIs, convertToModelMessages } from 'ai';
import type { UIMessage } from 'ai';

import { getAvailableModels } from '@/lib/copilot/client';
import { checkRateLimit } from '@/lib/copilot/rate-limit';
import { logger } from '@/lib/copilot/logger';
import { SYSTEM_PROMPT } from '@/lib/copilot/system-prompt';
import { buildToolset } from '@/lib/copilot/tools/index';
import { getCurrentUsuario } from '@/lib/auth/get-user-role';
import { getMultiEmpresaContext } from '@/lib/queries/multi-empresa';
import { createClient } from '@/lib/supabase/server';

export const runtime = 'nodejs';

function isRateLimitError(error: unknown): boolean {
  const msg = error instanceof Error ? error.message : String(error);
  return msg.includes('quota') || msg.includes('rate_limit') || msg.includes('429')
    || msg.includes('exceeded') || msg.includes('too many');
}

export async function POST(request: Request) {
  try {
    // 1. Auth
    const usuario = await getCurrentUsuario();
    if (!usuario) {
      return Response.json({ error: 'Nao autenticado' }, { status: 401 });
    }

    // 2. Rate limit
    const rateLimit = await checkRateLimit(usuario.id);
    if (!rateLimit.allowed) {
      const minutes = Math.max(1, Math.ceil((rateLimit.retryAfterSeconds ?? 60) / 60));
      return Response.json({
        error: `Limite de perguntas atingido. Tente de novo em ${minutes} minuto(s).`,
        retryAfterSeconds: rateLimit.retryAfterSeconds,
      }, { status: 429 });
    }

    // 3. Parse body
    const body = await request.json() as { messages?: UIMessage[] };
    const messages = body.messages ?? [];

    if (messages.length === 0) {
      return Response.json({ error: 'Nenhuma mensagem enviada.' }, { status: 400 });
    }

    // 4. Build context
    const supabase = await createClient();
    const multiEmpresa = await getMultiEmpresaContext();
    const empresaIds = multiEmpresa.empresaIds;
    const tools = buildToolset({ supabase, usuario, empresaIds });
    const modelMessages = await convertToModelMessages(messages);

    logger.info('chat request', {
      usuarioId: usuario.id,
      empresaCount: empresaIds.length,
      messageCount: messages.length,
    });

    // 5. Stream com fallback multi-provider
    const models = getAvailableModels();
    let lastError: unknown = null;

    for (const { name, model } of models) {
      try {
        const result = streamText({
          model,
          system: SYSTEM_PROMPT,
          messages: modelMessages,
          tools,
          stopWhen: stepCountIs(5),
          maxOutputTokens: 1024,
          maxRetries: 0,
        });

        logger.info(`using provider: ${name}`, {});
        return result.toUIMessageStreamResponse();
      } catch (error) {
        lastError = error;
        const msg = error instanceof Error ? error.message : String(error);
        logger.warn(`provider ${name} failed: ${msg}`, {});

        if (isRateLimitError(error)) {
          continue; // Try next provider
        }
        throw error; // Non-rate-limit error, don't fallback
      }
    }

    // All providers failed
    if (isRateLimitError(lastError)) {
      return Response.json(
        { error: 'Todos os servicos estao temporariamente sobrecarregados. Espere alguns segundos e tente de novo.' },
        { status: 429 },
      );
    }
    throw lastError;
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    console.error('[copilot] handler error:', errorMsg);
    logger.error('chat handler failed', error, { msg: errorMsg });

    return Response.json(
      { error: 'Erro ao processar sua pergunta. Tente novamente.' },
      { status: 500 },
    );
  }
}
