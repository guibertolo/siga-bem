'use client';

import * as Sentry from '@sentry/nextjs';
import { useEffect } from 'react';

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    Sentry.captureException(error);
  }, [error]);

  return (
    <html lang="pt-BR">
      <body style={{ fontFamily: 'sans-serif', padding: '2rem', background: '#0F2A36', color: '#E3F2FD' }}>
        <h1 style={{ fontSize: '1.5rem', fontWeight: 'bold' }}>Algo deu errado</h1>
        <p style={{ marginTop: '1rem', color: '#90CAF9' }}>
          Ocorreu um erro inesperado. Nossa equipe foi notificada automaticamente.
        </p>
        <button
          type="button"
          onClick={reset}
          style={{
            marginTop: '1.5rem',
            padding: '0.75rem 1.5rem',
            fontSize: '1rem',
            fontWeight: 600,
            background: '#2196F3',
            color: 'white',
            border: 'none',
            borderRadius: '0.5rem',
            cursor: 'pointer',
            minHeight: '48px',
          }}
        >
          Tentar novamente
        </button>
      </body>
    </html>
  );
}
