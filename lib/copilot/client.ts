/**
 * Assistente FrotaViva — LLM com fallback automatico multi-provider.
 *
 * Providers (ordem de prioridade):
 * 1. Groq Llama 4 Scout 17B — 30 RPM, tool calling nativo, rapido, token-eficiente
 * 2. Google Gemini 2.0 Flash — 10 RPM, 250 RPD, excelente tool calling
 *
 * Llama 4 Scout 17B usa ~750 tokens por request (vs ~3-4K do 70B).
 * Com 30 RPM: ~10-15 perguntas/min (cada pergunta = 2-3 requests).
 * Se Groq bater rate limit, cai pro Gemini automaticamente.
 */

import { google } from '@ai-sdk/google';
import { groq } from '@ai-sdk/groq';
import type { LanguageModel } from 'ai';

interface ProviderConfig {
  name: string;
  envKey: string;
  factory: () => LanguageModel;
}

const PROVIDERS: ProviderConfig[] = [
  {
    name: 'Groq (Llama 4 Scout 17B)',
    envKey: 'GROQ_API_KEY',
    factory: () => groq('meta-llama/llama-4-scout-17b-16e-instruct'),
  },
  {
    name: 'Gemini 2.0 Flash',
    envKey: 'GOOGLE_GENERATIVE_AI_API_KEY',
    factory: () => google('gemini-2.0-flash'),
  },
];

export function getAvailableModels(): Array<{ name: string; model: LanguageModel }> {
  const models: Array<{ name: string; model: LanguageModel }> = [];
  for (const p of PROVIDERS) {
    if (process.env[p.envKey]) {
      models.push({ name: p.name, model: p.factory() });
    }
  }
  if (models.length === 0) {
    throw new Error('Nenhuma API key configurada (GROQ_API_KEY ou GOOGLE_GENERATIVE_AI_API_KEY)');
  }
  return models;
}

export function getAssistenteModel(): LanguageModel {
  return getAvailableModels()[0].model;
}
