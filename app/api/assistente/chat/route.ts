/**
 * Assistente FrotaViva — chat route com fallback silencioso em 3 tiers.
 *
 * Fluxo: Auth -> rate limit -> probe tier 1 -> se falhar, probe tier 2 -> tier 3.
 * Cada tier usa um system prompt adaptado ao modelo. Erros sao silenciosos pro
 * usuario — so vira visivel se TODOS os tiers esgotarem.
 */

import { streamText, generateText, stepCountIs, convertToModelMessages } from 'ai';
import type { UIMessage } from 'ai';

import { getAvailableProviders } from '@/lib/copilot/client';
import { checkRateLimit } from '@/lib/copilot/rate-limit';
import { logger } from '@/lib/copilot/logger';
import { SYSTEM_PROMPTS } from '@/lib/copilot/system-prompt';
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
      return Response.json(
        {
          error: `Limite de perguntas atingido. Tente de novo em ${minutes} minuto(s).`,
          retryAfterSeconds: rateLimit.retryAfterSeconds,
        },
        { status: 429 },
      );
    }

    // 3. Parse body
    const body = (await request.json()) as { messages?: UIMessage[] };
    const messages = body.messages ?? [];

    if (messages.length === 0) {
      return Response.json({ error: 'Nenhuma mensagem enviada.' }, { status: 400 });
    }

    // 4. Build context
    const supabase = await createClient();
    const multiEmpresa = await getMultiEmpresaContext();
    const empresaIds = multiEmpresa.empresaIds;
    const tools = buildToolset({ supabase, usuario, empresaIds });

    // Slice antes do convert pra preservar integridade de turnos.
    // convertToModelMessages expande tool calls/results em mensagens separadas, e cortar
    // DEPOIS pode quebrar a ordem (tool_call sem tool_result adjacente) — Gemini recusa.
    const recentUIMessages = messages.slice(-3);
    const recentMessages = await convertToModelMessages(recentUIMessages);

    logger.info('chat request', {
      usuarioId: usuario.id,
      empresaCount: empresaIds.length,
      messageCount: recentMessages.length,
    });

    // 5. Fallback chain: premium -> standard -> basic
    const providers = getAvailableProviders();
    const errors: string[] = [];

    for (const { name, tier, factory } of providers) {
      const model = factory();
      try {
        // Probe: chamada com as mensagens REAIS (sem tools) pra validar formato.
        // Gemini e rigoroso com ordem de mensagens no historico e recusa estruturas invalidas.
        // Ao passar o historico real, detectamos esse tipo de erro antes de iniciar o stream.
        // Custo: ~5 tokens por tentativa fracassada (desprezivel).
        await generateText({
          model,
          system: SYSTEM_PROMPTS[tier],
          messages: recentMessages,
          maxOutputTokens: 5,
          maxRetries: 0,
        });

        // Probe passou. Dispara o stream real com tools e prompt adaptado ao tier.
        const result = streamText({
          model,
          system: SYSTEM_PROMPTS[tier],
          messages: recentMessages,
          tools,
          stopWhen: stepCountIs(3),
          maxOutputTokens: 768,
          maxRetries: 0,
        });

        // Aguarda geracao completa server-side pra capturar erros in-stream
        // (ex: TPM esgotado no meio da geracao). `result.text` rejeita em erro.
        // UX: usuario ve resposta completa de uma vez em vez de streaming token a token,
        // mas em troca fallback fica 100% silencioso pro usuario.
        await result.text;

        logger.info(`using provider: ${name} (tier: ${tier})`, {});
        return result.toUIMessageStreamResponse();
      } catch (error) {
        const msg = error instanceof Error ? error.message : String(error);
        errors.push(`${name}: ${msg}`);
        logger.warn(`provider ${name} probe failed, trying next tier`, { msg });
        continue;
      }
    }

    // Todos os tiers falharam
    console.error('[copilot] all tiers exhausted:', errors.join(' | '));
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
