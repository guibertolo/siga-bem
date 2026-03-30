'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { cn } from '@/lib/utils/cn';

interface CredenciaisModalProps {
  email: string;
  senha: string;
  nomeMotorista: string;
  onClose: () => void;
}

/**
 * Modal de credenciais exibido apos criar motorista com conta.
 * Mostra email + senha temporaria em fonte grande (publico 60+).
 * A senha e exibida UMA VEZ — nunca armazenada no projeto.
 *
 * Story 8.3
 */
export function CredenciaisModal({ email, senha, nomeMotorista, onClose }: CredenciaisModalProps) {
  const router = useRouter();
  const [copiado, setCopiado] = useState(false);

  const handleCopiarSenha = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(senha);
      setCopiado(true);
      setTimeout(() => setCopiado(false), 2500);
    } catch {
      // Fallback for older browsers
      const textarea = document.createElement('textarea');
      textarea.value = senha;
      textarea.style.position = 'fixed';
      textarea.style.opacity = '0';
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand('copy');
      document.body.removeChild(textarea);
      setCopiado(true);
      setTimeout(() => setCopiado(false), 2500);
    }
  }, [senha]);

  const handleEnviarWhatsApp = useCallback(() => {
    const mensagem = encodeURIComponent(
      `Ola! Suas credenciais do FrotaViva:\nEmail: ${email}\nSenha: ${senha}\nAcesse: https://siga-bem-rosy.vercel.app/login`
    );
    window.open(`https://wa.me/?text=${mensagem}`, '_blank', 'noopener,noreferrer');
  }, [email, senha]);

  const handleIrParaLista = useCallback(() => {
    router.push('/motoristas');
  }, [router]);

  // Close on Escape key
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose();
    }
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
      role="dialog"
      aria-modal="true"
      aria-label="Credenciais do motorista"
    >
      <div className="w-full max-w-lg rounded-xl border border-surface-border bg-surface-card p-6 shadow-xl sm:p-8">
        {/* Header */}
        <div className="mb-6 text-center">
          <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-full bg-green-100">
            <svg className="h-7 w-7 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h2 className="text-xl font-bold text-primary-900 sm:text-2xl">
            Conta Criada com Sucesso
          </h2>
          <p className="mt-1 text-base text-primary-500">
            Motorista: <span className="font-semibold text-primary-700">{nomeMotorista}</span>
          </p>
        </div>

        {/* Warning */}
        <div className="mb-6 rounded-lg border border-amber-300 bg-amber-50 p-4">
          <div className="flex items-start gap-3">
            <svg className="mt-0.5 h-5 w-5 flex-shrink-0 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4.5c-.77-.833-2.694-.833-3.464 0L3.34 16.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
            <p className="text-base font-semibold text-amber-800">
              Anote a senha! Ela nao sera mostrada novamente.
            </p>
          </div>
        </div>

        {/* Credentials display */}
        <div className="mb-6 space-y-4">
          <div>
            <label className="mb-1 block text-sm font-medium text-primary-500">Email</label>
            <div className="rounded-lg border border-surface-border bg-gray-50 px-4 py-3">
              <span className="font-mono text-lg font-semibold text-primary-900 sm:text-xl">
                {email}
              </span>
            </div>
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-primary-500">Senha Temporaria</label>
            <div className="rounded-lg border border-surface-border bg-gray-50 px-4 py-3">
              <span className="font-mono text-lg font-semibold text-primary-900 sm:text-xl">
                {senha}
              </span>
            </div>
          </div>
        </div>

        {/* Action buttons */}
        <div className="space-y-3">
          {/* Copy password */}
          <button
            type="button"
            onClick={handleCopiarSenha}
            className={cn(
              'flex w-full items-center justify-center gap-2 rounded-lg px-4 py-3 text-base font-semibold min-h-[48px] transition-colors',
              copiado
                ? 'bg-green-600 text-white'
                : 'bg-primary-700 text-white hover:bg-primary-800',
            )}
          >
            {copiado ? (
              <>
                <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                Copiado!
              </>
            ) : (
              <>
                <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                </svg>
                Copiar Senha
              </>
            )}
          </button>

          {/* WhatsApp */}
          <button
            type="button"
            onClick={handleEnviarWhatsApp}
            className="flex w-full items-center justify-center gap-2 rounded-lg bg-green-600 px-4 py-3 text-base font-semibold text-white min-h-[48px] transition-colors hover:bg-green-700"
          >
            <svg className="h-5 w-5" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
              <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
            </svg>
            Enviar por WhatsApp
          </button>

          {/* Go to list */}
          <button
            type="button"
            onClick={handleIrParaLista}
            className="flex w-full items-center justify-center gap-2 rounded-lg border border-surface-border px-4 py-3 text-base font-semibold text-primary-700 min-h-[48px] transition-colors hover:bg-surface-hover"
          >
            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 10h16M4 14h16M4 18h16" />
            </svg>
            Ir para Lista de Motoristas
          </button>

          {/* Close */}
          <button
            type="button"
            onClick={onClose}
            className="flex w-full items-center justify-center rounded-lg px-4 py-3 text-base font-medium text-primary-500 min-h-[48px] transition-colors hover:text-primary-700 hover:bg-gray-50"
          >
            Fechar
          </button>
        </div>
      </div>
    </div>
  );
}
