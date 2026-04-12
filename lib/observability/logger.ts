import * as Sentry from '@sentry/nextjs';

interface LogContext {
  action: string;
  empresaId?: string | null;
  usuarioId?: string | null;
  params?: Record<string, unknown>;
}

const SENSITIVE_KEYS = ['senha', 'password', 'token', 'key', 'secret'];

function sanitizeParams(
  params: Record<string, unknown>,
): Record<string, unknown> {
  const sanitized: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(params)) {
    const lower = k.toLowerCase();
    if (SENSITIVE_KEYS.some((s) => lower.includes(s))) {
      sanitized[k] = '[REDACTED]';
    } else {
      sanitized[k] = v;
    }
  }
  return sanitized;
}

export function logError(context: LogContext, error: unknown): void {
  const safeParams = context.params
    ? sanitizeParams(context.params)
    : undefined;

  Sentry.withScope((scope) => {
    scope.setTag('action', context.action);

    if (context.empresaId) {
      scope.setTag('empresa_id', context.empresaId);
    }
    if (context.usuarioId) {
      scope.setTag('usuario_id', context.usuarioId);
    }

    scope.addBreadcrumb({
      category: 'server-action',
      message: context.action,
      data: safeParams,
      level: 'error',
    });

    Sentry.captureException(error);
  });

  console.error(
    `[${context.action}]`,
    error instanceof Error ? error.message : error,
    safeParams ? { params: safeParams } : '',
  );
}
