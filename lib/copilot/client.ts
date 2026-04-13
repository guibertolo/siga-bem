/**
 * Assistente FrotaViva — LLM client factory.
 *
 * Supports multiple providers via env vars. Priority:
 * 1. GROQ_API_KEY → Groq
 * 2. GOOGLE_GENERATIVE_AI_API_KEY → Google Gemini 2.0 Flash
 *
 * Groq models and free tier limits (tokens/min):
 * - llama-3.3-70b-versatile: 6000 tok/min (best quality, low throughput)
 * - llama-3.1-8b-instant: 20000 tok/min (good quality, high throughput)
 * - gemma2-9b-it: 15000 tok/min (alternative)
 *
 * For a chat with tool calls (3-5k tokens per request), the 70B model
 * runs out after 1-2 questions. The 8B handles 5-8 questions per minute.
 */

import { google } from '@ai-sdk/google';
import { groq } from '@ai-sdk/groq';

export function getAssistenteModel() {
  if (process.env.GROQ_API_KEY) {
    return groq('llama-3.1-8b-instant');
  }
  return google('gemini-2.0-flash');
}
