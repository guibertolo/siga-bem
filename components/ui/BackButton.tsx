'use client';

import { useRouter, usePathname } from 'next/navigation';

/**
 * Universal back button for mobile navigation.
 * Hidden on md+ (desktop has sidebar). Hidden on /dashboard (home page).
 * Min tap target 48px for accessibility (55+ audience).
 */
export function BackButton() {
  const router = useRouter();
  const pathname = usePathname();

  // Don't show on dashboard home page
  if (pathname === '/dashboard') {
    return null;
  }

  return (
    <button
      type="button"
      onClick={() => router.back()}
      className="inline-flex items-center justify-center rounded-md p-2 text-primary-700 hover:bg-surface-hover transition-colors md:hidden min-w-[48px] min-h-[48px]"
      aria-label="Voltar"
    >
      <svg
        className="h-5 w-5"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
        aria-hidden="true"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M15 19l-7-7 7-7"
        />
      </svg>
    </button>
  );
}
