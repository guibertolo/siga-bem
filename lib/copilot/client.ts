/**
 * Assistente FrotaViva — Gemini client factory.
 *
 * Story 9.1 (scaffold only — not exercised until Story 9.5).
 * Decision: Google Gemini via @ai-sdk/google (free tier) — see product-brief.md v0.2.
 */

import { google } from '@ai-sdk/google';

/**
 * Model ID currently selected for the Assistente.
 *
 * gemini-2.5-flash has the most generous free tier on Google AI Studio
 * and supports tool use + streaming natively via the Vercel AI SDK v6.
 */
export const ASSISTENTE_MODEL_ID = 'gemini-2.5-flash' as const;

/**
 * Returns the language model instance used by the Assistente route handler.
 *
 * The `@ai-sdk/google` default export reads `GOOGLE_GENERATIVE_AI_API_KEY`
 * from `process.env`. No explicit config needed here.
 */
export function getAssistenteModel() {
  return google(ASSISTENTE_MODEL_ID);
}
