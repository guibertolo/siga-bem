'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { sendMagicLink, signInWithPassword } from '@/app/(auth)/login/actions';

type LoginMode = 'password' | 'magic-link';

export default function LoginPage() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);
  const [mode, setMode] = useState<LoginMode>('password');

  async function handleSubmit(formData: FormData) {
    setError(null);
    setSuccess(false);
    setLoading(true);
    try {
      if (mode === 'magic-link') {
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
            src="/logos/siga-bem-logo-full.svg"
            alt="Siga Bem - Gestao de Frotas"
            width={200}
            height={75}
            className="w-[160px] h-auto mb-4"
            priority
          />
          <p className="text-sm text-primary-700">
            {mode === 'password'
              ? 'Entre com email e senha'
              : 'Insira seu email para receber o link de acesso'}
          </p>
        </div>

        {success ? (
          <div className="bg-green-50 rounded-default p-4 text-center text-sm text-success">
            Link de acesso enviado! Verifique sua caixa de entrada.
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

            {mode === 'password' && (
              <div className="mb-4">
                <label
                  htmlFor="password"
                  className="block text-sm font-medium text-primary-900 mb-1"
                >
                  Senha
                </label>
                <input
                  id="password"
                  name="password"
                  type="password"
                  required
                  placeholder="Sua senha"
                  className="w-full h-12 rounded-default border border-surface-border px-4 text-base text-primary-900 outline-none focus:border-primary-500 focus:ring-1 focus:ring-primary-500 transition-colors"
                />
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
              className="flex items-center justify-center w-full h-14 rounded-default bg-primary-700 text-white text-base font-semibold border-none cursor-pointer hover:bg-primary-900 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 transition-colors disabled:bg-slate-400 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading
                ? 'Entrando...'
                : mode === 'password'
                  ? 'Entrar'
                  : 'Enviar link de acesso'}
            </button>
          </form>
        )}

        <div className="mt-4 text-center">
          <button
            type="button"
            onClick={() => {
              setMode(mode === 'password' ? 'magic-link' : 'password');
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
