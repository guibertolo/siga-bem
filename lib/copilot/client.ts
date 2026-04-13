/**
 * Assistente FrotaViva — LLM client factory.
 *
 * Supports multiple providers via env vars. Priority:
 * 1. GROQ_API_KEY → Groq (Llama 3.3 70B, generous free tier)
 * 2. GOOGLE_GENERATIVE_AI_API_KEY → Google Gemini 2.0 Flash
 *
 * Groq free tier: 30 req/min, 14400 req/day, 131072 tokens.
 * Gemini free tier: 20 req/min (2.5 Flash) or more (2.0 Flash).
 */

import { google } from '@ai-sdk/google';
import { groq } from '@ai-sdk/groq';

export function getAssistenteModel() {
  if (process.env.GROQ_API_KEY) {
    return groq('llama-3.3-70b-versatile');
  }
  return google('gemini-2.0-flash');
}
