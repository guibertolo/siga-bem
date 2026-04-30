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
          'Esse link já foi usado ou venceu. Peça um novo convite ao seu patrão pra entrar.',
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
          <p className="mt-4 text-base text-primary-700">
            {status === 'loading'
              ? 'Conferindo seu convite...'
              : 'Preparando seu acesso, só um instante...'}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-surface-background px-4">
      <div className="w-full max-w-md rounded-[--radius-card] border border-danger/20 bg-alert-danger-bg p-6 text-center">
        <h2 className="text-xl font-semibold text-badge-danger-fg">
          Não conseguimos entrar
        </h2>
        <p className="mt-3 text-base text-danger leading-relaxed">
          {errorMessage}
        </p>
        <p className="mt-4 text-base text-primary-700 leading-relaxed">
          Quando receber o novo email, abra direto pelo celular e clique no botão azul.
        </p>
        <a
          href="/login"
          className="mt-6 inline-block min-h-[48px] rounded-lg bg-btn-primary px-6 py-3 text-base font-semibold text-white hover:bg-btn-primary-hover"
        >
          Voltar pra tela de entrada
        </a>
      </div>
    </div>
  );
}
