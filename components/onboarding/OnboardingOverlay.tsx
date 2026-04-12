'use client';

import { useTransition, useState, useEffect } from 'react';
import { createPortal } from 'react-dom';

interface OnboardingOverlayProps {
  /** 'welcome' for step 0, 'conclusion' for final step */
  type: 'welcome' | 'conclusion';
  role: 'dono' | 'motorista';
  /** Called when user clicks "Comecar" or "Concluir" */
  onContinue: () => void;
  /** Called when user clicks "Pular Tutorial Completo" */
  onSkip: () => void;
}

/**
 * Fullscreen overlay for onboarding welcome and conclusion steps.
 * Centered card with FrotaViva branding, description, and action buttons.
 * Designed for 55+ audience: large text, zero English, zero jargon.
 */
export function OnboardingOverlay({
  type,
  role,
  onContinue,
  onSkip,
}: OnboardingOverlayProps) {
  const [isPending, startTransition] = useTransition();

  const isWelcome = type === 'welcome';
  const isMotorista = role === 'motorista';

  const title = isWelcome
    ? 'Bem-vindo ao FrotaViva!'
    : isMotorista
      ? 'Pronto! Bom trabalho na estrada.'
      : 'Parabéns! Sua frota está configurada.';

  const description = isWelcome
    ? isMotorista
      ? 'Você é fundamental para o funcionamento da frota. Vamos te ensinar a usar o sistema.'
      : 'Vamos configurar sua frota passo a passo. São passos rápidos e simples.'
    : isMotorista
      ? 'Lembre: registre abastecimentos e despesas durante cada viagem. Assim o acerto sai certinho. Você pode refazer o tutorial em "Meu Perfil".'
      : 'Você pode refazer este tutorial a qualquer momento em "Meu Perfil". Bom trabalho!';

  const buttonText = isWelcome ? 'Começar' : 'Começar a Usar';

  // Dono welcome: show what they'll learn
  const donoWelcomeSteps = [
    'Cadastrar caminhão',
    'Cadastrar motorista',
    'Criar viagem',
    'Fazer acerto de contas',
    'Ver o resultado',
  ];

  // Motorista welcome: show what they'll learn
  const motoristaWelcomeSteps = [
    'Ver suas viagens',
    'Registrar abastecimento',
    'Registrar despesas',
    'Acompanhar seus ganhos',
  ];

  const welcomeSteps = isMotorista ? motoristaWelcomeSteps : donoWelcomeSteps;

  function handleContinue() {
    startTransition(() => {
      onContinue();
    });
  }

  function handleSkip() {
    startTransition(() => {
      onSkip();
    });
  }

  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const content = (
    <div className="fixed inset-0 flex items-center justify-center bg-black/60 backdrop-blur-sm p-6" style={{ width: '100vw', height: '100vh', top: 0, left: 0, zIndex: 99999 }}>
      <div className="bg-surface-card rounded-2xl shadow-2xl p-8 text-center" style={{ width: '100%', maxWidth: '520px' }}>
        {/* Logo */}
        <div className="mb-6 flex justify-center">
          {/* eslint-disable-next-line @next/next/no-img-element -- SVG logo, next/image adds no benefit */}
          <img
            src="/logos/frotaviva-logo-icon.svg"
            alt=""
            width={64}
            height={64}
            className="h-16 w-16"
          />
        </div>

        {/* Title */}
        <h1 className="text-2xl font-bold text-primary-900 mb-3">
          {title}
        </h1>

        {/* Description */}
        <p className="text-lg text-text-secondary mb-6 leading-relaxed">
          {description}
        </p>

        {/* Welcome step list */}
        {isWelcome && (
          <ul className="text-left mb-8 space-y-3">
            {welcomeSteps.map((step, i) => (
              <li
                key={i}
                className="flex items-center gap-3 text-base text-primary-900"
              >
                <span className="flex-shrink-0 w-7 h-7 rounded-full bg-btn-primary text-white text-sm font-bold flex items-center justify-center">
                  {i + 1}
                </span>
                {step}
              </li>
            ))}
          </ul>
        )}

        {/* Conclusion: success icon */}
        {!isWelcome && (
          <div className="mb-6 flex justify-center">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="48"
              height="48"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="text-success"
            >
              <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
              <polyline points="22 4 12 14.01 9 11.01" />
            </svg>
          </div>
        )}

        {/* Primary action button */}
        <button
          type="button"
          onClick={handleContinue}
          disabled={isPending}
          className="w-full h-14 rounded-xl bg-btn-primary text-white text-lg font-bold transition-colors hover:bg-btn-primary-hover disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isPending ? 'Carregando...' : buttonText}
        </button>

        {/* Skip link (only on welcome) */}
        {isWelcome && (
          <button
            type="button"
            onClick={handleSkip}
            disabled={isPending}
            className="mt-4 text-base text-text-secondary underline hover:text-primary-700 transition-colors bg-transparent border-none cursor-pointer disabled:opacity-50"
          >
            Pular Tutorial Completo
          </button>
        )}
      </div>
    </div>
  );

  if (!mounted) return null;
  return createPortal(content, document.body);
}
