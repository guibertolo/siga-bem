/**
 * Assistente FrotaViva — shared tool constants and types.
 *
 * Extracted from index.ts to break circular dependency:
 * index.ts imports tools -> tools import MAX_TOOL_ROWS from index.ts
 */

import type { SupabaseClient } from '@supabase/supabase-js';
import type { Usuario } from '@/types/usuario';

/**
 * Maximum number of rows any single tool call may return.
 */
export const MAX_TOOL_ROWS = 50;

/**
 * Context injected into every tool's `execute()`.
 */
export interface ToolContext {
  supabase: SupabaseClient;
  usuario: Usuario;
  empresaIds: string[];
}

/**
 * Tool execution error.
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
