'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { createClient } from '@/lib/supabase/client';

export default function ResetPasswordPage() {
  const router = useRouter();
  const supabase = createClient();

  const [loading, setLoading] = useState(false);
  const [checking, setChecking] = useState(true);
  const [tokenValid, setTokenValid] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [showNovaSenha, setShowNovaSenha] = useState(false);
  const [showConfirmar, setShowConfirmar] = useState(false);

  // On mount, check if the Supabase recovery session is valid
  useEffect(() => {
    async function checkSession() {
      // The Supabase client auto-detects the #access_token from the URL
      const { data: { session } } = await supabase.auth.getSession();

      if (session) {
        setTokenValid(true);
      } else {
        // Listen for auth state change (recovery event)
        const { data: { subscription } } = supabase.auth.onAuthStateChange(
          (event) => {
            if (event === 'PASSWORD_RECOVERY') {
              setTokenValid(true);
              setChecking(false);
            }
          }
        );

        // Give it a moment for the hash to be processed
        setTimeout(() => {
          setChecking(false);
        }, 2000);

        return () => {
          subscription.unsubscribe();
        };
      }

      setChecking(false);
    }

    checkSession();
  }, [supabase.auth]);

  async function handleSubmit(formData: FormData) {
    setError(null);
    setLoading(true);

    const novaSenha = formData.get('nova_senha') as string;
    const confirmarSenha = formData.get('confirmar_senha') as string;

    if (novaSenha.length < 8) {
      setError('A senha deve ter pelo menos 8 caracteres');
      setLoading(false);
      return;
    }

    if (novaSenha !== confirmarSenha) {
      setError('As senhas nao coincidem');
      setLoading(false);
      return;
    }

    const { error: updateError } = await supabase.auth.updateUser({
      password: novaSenha,
    });

    if (updateError) {
      setError(updateError.message);
      setLoading(false);
      return;
    }

    setSuccess(true);

    // Redirect to login after 3 seconds
    setTimeout(() => {
      router.push('/login');
    }, 3000);
  }

  const inputClasses =
    'w-full h-12 rounded-default border border-surface-border px-4 pr-12 text-base text-primary-900 outline-none focus:border-primary-500 focus:ring-1 focus:ring-primary-500 transition-colors';

  const eyeButton = (show: boolean, toggle: () => void) => (
    <button
      type="button"
      onClick={toggle}
      className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-text-subtle hover:text-primary-700 bg-transparent border-none cursor-pointer transition-colors"
      aria-label={show ? 'Ocultar senha' : 'Mostrar senha'}
    >
      {show ? (
        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94" />
          <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19" />
          <line x1="1" y1="1" x2="23" y2="23" />
        </svg>
      ) : (
        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
          <circle cx="12" cy="12" r="3" />
        </svg>
      )}
    </button>
  );

  if (checking) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-surface-background px-4 py-12">
        <div className="w-full max-w-[400px] bg-surface-card rounded-card p-8 shadow-sm text-center">
          <p className="text-primary-700">Verificando link de recuperacao...</p>
        </div>
      </main>
    );
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-surface-background px-4 py-12">
      <div className="w-full max-w-[400px] bg-surface-card rounded-card p-8 shadow-sm">
        <div className="flex flex-col items-center mb-6">
          <Image
            src="/logos/frotaviva-logo-full.svg"
            alt="FrotaViva - Gestao de Frotas"
            width={200}
            height={75}
            className="w-[160px] h-auto mb-4"
            priority
          />
          <h1 className="text-lg font-bold text-primary-900">Redefinir Senha</h1>
        </div>

        {!tokenValid ? (
          <div className="bg-red-50 rounded-default p-4 text-center text-sm text-danger">
            Link de recuperacao invalido ou expirado. Solicite um novo.
          </div>
        ) : success ? (
          <div className="bg-green-50 rounded-default p-4 text-center text-sm text-success">
            Senha redefinida com sucesso! Redirecionando para o login...
          </div>
        ) : (
          <form action={handleSubmit} className="grid gap-4">
            {/* Nova senha */}
            <div>
              <label htmlFor="nova_senha" className="block text-sm font-medium text-primary-900 mb-1">
                Nova senha
              </label>
              <div className="relative">
                <input
                  id="nova_senha"
                  name="nova_senha"
                  type={showNovaSenha ? 'text' : 'password'}
                  required
                  minLength={8}
                  placeholder="Minimo 8 caracteres"
                  className={inputClasses}
                />
                {eyeButton(showNovaSenha, () => setShowNovaSenha(!showNovaSenha))}
              </div>
            </div>

            {/* Confirmar nova senha */}
            <div>
              <label htmlFor="confirmar_senha" className="block text-sm font-medium text-primary-900 mb-1">
                Confirmar nova senha
              </label>
              <div className="relative">
                <input
                  id="confirmar_senha"
                  name="confirmar_senha"
                  type={showConfirmar ? 'text' : 'password'}
                  required
                  minLength={8}
                  placeholder="Repita a nova senha"
                  className={inputClasses}
                />
                {eyeButton(showConfirmar, () => setShowConfirmar(!showConfirmar))}
              </div>
            </div>

            {error && (
              <div className="bg-red-50 rounded-default p-3 text-sm text-danger">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="flex items-center justify-center w-full h-14 rounded-default bg-primary-700 text-white text-base font-semibold border-none cursor-pointer hover:bg-primary-900 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 transition-colors disabled:bg-surface-border disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Redefinindo...' : 'Definir nova senha'}
            </button>
          </form>
        )}

        <div className="mt-4 text-center">
          <button
            type="button"
            onClick={() => router.push('/login')}
            className="text-sm text-primary-500 hover:text-primary-700 bg-transparent border-none cursor-pointer transition-colors"
          >
            Voltar para o login
          </button>
        </div>
      </div>
    </main>
  );
}
