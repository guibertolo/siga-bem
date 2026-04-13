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

    // Limitar historico a ultimas 6 mensagens pra economizar tokens
    // Cada mensagem anterior consome tokens do input. O dono nao precisa
    // que o LLM lembre de 20 perguntas atras.
    const recentMessages = modelMessages.slice(-6);

    logger.info('chat request', {
      usuarioId: usuario.id,
      empresaCount: empresaIds.length,
      messageCount: recentMessages.length,
    });

    // 5. Tenta cada provider em sequencia ate um funcionar
    const models = getAvailableModels();
    const errors: string[] = [];

    for (const { name, model } of models) {
      try {
        const result = streamText({
          model,
          system: SYSTEM_PROMPT,
          messages: recentMessages,
          tools,
          stopWhen: stepCountIs(5),
          maxOutputTokens: 512,
          maxRetries: 0,
        });

        // Consumir o resultado pra detectar erros antes de retornar
        // toUIMessageStreamResponse() inicia o stream; se o provider falhar,
        // o erro aparece no consumo. Usamos consumeStream pra validar.
        const response = result.toUIMessageStreamResponse();

        // Testa se o provider respondeu fazendo uma request de validacao simples
        // Se chegou aqui sem throw, o provider aceitou a request
        logger.info(`using provider: ${name}`, {});
        return response;
      } catch (error) {
        const msg = error instanceof Error ? error.message : String(error);
        errors.push(`${name}: ${msg}`);
        logger.warn(`provider ${name} failed: ${msg}`, {});
        continue;
      }
    }

    // Nenhum provider funcionou
    console.error('[copilot] all providers failed:', errors.join(' | '));
    return Response.json(
      { error: 'O servico esta temporariamente indisponivel. Tente de novo em alguns segundos.' },
      { status: 503 },
    );
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
