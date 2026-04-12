'use client';

import { useState } from 'react';
import Image from 'next/image';
import { forcarTrocaSenha } from '@/app/(auth)/trocar-senha/actions';

export default function TrocarSenhaPage() {
  const [novaSenha, setNovaSenha] = useState('');
  const [confirmarSenha, setConfirmarSenha] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [showNovaSenha, setShowNovaSenha] = useState(false);
  const [showConfirmarSenha, setShowConfirmarSenha] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (novaSenha.length < 8) {
      setError('A senha deve ter no mínimo 8 caracteres');
      return;
    }

    if (novaSenha !== confirmarSenha) {
      setError('As senhas nao conferem');
      return;
    }

    setLoading(true);
    try {
      const result = await forcarTrocaSenha(novaSenha);
      if (result?.error) {
        setError(result.error);
      }
    } catch (err: unknown) {
      // redirect() throws NEXT_REDIRECT — ignore it
      if (err instanceof Error && err.message?.includes('NEXT_REDIRECT')) return;
      setError('Ocorreu um erro. Tente novamente.');
    } finally {
      setLoading(false);
    }
  }

  const EyeIcon = (
    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  );

  const EyeOffIcon = (
    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94" />
      <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19" />
      <line x1="1" y1="1" x2="23" y2="23" />
    </svg>
  );

  return (
    <main className="flex min-h-screen items-center justify-center bg-surface-background px-4 py-12">
      <div className="w-full max-w-[440px] bg-surface-card rounded-card p-8 shadow-sm">
        <div className="flex flex-col items-center mb-6">
          <Image
            src="/logos/frotaviva-logo-full.svg"
            alt="FrotaViva - Gestao de Frotas"
            width={200}
            height={75}
            className="w-[160px] h-auto mb-4"
            priority
          />
          <h1 className="text-xl font-bold text-primary-900 text-center mb-2">
            Troca de Senha Obrigatoria
          </h1>
          <p className="text-base text-primary-700 text-center leading-relaxed">
            Esta e sua primeira vez acessando o sistema. Por seguranca, defina uma nova senha.
          </p>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="mb-4">
            <label
              htmlFor="nova-senha"
              className="block text-base font-medium text-primary-900 mb-1"
            >
              Nova senha
            </label>
            <div className="relative">
              <input
                id="nova-senha"
                type={showNovaSenha ? 'text' : 'password'}
                required
                minLength={8}
                placeholder="Mínimo 8 caracteres"
                value={novaSenha}
                onChange={(e) => setNovaSenha(e.target.value)}
                className="w-full h-12 rounded-default border border-surface-border px-4 pr-12 text-base text-primary-900 outline-none focus:border-primary-500 focus:ring-1 focus:ring-primary-500 transition-colors"
              />
              <button
                type="button"
                onClick={() => setShowNovaSenha(!showNovaSenha)}
                className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-text-subtle hover:text-primary-700 bg-transparent border-none cursor-pointer transition-colors"
                aria-label={showNovaSenha ? 'Ocultar senha' : 'Mostrar senha'}
              >
                {showNovaSenha ? EyeOffIcon : EyeIcon}
              </button>
            </div>
          </div>

          <div className="mb-4">
            <label
              htmlFor="confirmar-senha"
              className="block text-base font-medium text-primary-900 mb-1"
            >
              Confirmar nova senha
            </label>
            <div className="relative">
              <input
                id="confirmar-senha"
                type={showConfirmarSenha ? 'text' : 'password'}
                required
                minLength={8}
                placeholder="Repita a nova senha"
                value={confirmarSenha}
                onChange={(e) => setConfirmarSenha(e.target.value)}
                className="w-full h-12 rounded-default border border-surface-border px-4 pr-12 text-base text-primary-900 outline-none focus:border-primary-500 focus:ring-1 focus:ring-primary-500 transition-colors"
              />
              <button
                type="button"
                onClick={() => setShowConfirmarSenha(!showConfirmarSenha)}
                className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-text-subtle hover:text-primary-700 bg-transparent border-none cursor-pointer transition-colors"
                aria-label={showConfirmarSenha ? 'Ocultar senha' : 'Mostrar senha'}
              >
                {showConfirmarSenha ? EyeOffIcon : EyeIcon}
              </button>
            </div>
          </div>

          {error && (
            <div className="bg-alert-danger-bg rounded-default p-3 text-base text-danger mb-4">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="flex items-center justify-center w-full h-14 rounded-default bg-btn-primary text-white text-base font-semibold border-none cursor-pointer hover:bg-btn-primary-hover focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 transition-colors disabled:bg-surface-border disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? 'Salvando...' : 'Definir nova senha'}
          </button>
        </form>
      </div>
    </main>
  );
}
