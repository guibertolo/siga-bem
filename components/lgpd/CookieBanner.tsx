'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import {
  getConsentState,
  setConsentState,
  acceptAll,
  acceptEssentialsOnly,
} from '@/lib/lgpd/consent';
import type { ConsentState } from '@/lib/lgpd/consent';

/**
 * CookieBanner - Barra fixa no bottom (LGPD Art. 46)
 *
 * - NAO e modal/popup: sem overlay, sem bloqueio de interacao
 * - position: fixed, bottom: 0
 * - Publico 55+: fonte minima text-base, botoes 48px, zero jargao, zero ingles
 * - 3 opcoes: "Aceitar essenciais", "Aceitar todos", "Personalizar"
 * - "Personalizar" abre accordion inline ABAIXO do banner (nao modal)
 * - Cookie `frotaviva_consent` TTL 365 dias
 * - Dark mode via tokens do sistema
 */
export function CookieBanner() {
  const [visible, setVisible] = useState(false);
  const [showCustomize, setShowCustomize] = useState(false);
  const [customState, setCustomState] = useState({
    analytics: false,
    functionality: true,
  });

  useEffect(() => {
    // Show banner only if no consent cookie exists
    const consent = getConsentState();
    if (!consent) {
      setVisible(true);
    }
  }, []);

  const handleConsent = useCallback((state: ConsentState) => {
    setConsentState(state);
    setVisible(false);
    setShowCustomize(false);
  }, []);

  const handleAcceptAll = useCallback(() => {
    handleConsent(acceptAll());
  }, [handleConsent]);

  const handleAcceptEssentials = useCallback(() => {
    handleConsent(acceptEssentialsOnly());
  }, [handleConsent]);

  const handleSaveCustom = useCallback(() => {
    const state: ConsentState = {
      essential: true,
      analytics: customState.analytics,
      functionality: customState.functionality,
      timestamp: new Date().toISOString(),
    };
    handleConsent(state);
  }, [customState, handleConsent]);

  if (!visible) return null;

  return (
    <div
      role="region"
      aria-label="Aviso sobre uso de dados"
      style={{ position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 9999 }}
      className="border-t border-surface-border bg-surface-card shadow-lg"
    >
      {/* Main banner content */}
      <div className="mx-auto max-w-5xl px-4 py-4 sm:px-6 sm:py-5">
        <p className="text-base leading-relaxed text-primary-900 mb-4">
          Pra proteger seus dados (lei LGPD), a gente precisa que você autorize
          o uso de algumas informações do seu navegador. As essenciais pro app
          funcionar a gente mantém sempre.{' '}
          <Link
            href="/privacidade"
            className="font-semibold text-btn-primary underline hover:text-btn-primary-hover"
          >
            Leia nossa Política de Privacidade
          </Link>
        </p>

        {/* Action buttons - 48px min touch targets for 55+ audience */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-4">
          <button
            type="button"
            onClick={handleAcceptEssentials}
            className="min-h-[48px] rounded-default border border-surface-border bg-surface-muted px-5 py-3 text-base font-semibold text-primary-900 transition-colors hover:bg-surface-hover focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2"
          >
            Aceitar essenciais
          </button>
          <button
            type="button"
            onClick={handleAcceptAll}
            className="min-h-[48px] rounded-default bg-btn-primary px-5 py-3 text-base font-semibold text-white transition-colors hover:bg-btn-primary-hover focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2"
          >
            Aceitar todos
          </button>
          <button
            type="button"
            onClick={() => setShowCustomize((prev) => !prev)}
            aria-expanded={showCustomize}
            className="min-h-[48px] rounded-default border border-surface-border bg-transparent px-5 py-3 text-base font-semibold text-text-muted transition-colors hover:bg-surface-hover focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2"
          >
            {showCustomize ? 'Fechar opções' : 'Personalizar'}
          </button>
        </div>
      </div>

      {/* Customize panel - accordion inline BELOW banner (not a modal) */}
      {showCustomize && (
        <div className="border-t border-surface-border bg-surface-muted">
          <div className="mx-auto max-w-5xl px-4 py-4 sm:px-6 sm:py-5">
            <h3 className="text-base font-bold text-primary-900 mb-4">
              Escolha quais tipos de dados voce permite
            </h3>

            {/* Essential - always on */}
            <div className="mb-4 flex items-start gap-3 rounded-card border border-surface-border bg-surface-card p-4">
              <div className="flex min-h-[48px] min-w-[48px] items-center justify-center">
                <input
                  type="checkbox"
                  checked
                  disabled
                  aria-label="Dados essenciais (sempre ativo)"
                  className="h-5 w-5 accent-btn-primary"
                />
              </div>
              <div>
                <p className="text-base font-semibold text-primary-900">
                  Essenciais (sempre ativo)
                </p>
                <p className="text-base text-text-muted mt-1">
                  Necessarios para voce fazer login e usar o sistema. Sem eles, o
                  FrotaViva nao funciona.
                </p>
              </div>
            </div>

            {/* Analytics */}
            <div className="mb-4 flex items-start gap-3 rounded-card border border-surface-border bg-surface-card p-4">
              <div className="flex min-h-[48px] min-w-[48px] items-center justify-center">
                <input
                  type="checkbox"
                  checked={customState.analytics}
                  onChange={(e) =>
                    setCustomState((prev) => ({
                      ...prev,
                      analytics: e.target.checked,
                    }))
                  }
                  aria-label="Dados de uso e erros"
                  className="h-5 w-5 accent-btn-primary cursor-pointer"
                />
              </div>
              <div>
                <p className="text-base font-semibold text-primary-900">
                  Dados de uso e erros
                </p>
                <p className="text-base text-text-muted mt-1">
                  Nos ajudam a entender como voce usa o sistema e a corrigir
                  problemas mais rapido. Nenhum dado pessoal e compartilhado.
                </p>
              </div>
            </div>

            {/* Functionality */}
            <div className="mb-4 flex items-start gap-3 rounded-card border border-surface-border bg-surface-card p-4">
              <div className="flex min-h-[48px] min-w-[48px] items-center justify-center">
                <input
                  type="checkbox"
                  checked={customState.functionality}
                  onChange={(e) =>
                    setCustomState((prev) => ({
                      ...prev,
                      functionality: e.target.checked,
                    }))
                  }
                  aria-label="Preferencias de uso"
                  className="h-5 w-5 accent-btn-primary cursor-pointer"
                />
              </div>
              <div>
                <p className="text-base font-semibold text-primary-900">
                  Preferencias de uso
                </p>
                <p className="text-base text-text-muted mt-1">
                  Lembram suas preferencias, como o tema claro ou escuro, para
                  que voce nao precise configurar toda vez.
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={handleSaveCustom}
              className="min-h-[48px] rounded-default bg-btn-primary px-6 py-3 text-base font-semibold text-white transition-colors hover:bg-btn-primary-hover focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2"
            >
              Salvar preferencias
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
