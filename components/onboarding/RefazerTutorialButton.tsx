'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { resetarOnboarding } from '@/app/(dashboard)/onboarding/actions';

/**
 * Button that resets the onboarding flag and redirects to dashboard,
 * where the tutorial will automatically start again.
 */
export function RefazerTutorialButton() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function handleClick() {
    setLoading(true);
    try {
      await resetarOnboarding();
      router.push('/dashboard');
      router.refresh();
    } catch {
      setLoading(false);
    }
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={loading}
      className="flex items-center gap-2 px-5 h-12 rounded-default bg-surface-muted text-primary-700 text-base font-semibold border border-surface-border cursor-pointer hover:bg-surface-hover focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
    >
      {loading ? (
        'Iniciando...'
      ) : (
        <>
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
            <polyline points="1 4 1 10 7 10" />
            <path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10" />
          </svg>
          Refazer Tutorial
        </>
      )}
    </button>
  );
}
