'use client';

import { useTransition } from 'react';
import { formatCNPJ } from '@/lib/utils/validate-cnpj';
import { switchEmpresa } from '@/app/(dashboard)/empresa/switch/actions';
import { ROLE_LABELS } from '@/types/empresa-multi';
import type { UserEmpresa } from '@/types/empresa-multi';

interface EmpresaCardProps {
  empresa: UserEmpresa;
}

/**
 * Card component for the empresa selection screen (Story 7.2).
 * Large, accessible cards designed for 60+ audience.
 * Min font 16px, touch target >= 44px, WCAG AA contrast.
 */
export function EmpresaCard({ empresa }: EmpresaCardProps) {
  const [isPending, startTransition] = useTransition();

  const isInactive = !empresa.empresa_ativa;
  const isCurrentlyActive = empresa.is_active;

  function handleEntrar() {
    if (isInactive || isPending) return;
    startTransition(async () => {
      await switchEmpresa(empresa.empresa_id);
    });
  }

  return (
    <div
      className={`
        relative rounded-2xl border-2 p-6 transition-all
        ${isCurrentlyActive
          ? 'border-primary-500 bg-primary-50 dark:bg-primary-950/20 shadow-md'
          : 'border-surface-border bg-surface-card hover:border-primary-300 hover:shadow-sm'}
        ${isInactive ? 'opacity-60' : ''}
      `}
    >
      {/* Badges */}
      <div className="flex flex-wrap gap-2 mb-4">
        {isCurrentlyActive && (
          <span className="inline-flex items-center gap-1 rounded-full bg-primary-100 dark:bg-primary-900/30 px-3 py-1 text-sm font-semibold text-primary-700 dark:text-primary-300">
            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6l4 2" />
            </svg>
            Ultimo acesso
          </span>
        )}
        {isInactive && (
          <span className="inline-flex items-center rounded-full bg-red-100 dark:bg-red-900/30 px-3 py-1 text-sm font-semibold text-red-700 dark:text-red-300">
            Inativa
          </span>
        )}
        <span className="inline-flex items-center rounded-full bg-surface-muted dark:bg-slate-800 px-3 py-1 text-sm font-medium text-text-muted dark:text-slate-300">
          {ROLE_LABELS[empresa.role] ?? empresa.role}
        </span>
      </div>

      {/* Empresa info */}
      <h2 className="text-xl font-bold text-primary-900 dark:text-white mb-1 leading-tight">
        {empresa.razao_social}
      </h2>

      {empresa.nome_fantasia && (
        <p className="text-base text-primary-700 dark:text-slate-300 mb-2">
          {empresa.nome_fantasia}
        </p>
      )}

      <p className="text-base text-text-muted dark:text-text-subtle font-mono mb-6">
        CNPJ: {formatCNPJ(empresa.cnpj)}
      </p>

      {/* Action button */}
      <button
        type="button"
        onClick={handleEntrar}
        disabled={isInactive || isPending}
        className={`
          flex items-center justify-center gap-2 w-full min-h-[48px] rounded-xl
          text-lg font-semibold transition-all
          ${isInactive
            ? 'bg-surface-hover dark:bg-slate-700 text-text-subtle dark:text-text-muted cursor-not-allowed'
            : isPending
              ? 'bg-primary-500 text-white cursor-wait'
              : 'bg-primary-700 text-white hover:bg-primary-800 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 cursor-pointer'}
        `}
        aria-label={isInactive ? 'Empresa inativa' : `Entrar na empresa ${empresa.razao_social}`}
      >
        {isPending ? (
          <>
            <svg className="animate-spin h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
            Entrando...
          </>
        ) : (
          <>
            Entrar
            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M13 7l5 5m0 0l-5 5m5-5H6" />
            </svg>
          </>
        )}
      </button>
    </div>
  );
}
