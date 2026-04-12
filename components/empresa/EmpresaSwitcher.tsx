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

/**
 * Sidebar empresa switcher component with multi-select support.
 *
 * Single empresa: static label.
 * Multiple empresas: dropdown with checkboxes for multi-select.
 * - "Todas as Empresas" checkbox at top (selects/deselects all)
 * - When multiple selected: calls setSelectedEmpresas(ids)
 * - When single selected: calls switchEmpresa(id) + clearSelectedEmpresas()
 * - Shows count "Visualizando X de Y empresas"
 * - Active empresa is always checked (cannot uncheck)
 */
export function EmpresaSwitcher({ empresas, selectedEmpresaIds }: EmpresaSwitcherProps) {
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [optimisticActiveId, setOptimisticActiveId] = useState<string | null>(null);
  const [checkedIds, setCheckedIds] = useState<Set<string>>(() => {
    if (selectedEmpresaIds && selectedEmpresaIds.length >= 2) {
      return new Set(selectedEmpresaIds);
    }
    const active = empresas.find((e) => e.is_active);
    return active ? new Set([active.empresa_id]) : new Set();
  });
  const [multiMode, setMultiMode] = useState(
    () => (selectedEmpresaIds?.length ?? 0) >= 2,
  );
  const dropdownRef = useRef<HTMLDivElement>(null);
  const pathname = usePathname();
  const router = useRouter();

  const activeEmpresa = optimisticActiveId
    ? empresas.find((e) => e.empresa_id === optimisticActiveId)
    : empresas.find((e) => e.is_active);
  const hasMultiple = empresas.length > 1;

  const isMultiActive = multiMode && checkedIds.size >= 2;

  const displayName = isMultiActive
    ? `${checkedIds.size} de ${empresas.length} empresas`
    : activeEmpresa
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

  // Sync checked state when selectedEmpresaIds prop changes
  useEffect(() => {
    if (selectedEmpresaIds && selectedEmpresaIds.length >= 2) {
      setCheckedIds(new Set(selectedEmpresaIds));
      setMultiMode(true);
    }
  }, [selectedEmpresaIds]);

  function handleSingleSwitch(empresaId: string) {
    if (isPending) return;
    setOptimisticActiveId(empresaId);
    setOpen(false);
    // Clear multi-select and switch — use window.location for clean reload
    startTransition(async () => {
      try { await clearSelectedEmpresas(); } catch { /* ok */ }
      try { await switchEmpresa(empresaId); } catch { /* redirect throws */ }
      // Force full page reload to ensure clean state
      window.location.href = pathname;
    });
  }

  function handleCheckboxToggle(empresaId: string) {
    setCheckedIds((prev) => {
      const next = new Set(prev);
      if (next.has(empresaId)) {
        next.delete(empresaId);
      } else {
        next.add(empresaId);
      }
      return next;
    });
    setMultiMode(true);
  }

  function handleApply() {
    if (isPending) return;
    const ids = Array.from(checkedIds);

    if (ids.length <= 1) {
      // Single mode — switch to that empresa
      const targetId = ids[0] ?? activeEmpresa?.empresa_id;
      if (targetId) {
        handleSingleSwitch(targetId);
      }
      return;
    }

    // Multi mode
    setOpen(false);
    startTransition(async () => {
      await setSelectedEmpresas(ids);
      router.refresh();
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

  // Multiple empresas: dropdown with checkboxes
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

      {/* Dropdown list */}
      {open && (
        <div
          className="absolute left-0 right-0 top-full z-50 mx-2 mt-1 rounded-lg bg-[#0F2A38] border border-white/10 shadow-xl max-h-96 overflow-y-auto"
          role="listbox"
          aria-label="Lista de empresas"
        >
          {/* Lista de empresas — clique para trocar */}
          {empresas.map((empresa) => {
            const isActive = optimisticActiveId
              ? empresa.empresa_id === optimisticActiveId
              : empresa.is_active;
            const name = empresa.nome_fantasia ?? empresa.razao_social;
            return (
              <button
                key={empresa.empresa_id}
                type="button"
                onClick={() => { if (!isActive) handleSingleSwitch(empresa.empresa_id); }}
                disabled={isActive || isPending}
                className={`
                  flex flex-col w-full px-4 py-3 text-left border-b border-white/5
                  transition-colors bg-transparent border-none cursor-pointer
                  ${isActive ? 'bg-white/10 cursor-default' : 'hover:bg-white/10'}
                `}
              >
                <div className="flex items-center gap-2">
                  {isActive && (
                    <svg className="h-4 w-4 text-success shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                  )}
                  <span className={`text-sm font-medium truncate ${isActive ? 'text-white' : 'text-white/80'}`}>
                    {name}
                  </span>
                </div>
                <div className="flex items-center gap-3 mt-0.5 ml-0">
                  <span className="text-xs text-white/50 font-mono">{formatCNPJ(empresa.cnpj)}</span>
                  <span className="text-xs text-white/40">{ROLE_LABELS[empresa.role] ?? empresa.role}</span>
                </div>
              </button>
            );
          })}

          {/* Comparar empresas — modo multi */}
          {empresas.length >= 2 && (
            <div className="border-t border-white/10 p-3 space-y-2">
              {!multiMode ? (
                <>
                  <button
                    type="button"
                    onClick={() => {
                      setOpen(false);
                      const allIds = empresas.map(e => e.empresa_id);
                      startTransition(async () => {
                        await setSelectedEmpresas(allIds);
                        router.refresh();
                      });
                    }}
                    disabled={isPending}
                    className="w-full rounded-lg border border-white/20 px-4 py-2.5 text-sm font-medium text-white/80 transition-colors hover:bg-white/10 min-h-[44px]"
                  >
                    📊 Ver Todas as Empresas
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setMultiMode(true);
                      setCheckedIds(new Set(empresas.map(e => e.empresa_id)));
                    }}
                    className="w-full rounded-lg px-4 py-2 text-xs text-white/50 transition-colors hover:text-white/70"
                  >
                    Escolher quais visualizar
                  </button>
                </>
              ) : (
                <>
                  {/* Checkboxes para selecionar quais */}
                  <p className="text-xs text-white/60 mb-2">Selecione as empresas:</p>
                  {empresas.map((emp) => {
                    const checked = checkedIds.has(emp.empresa_id);
                    const empName = emp.nome_fantasia ?? emp.razao_social;
                    return (
                      <button
                        key={emp.empresa_id}
                        type="button"
                        onClick={() => handleCheckboxToggle(emp.empresa_id)}
                        className="flex items-center gap-2 w-full px-2 py-1.5 text-left bg-transparent border-none cursor-pointer hover:bg-white/10 rounded transition-colors"
                      >
                        <span className={`flex items-center justify-center h-5 w-5 rounded border-2 shrink-0 transition-colors ${checked ? 'bg-success border-success' : 'border-white/40'}`}>
                          {checked && (
                            <svg className="h-3.5 w-3.5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={3}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                            </svg>
                          )}
                        </span>
                        <span className="text-sm text-white/80 truncate">{empName}</span>
                      </button>
                    );
                  })}
                  <div className="flex gap-2 mt-2">
                    <button
                      type="button"
                      onClick={handleApply}
                      disabled={isPending || checkedIds.size < 2}
                      className="flex-1 rounded-lg bg-btn-primary px-3 py-2 text-sm font-semibold text-white transition-colors hover:bg-btn-primary-hover disabled:opacity-50 min-h-[40px]"
                    >
                      {isPending ? 'Aplicando...' : `Visualizar ${checkedIds.size} Empresas`}
                    </button>
                    <button
                      type="button"
                      onClick={() => setMultiMode(false)}
                      className="rounded-lg px-3 py-2 text-sm text-white/60 hover:text-white/80 transition-colors"
                    >
                      Cancelar
                    </button>
                  </div>
                </>
              )}
            </div>
          )}

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
