'use client';

import { useState, useRef, useEffect, useTransition } from 'react';
import { usePathname } from 'next/navigation';
import Link from 'next/link';
import { formatCNPJ } from '@/lib/utils/validate-cnpj';
import { switchEmpresa } from '@/app/(dashboard)/empresa/switch/actions';
import { ROLE_LABELS } from '@/types/empresa-multi';
import type { UserEmpresa } from '@/types/empresa-multi';

interface EmpresaSwitcherProps {
  empresas: UserEmpresa[];
}

/**
 * Sidebar empresa switcher component (Story 7.3).
 *
 * Displays the active empresa name below the logo.
 * If user has >1 empresa, shows a dropdown to switch.
 * If user has 1 empresa, shows a static label.
 */
export function EmpresaSwitcher({ empresas }: EmpresaSwitcherProps) {
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [optimisticActiveId, setOptimisticActiveId] = useState<string | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const pathname = usePathname();

  const activeEmpresa = optimisticActiveId
    ? empresas.find((e) => e.empresa_id === optimisticActiveId)
    : empresas.find((e) => e.is_active);
  const hasMultiple = empresas.length > 1;

  const displayName = activeEmpresa
    ? (activeEmpresa.nome_fantasia ?? activeEmpresa.razao_social)
    : 'Sem empresa';

  // Close dropdown on outside click
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    }
    if (open) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [open]);

  function handleSwitch(empresaId: string) {
    if (isPending) return;
    setOptimisticActiveId(empresaId);
    setOpen(false);
    startTransition(async () => {
      await switchEmpresa(empresaId, pathname);
      setOptimisticActiveId(null);
    });
  }

  // Single empresa: static label only
  if (!hasMultiple) {
    return (
      <div className="px-5 py-3 border-b border-white/10">
        <p className="text-sm text-white/70 truncate" title={displayName}>
          {displayName}
        </p>
      </div>
    );
  }

  // Multiple empresas: dropdown switcher
  return (
    <div className="relative px-5 py-3 border-b border-white/10" ref={dropdownRef}>
      <button
        type="button"
        onClick={() => setOpen(!open)}
        disabled={isPending}
        className={`
          flex items-center justify-between w-full gap-2 text-left bg-transparent border-none cursor-pointer
          text-sm text-white/90 hover:text-white transition-colors
          ${isPending ? 'opacity-50 cursor-wait' : ''}
        `}
        aria-expanded={open}
        aria-haspopup="listbox"
        aria-label="Trocar empresa"
      >
        <span className="truncate font-medium">{displayName}</span>
        <svg
          className={`h-4 w-4 shrink-0 transition-transform ${open ? 'rotate-180' : ''}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
          strokeWidth={2}
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {/* Dropdown list */}
      {open && (
        <div
          className="absolute left-0 right-0 top-full z-50 mx-2 mt-1 rounded-lg bg-[#0F2A38] border border-white/10 shadow-xl max-h-80 overflow-y-auto"
          role="listbox"
          aria-label="Lista de empresas"
        >
          {empresas.map((empresa) => {
            const isActive = optimisticActiveId
              ? empresa.empresa_id === optimisticActiveId
              : empresa.is_active;
            const name = empresa.nome_fantasia ?? empresa.razao_social;
            return (
              <button
                key={empresa.empresa_id}
                type="button"
                role="option"
                aria-selected={isActive}
                onClick={() => {
                  if (!isActive) handleSwitch(empresa.empresa_id);
                }}
                disabled={isActive || isPending}
                className={`
                  flex flex-col w-full px-4 py-3 text-left border-b border-white/5
                  transition-colors bg-transparent border-none cursor-pointer
                  ${isActive
                    ? 'bg-white/10 cursor-default'
                    : 'hover:bg-white/10'}
                `}
              >
                <div className="flex items-center gap-2">
                  {isActive && (
                    <svg className="h-4 w-4 text-green-400 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                  )}
                  <span className={`text-sm font-medium truncate ${isActive ? 'text-white' : 'text-white/80'}`}>
                    {name}
                  </span>
                </div>
                <div className="flex items-center gap-3 mt-1 ml-0">
                  <span className="text-xs text-white/50 font-mono">
                    {formatCNPJ(empresa.cnpj)}
                  </span>
                  <span className="text-xs text-white/40">
                    {ROLE_LABELS[empresa.role] ?? empresa.role}
                  </span>
                </div>
              </button>
            );
          })}

          {/* Divider + Nova Empresa link */}
          <div className="border-t border-white/10">
            <Link
              href="/empresa/nova"
              onClick={() => setOpen(false)}
              className="flex items-center gap-2 w-full px-4 py-3 text-sm font-medium text-text-muted hover:bg-white/10 transition-colors no-underline min-h-[48px]"
            >
              <svg className="h-4 w-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
              </svg>
              Nova Empresa
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
