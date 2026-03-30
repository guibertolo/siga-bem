'use client';

import { useTransition } from 'react';
import { switchEmpresa } from '@/app/(dashboard)/empresa/switch/actions';

interface EmpresaSwitchButtonProps {
  empresaId: string;
  label?: string;
}

export function EmpresaSwitchButton({ empresaId, label = 'Acessar' }: EmpresaSwitchButtonProps) {
  const [isPending, startTransition] = useTransition();

  function handleClick() {
    startTransition(async () => {
      await switchEmpresa(empresaId, '/empresa');
    });
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={isPending}
      className="inline-flex items-center gap-1.5 rounded-lg bg-primary-700 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-primary-800 disabled:opacity-50 min-h-[44px]"
    >
      <svg className="h-4 w-4" aria-hidden="true" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
      </svg>
      {isPending ? 'Acessando...' : label}
    </button>
  );
}
