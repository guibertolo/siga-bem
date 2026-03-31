'use client';

import { useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { clearSelectedEmpresas } from '@/app/(dashboard)/empresa/multi-select-actions';

interface MultiEmpresaBannerProps {
  count: number;
}

/**
 * Banner displayed below the header when multi-empresa mode is active.
 * Shows the count of selected empresas and a button to exit multi mode.
 */
export function MultiEmpresaBanner({ count }: MultiEmpresaBannerProps) {
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  function handleExit() {
    startTransition(async () => {
      await clearSelectedEmpresas();
      router.refresh();
    });
  }

  return (
    <div className="bg-info/10 border-b border-info/20 px-4 py-2.5 flex items-center justify-between gap-3">
      <div className="flex items-center gap-2 min-w-0">
        <svg
          className="h-5 w-5 text-info shrink-0"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
          strokeWidth={2}
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"
          />
        </svg>
        <span className="text-sm font-medium text-info truncate">
          Visualizando dados de {count} empresas
        </span>
      </div>
      <button
        type="button"
        onClick={handleExit}
        disabled={isPending}
        className="shrink-0 rounded-md bg-info/20 px-3 py-1.5 text-xs font-semibold text-info hover:bg-info/30 transition-colors disabled:opacity-50 min-h-[36px]"
      >
        {isPending ? 'Saindo...' : 'Voltar para empresa unica'}
      </button>
    </div>
  );
}
