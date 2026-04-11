/**
 * Assistente FrotaViva — shared tool infrastructure.
 *
 * Story 9.2 (AC-2). Centralizes the `ToolContext` passed to every tool's
 * `execute()` and exposes `MAX_TOOL_ROWS` (hard cap per query, see
 * critique R8 and implementation-plan §1).
 *
 * The real `buildToolset()` helper that wires all 6 tools to the Vercel
 * AI SDK `tool()` factory lives in Story 9.5 — tools declared here are
 * re-exported as modules and consumed individually by unit tests until
 * the route handler arrives.
 */

import type { SupabaseClient } from '@supabase/supabase-js';
import type { Usuario } from '@/types/usuario';

/**
 * Maximum number of rows any single tool call may return.
 *
 * Prevents a user prompt like "liste todos os gastos do ano passado"
 * from pulling thousands of rows into the LLM prompt window, which
 * would: (a) blow the token cap, (b) waste free-tier quota,
 * (c) risk truncation. Tools enforce this via Supabase `.limit()`.
 */
export const MAX_TOOL_ROWS = 50;

/**
 * Context injected into every tool's `execute()`.
 *
 * - `supabase`: RLS-aware SSR client returned by `createClient()` in
 *   `@/lib/supabase/server`. Never accept a user-provided id here —
 *   isolation is enforced by auth cookies + RLS + belt-and-suspenders
 *   `empresaIds` filter.
 * - `usuario`: current `Usuario` row for the authenticated user.
 * - `empresaIds`: empresa IDs the user is currently scoped to,
 *   determined by `getMultiEmpresaContext()` in
 *   `@/lib/queries/multi-empresa`. Single-empresa users get a
 *   one-element array; multi-empresa users get the selected set.
 */
export interface ToolContext {
  supabase: SupabaseClient;
  usuario: Usuario;
  empresaIds: string[];
}

/**
 * Tool execution error. Thrown by individual tools when a query fails
 * or validation inside `execute()` rejects the input. The route handler
 * in 9.5 catches these and maps to friendly pt-BR messages.
 */
export class ToolExecutionError extends Error {
  public readonly toolName: string;
  public readonly context: Record<string, unknown>;

  constructor(
    toolName: string,
    message: string,
    context: Record<string, unknown> = {},
  ) {
    super(`[${toolName}] ${message}`);
    this.name = 'ToolExecutionError';
    this.toolName = toolName;
    this.context = context;
  }
}
