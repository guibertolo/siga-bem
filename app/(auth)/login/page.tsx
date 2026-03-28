'use client';

import { useState } from 'react';
import { login } from '@/app/(auth)/login/actions';

export default function LoginPage() {
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(formData: FormData) {
    setError(null);
    setLoading(true);
    try {
      const result = await login(formData);
      if (result?.error) {
        setError(result.error);
      }
    } catch {
      setError('Ocorreu um erro ao fazer login. Tente novamente.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-surface-background p-4">
      <div className="w-full max-w-sm space-y-6 rounded-[--radius-card] bg-surface-card p-8 shadow-sm">
        <div className="space-y-2 text-center">
          <h1 className="text-2xl font-bold text-primary-900">Cegonheiros</h1>
          <p className="text-sm text-primary-700">Entre com suas credenciais</p>
        </div>

        <form action={handleSubmit} className="space-y-4">
          <div className="space-y-1">
            <label htmlFor="email" className="block text-sm font-medium text-primary-900">
              Email
            </label>
            <input
              id="email"
              name="email"
              type="email"
              required
              placeholder="seu@email.com"
              className="h-12 w-full rounded-[--radius-default] border border-surface-border px-4 text-base text-primary-900 placeholder:text-surface-border focus:border-primary-700 focus:outline-none focus:ring-2 focus:ring-primary-100"
            />
          </div>

          <div className="space-y-1">
            <label htmlFor="password" className="block text-sm font-medium text-primary-900">
              Senha
            </label>
            <input
              id="password"
              name="password"
              type="password"
              required
              placeholder="Sua senha"
              className="h-12 w-full rounded-[--radius-default] border border-surface-border px-4 text-base text-primary-900 placeholder:text-surface-border focus:border-primary-700 focus:outline-none focus:ring-2 focus:ring-primary-100"
            />
          </div>

          {error && (
            <div className="rounded-[--radius-default] bg-red-50 p-3 text-sm text-danger">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="h-[52px] w-full rounded-[--radius-default] bg-primary-700 font-semibold text-white transition-colors hover:bg-primary-900 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {loading ? 'Entrando...' : 'Entrar'}
          </button>
        </form>
      </div>
    </main>
  );
}
