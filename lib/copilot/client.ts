/**
 * Assistente FrotaViva — multi-tier providers com fallback silencioso.
 *
 * Estrategia: melhor qualidade primeiro, maior capacidade por ultimo.
 * Quando um tier esgota (rate limit, erro), o sistema cai pro proximo sem
 * mostrar o erro ao usuario. Total free tier: ~285 perguntas/dia.
 *
 * Tier 1 (premium): Gemini 2.5 Flash  — 10 RPM, 250 RPD, segue instrucoes complexas
 * Tier 2 (standard): Llama 3.3 70B    — 30 RPM, 100K TPD, qualidade media
 * Tier 3 (basic):    Llama 4 Scout    — 30 RPM, 500K TPD, modelo menor mas capacidade alta
 */

import { google } from '@ai-sdk/google';
import { groq } from '@ai-sdk/groq';
import type { LanguageModel } from 'ai';

export type ModelTier = 'premium' | 'standard' | 'basic';

export interface ProviderConfig {
  name: string;
  tier: ModelTier;
  envKey: string;
  factory: () => LanguageModel;
}

const PROVIDERS: ProviderConfig[] = [
  {
    name: 'Gemini 2.5 Flash',
    tier: 'premium',
    envKey: 'GOOGLE_GENERATIVE_AI_API_KEY',
    factory: () => google('gemini-2.5-flash'),
  },
  {
    name: 'Groq Llama 3.3 70B',
    tier: 'standard',
    envKey: 'GROQ_API_KEY',
    factory: () => groq('llama-3.3-70b-versatile'),
  },
  {
    name: 'Groq Llama 4 Scout 17B',
    tier: 'basic',
    envKey: 'GROQ_API_KEY',
    factory: () => groq('meta-llama/llama-4-scout-17b-16e-instruct'),
  },
];

export function getAvailableProviders(): ProviderConfig[] {
  const providers = PROVIDERS.filter((p) => process.env[p.envKey]);
  if (providers.length === 0) {
    throw new Error(
      'Nenhuma API key configurada (GOOGLE_GENERATIVE_AI_API_KEY ou GROQ_API_KEY)',
    );
  }
  return providers;
}

// Legacy — mantido pra retrocompatibilidade com codigo que ainda usa getAvailableModels/getAssistenteModel
export function getAvailableModels(): Array<{ name: string; model: LanguageModel }> {
  return getAvailableProviders().map((p) => ({ name: p.name, model: p.factory() }));
}

export function getAssistenteModel(): LanguageModel {
  return getAvailableProviders()[0].factory();
}
