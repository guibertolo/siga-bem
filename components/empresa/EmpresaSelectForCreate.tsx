'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { switchEmpresa } from '@/app/(dashboard)/empresa/switch/actions';

export interface EmpresaOption {
  empresa_id: string;
  nome_fantasia: string | null;
  razao_social: string;
  cnpj: string;
}

interface EmpresaSelectForCreateProps {
  empresas: EmpresaOption[];
  activeEmpresaId: string;
}

/**
 * Empresa selector shown at the top of create/register forms when the user
 * is in multi-empresa mode. Lets the user pick which CNPJ the new record
 * belongs to before filling out the form.
 *
 * Design: pill buttons, bg-surface-muted card, 48px touch targets, zero English.
 */
export function EmpresaSelectForCreate({
  empresas,
  activeEmpresaId,
}: EmpresaSelectForCreateProps) {
  const [selectedId, setSelectedId] = useState(activeEmpresaId);
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  function handleSelect(empresaId: string) {
    if (empresaId === selectedId || isPending) return;

    setSelectedId(empresaId);

    startTransition(async () => {
      // switchEmpresa calls revalidatePath + redirect internally,
      // but we want to stay on the current page. Use trocarEmpresa pattern instead.
      try {
        await switchEmpresa(empresaId, window.location.pathname);
      } catch {
        // switchEmpresa calls redirect() which throws NEXT_REDIRECT -- expected
        router.refresh();
      }
    });
  }

  return (
    <div className="mb-6 rounded-xl border border-surface-border bg-surface-muted p-4">
      <p className="mb-3 text-base font-semibold text-primary-800">
        Para qual empresa?
      </p>

      <div className="flex flex-wrap gap-2">
        {empresas.map((empresa) => {
          const isActive = empresa.empresa_id === selectedId;
          const displayName = empresa.nome_fantasia ?? empresa.razao_social;

          return (
            <button
              key={empresa.empresa_id}
              type="button"
              onClick={() => handleSelect(empresa.empresa_id)}
              disabled={isPending && empresa.empresa_id !== selectedId}
              className={`
                inline-flex items-center gap-2 rounded-lg px-4 py-3 text-base font-medium
                transition-colors min-h-[48px] border
                ${
                  isActive
                    ? 'bg-btn-primary text-white border-btn-primary shadow-sm'
                    : 'bg-surface-card text-primary-700 border-surface-border hover:bg-surface-hover'
                }
                ${isPending ? 'opacity-60 cursor-wait' : 'cursor-pointer'}
              `}
              aria-pressed={isActive}
            >
              {isActive && (
                <svg
                  className="h-4 w-4 shrink-0"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                  strokeWidth={2.5}
                  aria-hidden="true"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M5 13l4 4L19 7"
                  />
                </svg>
              )}
              {displayName}
            </button>
          );
        })}
      </div>

      <p className="mt-2 text-sm text-primary-500">
        {isPending
          ? 'Trocando empresa...'
          : 'O cadastro sera feito na empresa selecionada.'}
      </p>
    </div>
  );
}
