'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { completeInviteAcceptance } from '@/app/(auth)/aceitar-convite/actions';

export default function AceitarConvitePage() {
  const [status, setStatus] = useState<'loading' | 'completing' | 'error'>(
    'loading',
  );
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function handleInviteCallback() {
      const supabase = createClient();

      // Check if Supabase Auth has a session from the invite link
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (cancelled) return;

      if (!session) {
        setStatus('error');
        setErrorMessage(
          'Link de convite inválido ou expirado. Solicite um novo convite.',
        );
        return;
      }

      setStatus('completing');

      // Complete the invite acceptance (creates usuario record)
      const result = await completeInviteAcceptance();

      if (cancelled) return;

      if (result?.error) {
        setStatus('error');
        setErrorMessage(result.error);
      }
      // If successful, the server action redirects to /dashboard
    }

    handleInviteCallback();

    return () => {
      cancelled = true;
    };
  }, []);

  if (status === 'loading' || status === 'completing') {
    return (
      <div className="flex min-h-screen items-center justify-center bg-surface-background">
        <div className="text-center">
          <div className="mx-auto h-8 w-8 animate-spin rounded-full border-4 border-primary-300 border-t-primary-700" />
          <p className="mt-4 text-primary-700">
            {status === 'loading'
              ? 'Verificando convite...'
              : 'Configurando seu acesso...'}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-surface-background">
      <div className="w-full max-w-md rounded-[--radius-card] border border-danger/20 bg-alert-danger-bg p-6 text-center">
        <h2 className="text-lg font-semibold text-badge-danger-fg">
          Erro no convite
        </h2>
        <p className="mt-2 text-sm text-danger">
          {errorMessage}
        </p>
        <a
          href="/login"
          className="mt-4 inline-block text-sm font-medium text-primary-700 underline hover:text-primary-900"
        >
          Ir para login
        </a>
      </div>
    </div>
  );
}
