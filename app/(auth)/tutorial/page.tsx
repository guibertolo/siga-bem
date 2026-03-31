'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { avancarOnboarding, pularTutorialCompleto } from '@/app/(dashboard)/onboarding/actions';

const DONO_STEPS = [
  'Cadastrar caminhões',
  'Cadastrar motoristas',
  'Criar viagem',
  'Fazer acerto de contas',
  'Ver o resultado da frota',
];

const MOTORISTA_STEPS = [
  'Ver suas viagens',
  'Registrar abastecimento',
  'Registrar despesas',
  'Acompanhar seus ganhos',
];

export default function TutorialWelcomePage() {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [role, setRole] = useState<'dono' | 'motorista' | null>(null);

  // Detect role from URL or default to dono
  const steps = role === 'motorista' ? MOTORISTA_STEPS : DONO_STEPS;

  function handleComecar() {
    startTransition(async () => {
      await avancarOnboarding();
      router.push('/dashboard');
    });
  }

  function handlePular() {
    startTransition(async () => {
      await pularTutorialCompleto();
      router.push('/dashboard');
    });
  }

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-6 bg-surface-background" style={{ width: '100vw', height: '100vh' }}>
      <div className="w-full bg-surface-card rounded-2xl shadow-2xl p-8 text-center" style={{ maxWidth: '520px' }}>
        {/* Logo */}
        <div className="mb-6 flex justify-center">
          <img
            src="/logos/frotaviva-logo-icon.svg"
            alt="FrotaViva"
            width={64}
            height={64}
            className="h-16 w-16"
          />
        </div>

        {/* Title */}
        <h1 className="text-2xl font-bold text-primary-900 mb-3">
          Bem-vindo ao FrotaViva!
        </h1>

        {/* Description */}
        <p className="text-lg text-primary-700 mb-6 leading-relaxed">
          Vamos te guiar pelos primeiros passos. São passos rápidos e simples.
        </p>

        {/* Step list */}
        <ul className="text-left mb-8 space-y-3">
          {steps.map((step, i) => (
            <li
              key={i}
              className="flex items-center gap-3 text-base text-primary-900"
            >
              <span className="flex-shrink-0 w-8 h-8 rounded-full bg-btn-primary text-white text-sm font-bold flex items-center justify-center">
                {i + 1}
              </span>
              {step}
            </li>
          ))}
        </ul>

        {/* Começar */}
        <button
          type="button"
          onClick={handleComecar}
          disabled={isPending}
          className="w-full rounded-xl bg-btn-primary text-white text-lg font-bold transition-colors hover:bg-btn-primary-hover disabled:opacity-50 min-h-[56px]"
        >
          {isPending ? 'Carregando...' : 'Começar'}
        </button>

        {/* Pular */}
        <button
          type="button"
          onClick={handlePular}
          disabled={isPending}
          className="mt-4 text-base text-primary-500 underline hover:text-primary-700 transition-colors bg-transparent border-none cursor-pointer disabled:opacity-50"
        >
          Pular Tutorial Completo
        </button>
      </div>
    </div>
  );
}
