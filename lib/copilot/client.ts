/**
 * Assistente FrotaViva — LLM com fallback automatico multi-provider.
 *
 * Providers (ordem de prioridade):
 * 1. Groq Llama 4 Scout 17B — 30 RPM, 1000 RPD, 500K TPD (free tier)
 *    tool calling nativo, rapido, ~850 tok/step × 3 steps = ~200 perguntas/dia
 * 2. Gemini 2.5 Flash — 10 RPM, 250 RPD (free tier, fallback)
 *    OBS: Gemini 2.0 Flash depreciado, desligamento junho/2026
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
    name: 'Gemini 2.5 Flash',
    envKey: 'GOOGLE_GENERATIVE_AI_API_KEY',
    factory: () => google('gemini-2.5-flash'),
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
