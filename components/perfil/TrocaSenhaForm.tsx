'use client';

import { useState, useRef } from 'react';
import { alterarSenha } from '@/app/(dashboard)/perfil/actions';

export function TrocaSenhaForm() {
  const formRef = useRef<HTMLFormElement>(null);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [showSenhaAtual, setShowSenhaAtual] = useState(false);
  const [showNovaSenha, setShowNovaSenha] = useState(false);
  const [showConfirmar, setShowConfirmar] = useState(false);

  // Client-side validation
  const [clientError, setClientError] = useState<string | null>(null);

  function validateClient(formData: FormData): string | null {
    const novaSenha = formData.get('nova_senha') as string;
    const confirmarSenha = formData.get('confirmar_senha') as string;

    if (novaSenha.length < 8) {
      return 'A senha deve ter pelo menos 8 caracteres';
    }

    if (novaSenha !== confirmarSenha) {
      return 'As senhas não coincidem';
    }

    return null;
  }

  async function handleSubmit(formData: FormData) {
    setClientError(null);
    setMessage(null);

    const validationError = validateClient(formData);
    if (validationError) {
      setClientError(validationError);
      return;
    }

    setLoading(true);

    const result = await alterarSenha(formData);

    if (result.error) {
      setMessage({ type: 'error', text: result.error });
    } else {
      setMessage({ type: 'success', text: 'Senha alterada com sucesso!' });
      formRef.current?.reset();
    }

    setLoading(false);
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

  return (
    <div className="bg-surface-card rounded-card p-6 shadow-sm">
      <h2 className="text-lg font-bold text-primary-900 mb-6">Alterar Senha</h2>

      <form ref={formRef} action={handleSubmit} className="grid gap-4">
        {/* Senha atual */}
        <div>
          <label htmlFor="senha_atual" className="block text-sm font-medium text-primary-700 mb-1">
            Senha atual
          </label>
          <div className="relative">
            <input
              id="senha_atual"
              name="senha_atual"
              type={showSenhaAtual ? 'text' : 'password'}
              required
              placeholder="Sua senha atual"
              className={inputClasses}
            />
            {eyeButton(showSenhaAtual, () => setShowSenhaAtual(!showSenhaAtual))}
          </div>
        </div>

        {/* Nova senha */}
        <div>
          <label htmlFor="nova_senha" className="block text-sm font-medium text-primary-700 mb-1">
            Nova senha
          </label>
          <div className="relative">
            <input
              id="nova_senha"
              name="nova_senha"
              type={showNovaSenha ? 'text' : 'password'}
              required
              minLength={8}
              placeholder="Mínimo 8 caracteres"
              className={inputClasses}
            />
            {eyeButton(showNovaSenha, () => setShowNovaSenha(!showNovaSenha))}
          </div>
        </div>

        {/* Confirmar nova senha */}
        <div>
          <label htmlFor="confirmar_senha" className="block text-sm font-medium text-primary-700 mb-1">
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

        {/* Client validation error */}
        {clientError && (
          <div className="bg-alert-danger-bg rounded-default p-3 text-sm text-danger">
            {clientError}
          </div>
        )}

        {/* Server message */}
        {message && (
          <div
            className={`rounded-default p-3 text-sm ${
              message.type === 'success'
                ? 'bg-alert-success-bg text-success'
                : 'bg-alert-danger-bg text-danger'
            }`}
          >
            {message.text}
          </div>
        )}

        {/* Submit */}
        <button
          type="submit"
          disabled={loading}
          className="mt-2 flex items-center justify-center gap-2 w-full h-12 rounded-default bg-btn-primary text-white text-base font-semibold border-none cursor-pointer hover:bg-btn-primary-hover focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 transition-colors disabled:bg-surface-border disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? (
            'Alterando...'
          ) : (
            <>
              <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="20 6 9 17 4 12" />
              </svg>
              Alterar Senha
            </>
          )}
        </button>
      </form>
    </div>
  );
}
