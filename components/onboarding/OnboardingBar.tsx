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

      <div className="px-4 py-2">
        {/* Single row: info + buttons */}
        <div className="flex items-center gap-3 flex-wrap">
          {/* Step info */}
          <div className="flex-1 min-w-0">
            <span className="text-base font-bold text-white">
              Passo {currentStep + 1}/{totalSteps}
            </span>
            <span className="text-base font-semibold text-white/90 ml-2">
              {stepTitle}
            </span>
            <span className="text-base text-white/60 ml-2 hidden sm:inline">
              — {stepDescription}
            </span>
          </div>

          {/* Buttons */}
          <div className="flex items-center gap-2 shrink-0">
          {/* Back button */}
          <button
            type="button"
            onClick={handleBack}
            disabled={disableBack || isPending}
            className="flex items-center justify-center gap-1 min-h-[48px] px-4 rounded-lg bg-white/10 text-white text-base font-semibold transition-colors hover:bg-white/20 disabled:opacity-30 disabled:cursor-not-allowed"
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
            className="flex items-center justify-center gap-1 min-h-[48px] px-6 rounded-lg bg-green-500 text-white text-base font-bold transition-colors hover:bg-green-600 disabled:opacity-50 disabled:cursor-not-allowed flex-1 sm:flex-none"
          >
            {isLastContentStep ? 'Concluir' : 'Proximo'}
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

          {/* Skip link — right-aligned */}
          <button
            type="button"
            onClick={handleSkip}
            disabled={isPending}
            className="ml-auto min-h-[48px] px-4 rounded-lg border text-sm font-medium bg-transparent cursor-pointer transition-colors disabled:opacity-50 whitespace-nowrap"
            style={{ color: 'rgba(255,255,255,0.4)', borderColor: 'rgba(255,255,255,0.15)' }}
          >
            Pular Tutorial Completo
          </button>
          </div>
        </div>
      </div>
    </div>
  );

  if (!mounted) return null;
  return createPortal(content, document.body);
}
