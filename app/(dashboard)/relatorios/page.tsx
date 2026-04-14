import type { Metadata } from 'next';
import { Suspense } from 'react';
import { RelatoriosPageClient } from '@/app/(dashboard)/relatorios/RelatoriosPageClient';

export const metadata: Metadata = {
  title: 'Relatorios',
};

/**
 * Server Component entry for /relatorios.
 * Wraps client in Suspense for useSearchParams.
 * Story 23.4 — AC3, AC7, AC11
 */
export default function RelatoriosPage() {
  return (
    <Suspense
      fallback={
        <div className="w-full max-w-3xl">
          <div className="h-10 w-48 animate-pulse rounded-lg bg-surface-muted mb-6" />
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="h-32 animate-pulse rounded-xl bg-surface-muted" />
            <div className="h-32 animate-pulse rounded-xl bg-surface-muted" />
          </div>
        </div>
      }
    >
      <RelatoriosPageClient />
    </Suspense>
  );
}
