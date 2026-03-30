'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { sendMagicLink, signInWithPassword, solicitarResetSenha } from '@/app/(auth)/login/actions';

type LoginMode = 'password' | 'magic-link' | 'recuperar';

export default function LoginPage() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);
  const [mode, setMode] = useState<LoginMode>('password');
  const [showPassword, setShowPassword] = useState(false);

  async function handleSubmit(formData: FormData) {
    setError(null);
    setSuccess(false);
    setLoading(true);
    try {
      if (mode === 'recuperar') {
        const result = await solicitarResetSenha(formData);
        if (result?.error) {
          setError(result.error);
        } else {
          setSuccess(true);
        }
      } else if (mode === 'magic-link') {
        const result = await sendMagicLink(formData);
        if (result?.error) {
          setError(result.error);
        } else {
          setSuccess(true);
        }
      } else {
        const result = await signInWithPassword(formData);
        if (result?.error) {
          setError(result.error);
        } else {
          router.push('/dashboard');
        }
      }
    } catch {
      setError('Ocorreu um erro. Tente novamente.');
    } finally {
      setLoading(false);
    }
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
          <p className="text-sm text-primary-700">
            {mode === 'password'
              ? 'Entre com email e senha'
              : mode === 'magic-link'
                ? 'Insira seu email para receber o link de acesso'
                : 'Insira seu email para recuperar sua senha'}
          </p>
        </div>

        {success ? (
          <div className="bg-green-50 rounded-default p-4 text-center text-sm text-success">
            {mode === 'recuperar'
              ? 'Se este email estiver cadastrado, voce recebera um link de recuperacao em breve.'
              : 'Link de acesso enviado! Verifique sua caixa de entrada.'}
          </div>
        ) : (
          <form action={handleSubmit}>
            <div className="mb-4">
              <label
                htmlFor="email"
                className="block text-sm font-medium text-primary-900 mb-1"
              >
                Email
              </label>
              <input
                id="email"
                name="email"
                type="email"
                required
                placeholder="seu@email.com"
                className="w-full h-12 rounded-default border border-surface-border px-4 text-base text-primary-900 outline-none focus:border-primary-500 focus:ring-1 focus:ring-primary-500 transition-colors"
              />
            </div>

            {mode !== 'magic-link' && mode !== 'recuperar' && (
              <div className="mb-4">
                <label
                  htmlFor="password"
                  className="block text-sm font-medium text-primary-900 mb-1"
                >
                  Senha
                </label>
                <div className="relative">
                  <input
                    id="password"
                    name="password"
                    type={showPassword ? 'text' : 'password'}
                    required
                    placeholder="Sua senha"
                    className="w-full h-12 rounded-default border border-surface-border px-4 pr-12 text-base text-primary-900 outline-none focus:border-primary-500 focus:ring-1 focus:ring-primary-500 transition-colors"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-text-subtle hover:text-primary-700 bg-transparent border-none cursor-pointer transition-colors"
                    aria-label={showPassword ? 'Ocultar senha' : 'Mostrar senha'}
                  >
                    {showPassword ? (
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
                </div>
              </div>
            )}

            {error && (
              <div className="bg-red-50 rounded-default p-3 text-sm text-danger mb-4">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="flex items-center justify-center w-full h-14 rounded-default bg-primary-700 text-white text-base font-semibold border-none cursor-pointer hover:bg-primary-900 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 transition-colors disabled:bg-surface-border disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading
                ? (mode === 'recuperar' ? 'Enviando...' : 'Entrando...')
                : mode === 'password'
                  ? 'Entrar'
                  : mode === 'magic-link'
                    ? 'Enviar link de acesso'
                    : 'Enviar link de recuperacao'}
            </button>
          </form>
        )}

        <div className="mt-4 text-center flex flex-col gap-2">
          {mode === 'password' && (
            <button
              type="button"
              onClick={() => {
                setMode('recuperar');
                setError(null);
                setSuccess(false);
              }}
              className="text-sm text-primary-500 hover:text-primary-700 bg-transparent border-none cursor-pointer transition-colors"
            >
              Esqueci minha senha
            </button>
          )}
          <button
            type="button"
            onClick={() => {
              setMode(
                mode === 'password' ? 'magic-link' :
                mode === 'magic-link' ? 'password' :
                'password'
              );
              setError(null);
              setSuccess(false);
            }}
            className="text-sm text-primary-500 hover:text-primary-700 bg-transparent border-none cursor-pointer transition-colors"
          >
            {mode === 'password'
              ? 'Entrar com link magico (sem senha)'
              : 'Entrar com email e senha'}
          </button>
        </div>
      </div>
    </main>
  );
}
