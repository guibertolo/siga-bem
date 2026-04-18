/**
 * Assistente FrotaViva — logger with Sentry fallback.
 *
 * Story 9.5 (AC-1). Each method attempts Sentry, falls back to console
 * if Sentry fails (quota exhausted, network error, etc). Never throws.
 */

import * as Sentry from '@sentry/nextjs';

interface LogExtra {
  [key: string]: unknown;
}

function safeContext(extra: LogExtra): LogExtra {
  return { feature: 'assistente', ...extra };
}

export const logger = {
  info(message: string, extra: LogExtra = {}): void {
    const ctx = safeContext(extra);
    try {
      Sentry.addBreadcrumb({
        category: 'assistente',
        message,
        data: ctx,
        level: 'info',
      });
    } catch {
      // Sentry failed — degrade silently
    }
    console.info(`[assistente] ${message}`, ctx);
  },

  warn(message: string, extra: LogExtra = {}): void {
    const ctx = safeContext(extra);
    try {
      Sentry.addBreadcrumb({
        category: 'assistente',
        message,
        data: ctx,
        level: 'warning',
      });
    } catch {
      // Sentry failed — degrade silently
    }
    console.warn(`[assistente] ${message}`, ctx);
  },

  error(message: string, error: unknown, extra: LogExtra = {}): void {
    const ctx = safeContext(extra);
    try {
      Sentry.withScope((scope) => {
        scope.setTag('feature', 'assistente');
        for (const [k, v] of Object.entries(extra)) {
          if (typeof v === 'string' || typeof v === 'number') {
            scope.setTag(k, String(v));
          }
        }
        scope.addBreadcrumb({
          category: 'assistente',
          message,
          data: ctx,
          level: 'error',
        });
        Sentry.captureException(error);
      });
    } catch {
      // Sentry failed — degrade silently
    }
    console.error(
      `[assistente] ${message}`,
      error instanceof Error ? error.message : error,
      ctx,
    );
  },
};
