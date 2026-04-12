'use client';

import { useState, useRef, useEffect, useTransition } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import Link from 'next/link';
import { formatCNPJ } from '@/lib/utils/validate-cnpj';
import { switchEmpresa } from '@/app/(dashboard)/empresa/switch/actions';
import { setSelectedEmpresas, clearSelectedEmpresas } from '@/app/(dashboard)/empresa/multi-select-actions';
import { ROLE_LABELS } from '@/types/empresa-multi';
import type { UserEmpresa } from '@/types/empresa-multi';

interface EmpresaSwitcherProps {
  empresas: UserEmpresa[];
  selectedEmpresaIds?: string[];
}

export function EmpresaSwitcher({ empresas, selectedEmpresaIds }: EmpresaSwitcherProps) {
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [checkedIds, setCheckedIds] = useState<Set<string>>(() => {
    if (selectedEmpresaIds && selectedEmpresaIds.length >= 1) {
      return new Set(selectedEmpresaIds);
    }
    const active = empresas.find((e) => e.is_active);
    return active ? new Set([active.empresa_id]) : new Set();
  });
  const [search, setSearch] = useState('');
  const dropdownRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);
  const pathname = usePathname();
  const router = useRouter();

  const hasMultiple = empresas.length > 1;
  const searchLower = search.toLowerCase();
  const filteredEmpresas = search
    ? empresas.filter((e) =>
        (e.nome_fantasia ?? e.razao_social).toLowerCase().includes(searchLower)
        || e.cnpj.includes(search)
      )
    : empresas;
  const allSelected = checkedIds.size === empresas.length;

  // Focus search on open
  useEffect(() => {
    if (open && searchRef.current) {
      searchRef.current.focus();
    }
    if (!open) {
      setSearch('');
    }
  }, [open]);

  const displayName = checkedIds.size >= 2
    ? `${checkedIds.size} de ${empresas.length} empresas`
    : (() => {
        const singleId = Array.from(checkedIds)[0];
        const emp = empresas.find((e) => e.empresa_id === singleId) ?? empresas.find((e) => e.is_active);
        return emp ? (emp.nome_fantasia ?? emp.razao_social) : 'Sem empresa';
      })();

  // Close on outside click
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

  // Sync when prop changes
  useEffect(() => {
    if (selectedEmpresaIds && selectedEmpresaIds.length >= 1) {
      setCheckedIds(new Set(selectedEmpresaIds));
    }
  }, [selectedEmpresaIds]);

  function handleToggle(empresaId: string) {
    setCheckedIds((prev) => {
      const next = new Set(prev);
      if (next.has(empresaId)) {
        // Don't allow unchecking the last one
        if (next.size <= 1) return prev;
        next.delete(empresaId);
      } else {
        next.add(empresaId);
      }
      return next;
    });
  }

  function handleSelectAll() {
    if (allSelected) {
      // Deselect all except the active one
      const active = empresas.find((e) => e.is_active);
      setCheckedIds(active ? new Set([active.empresa_id]) : new Set([empresas[0].empresa_id]));
    } else {
      setCheckedIds(new Set(empresas.map((e) => e.empresa_id)));
    }
  }

  function handleSingleSwitch(empresaId: string) {
    if (isPending) return;
    setOpen(false);
    startTransition(async () => {
      try { await clearSelectedEmpresas(); } catch { /* ok */ }
      try { await switchEmpresa(empresaId); } catch { /* redirect throws */ }
      window.location.href = pathname;
    });
  }

  function handleApply() {
    if (isPending) return;
    const ids = Array.from(checkedIds);
    setOpen(false);

    if (ids.length === 1) {
      // Single mode
      startTransition(async () => {
        try { await clearSelectedEmpresas(); } catch { /* ok */ }
        try { await switchEmpresa(ids[0]); } catch { /* redirect throws */ }
        window.location.href = pathname;
      });
    } else {
      // Multi mode
      startTransition(async () => {
        await setSelectedEmpresas(ids);
        router.refresh();
      });
    }
  }

  // Single empresa: static label
  if (!hasMultiple) {
    return (
      <div className="px-5 py-3 border-b border-white/10">
        <p className="text-sm text-white/70 truncate" title={displayName}>
          {displayName}
        </p>
      </div>
    );
  }

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
        aria-label="Selecionar empresas"
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

      {open && (
        <div
          className="absolute left-0 right-0 top-full z-50 mx-2 mt-1 rounded-lg bg-[#0F2A38] border border-white/10 shadow-xl max-h-96 overflow-y-auto"
          role="listbox"
          aria-label="Lista de empresas"
        >
          {/* Busca rapida */}
          {empresas.length > 3 && (
            <div className="px-3 pt-3 pb-2">
              <input
                ref={searchRef}
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Buscar empresa..."
                className="w-full rounded-md border border-white/20 bg-white/5 px-3 py-2 text-sm text-white placeholder:text-white/40 outline-none focus:border-white/40"
              />
            </div>
          )}

          {/* Selecionar todas + aplicar rapido (oculto quando filtrando) */}
          {!search && (
            <div className="flex items-center border-b border-white/10">
              <button
                type="button"
                onClick={handleSelectAll}
                className="flex items-center gap-2.5 flex-1 px-4 py-3 text-left bg-transparent border-none cursor-pointer hover:bg-white/10 transition-colors"
              >
                <span className={`flex items-center justify-center h-5 w-5 rounded border-2 shrink-0 transition-colors ${allSelected ? 'bg-success border-success' : 'border-white/40'}`}>
                  {allSelected && (
                    <svg className="h-3.5 w-3.5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={3}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                  )}
                </span>
                <span className="text-sm font-semibold text-white/90">Todas</span>
              </button>
              {checkedIds.size >= 2 && (
                <button
                  type="button"
                  onClick={handleApply}
                  disabled={isPending}
                  className="mr-2 rounded-md bg-btn-primary px-3 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-btn-primary-hover disabled:opacity-50 shrink-0"
                >
                  {isPending ? '...' : `Ver ${checkedIds.size}`}
                </button>
              )}
            </div>
          )}

          {/* Lista de empresas: checkbox = multi toggle, nome = troca direto */}
          {filteredEmpresas.map((empresa) => {
            const checked = checkedIds.has(empresa.empresa_id);
            const name = empresa.nome_fantasia ?? empresa.razao_social;
            return (
              <div
                key={empresa.empresa_id}
                className="flex items-center border-b border-white/5 hover:bg-white/10 transition-colors"
              >
                {/* Checkbox: marca/desmarca pro multi */}
                <button
                  type="button"
                  onClick={(e) => { e.stopPropagation(); handleToggle(empresa.empresa_id); }}
                  className="flex items-center justify-center px-3 py-3 bg-transparent border-none cursor-pointer shrink-0"
                  aria-label={checked ? `Desmarcar ${name}` : `Marcar ${name}`}
                >
                  <span className={`flex items-center justify-center h-5 w-5 rounded border-2 transition-colors ${checked ? 'bg-success border-success' : 'border-white/40 hover:border-white/60'}`}>
                    {checked && (
                      <svg className="h-3.5 w-3.5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={3}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                      </svg>
                    )}
                  </span>
                </button>
                {/* Nome: clica e troca direto pra essa empresa */}
                <button
                  type="button"
                  onClick={() => handleSingleSwitch(empresa.empresa_id)}
                  disabled={isPending}
                  className="flex-1 flex items-center gap-2 py-3 pr-4 text-left bg-transparent border-none cursor-pointer min-w-0"
                >
                  <div className="flex-1 min-w-0">
                    <span className={`block text-sm font-medium truncate ${checked ? 'text-white' : 'text-white/70'}`}>
                      {name}
                    </span>
                    <span className="block text-xs text-white/40 font-mono">{formatCNPJ(empresa.cnpj)}</span>
                  </div>
                  <span className="text-xs text-white/40 shrink-0">{ROLE_LABELS[empresa.role] ?? empresa.role}</span>
                </button>
              </div>
            );
          })}

          {/* Aplicar */}
          <div className="p-3 border-t border-white/10">
            <button
              type="button"
              onClick={handleApply}
              disabled={isPending || checkedIds.size === 0}
              className="w-full rounded-lg bg-btn-primary px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-btn-primary-hover disabled:opacity-50 min-h-[44px]"
            >
              {isPending
                ? 'Aplicando...'
                : checkedIds.size === 1
                  ? `Ver ${empresas.find((e) => e.empresa_id === Array.from(checkedIds)[0])?.nome_fantasia ?? 'empresa'}`
                  : `Ver ${checkedIds.size} empresas`}
            </button>
          </div>

          {/* Nova empresa */}
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
