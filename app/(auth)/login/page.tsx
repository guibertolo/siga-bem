'use client';

import { useState } from 'react';
import { sendMagicLink } from '@/app/(auth)/login/actions';

export default function LoginPage() {
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(formData: FormData) {
    setError(null);
    setSuccess(false);
    setLoading(true);
    try {
      const result = await sendMagicLink(formData);
      if (result?.error) {
        setError(result.error);
      } else {
        setSuccess(true);
      }
    } catch {
      setError('Ocorreu um erro ao enviar o link. Tente novamente.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-surface-background px-4 py-12">
      <div className="w-full max-w-[400px] bg-surface-card rounded-card p-8 shadow-sm">
        <div className="text-center mb-6">
          <h1 className="text-2xl font-bold text-primary-900 mb-2">
            Siga Bem
          </h1>
          <p className="text-sm text-primary-700">
            Insira seu email para receber o link de acesso
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

            {error && (
              <div className="bg-red-50 rounded-default p-3 text-sm text-danger mb-4">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full h-13 rounded-default bg-primary-700 text-white text-base font-semibold border-none cursor-pointer hover:bg-primary-900 transition-colors disabled:bg-slate-400 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Enviando...' : 'Enviar link de acesso'}
            </button>
          </form>
        )}
      </div>
    </main>
  );
}
