'use client';

import { useTransition, useState, useEffect } from 'react';
import { createPortal } from 'react-dom';

interface OnboardingBarProps {
  /** Current step number (0-based) */
  currentStep: number;
  /** Total number of steps */
  totalSteps: number;
  /** Step title to display */
  stepTitle: string;
  /** Step description */
  stepDescription: string;
  /** Whether the "Anterior" button is disabled (step 0 or overlay) */
  disableBack: boolean;
  /** Whether this is the last content step (before conclusion overlay) */
  isLastContentStep: boolean;
  /** Called when user clicks "Proximo" */
  onNext: () => void;
  /** Called when user clicks "Anterior" */
  onBack: () => void;
  /** Called when user clicks "Pular Tutorial Completo" */
  onSkip: () => void;
}

/**
 * Fixed bottom bar showing onboarding progress.
 * Dark background (#1B3A4B), white text, green progress bar.
 * 48px button heights, mobile responsive.
 */
export function OnboardingBar({
  currentStep,
  totalSteps,
  stepTitle,
  stepDescription,
  disableBack,
  isLastContentStep,
  onNext,
  onBack,
  onSkip,
}: OnboardingBarProps) {
  const [isPending, startTransition] = useTransition();

  const progressPercent = totalSteps > 1
    ? Math.round((currentStep / (totalSteps - 1)) * 100)
    : 0;

  function handleNext() {
    startTransition(() => {
      onNext();
    });
  }

  function handleBack() {
    startTransition(() => {
      onBack();
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
    <div className="fixed top-0 left-0 right-0 bg-[#1B3A4B] text-white shadow-lg" style={{ width: '100vw', zIndex: 99998 }}>
      {/* Progress bar */}
      <div className="h-1 w-full bg-white/20">
        <div
          className="h-full bg-green-400 transition-all duration-300 ease-out"
          style={{ width: `${progressPercent}%` }}
        />
      </div>

      <div className="px-3 py-2">
        {/* Info row */}
        <div className="mb-1.5">
          <span className="text-sm font-bold text-white">
            Passo {currentStep + 1}/{totalSteps}
          </span>
          <span className="text-sm font-semibold text-white/90 ml-1.5">
            {stepTitle}
          </span>
          <span className="text-sm text-white/60 ml-1.5 hidden sm:inline">
            — {stepDescription}
          </span>
        </div>

        {/* Buttons row */}
        <div className="flex items-center gap-1.5 flex-wrap">
          {/* Back button */}
          <button
            type="button"
            onClick={handleBack}
            disabled={disableBack || isPending}
            className="flex items-center justify-center gap-1 min-h-[40px] px-3 rounded-lg bg-white/10 text-white text-sm font-semibold transition-colors hover:bg-white/20 disabled:opacity-30 disabled:cursor-not-allowed"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <polyline points="15 18 9 12 15 6" />
            </svg>
            Anterior
          </button>

          {/* Next button */}
          <button
            type="button"
            onClick={handleNext}
            disabled={isPending}
            className="flex items-center justify-center gap-1 min-h-[40px] px-3 rounded-lg bg-green-500 text-white text-sm font-bold transition-colors hover:bg-green-600 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isLastContentStep ? 'Concluir' : 'Próximo'}
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <polyline points="9 18 15 12 9 6" />
            </svg>
          </button>

          {/* Skip button — secondary outline, WCAG AA accessible for 60+ */}
          <button
            type="button"
            onClick={handleSkip}
            disabled={isPending}
            className="ml-auto mr-2 min-h-[48px] px-4 sm:px-5 rounded-lg border-2 border-white/60 text-white/80 text-sm sm:text-base font-medium bg-transparent cursor-pointer transition-colors hover:bg-white/10 hover:border-white/80 hover:text-white disabled:opacity-50 whitespace-nowrap"
          >
            Pular Tutorial
          </button>
        </div>
      </div>
    </div>
  );

  if (!mounted) return null;
  return createPortal(content, document.body);
}
