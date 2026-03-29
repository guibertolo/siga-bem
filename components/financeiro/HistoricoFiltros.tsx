'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { useCallback, useEffect, useRef, useState, useTransition } from 'react';
import type { FechamentoHistoricoFiltros, FechamentoFilterOptions } from '@/types/fechamento';

interface HistoricoFiltrosProps {
  showMotoristaFilter: boolean;
  filterOptions?: FechamentoFilterOptions;
  currentFiltros: FechamentoHistoricoFiltros;
}

export function HistoricoFiltros({
  showMotoristaFilter,
  filterOptions,
  currentFiltros,
}: HistoricoFiltrosProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();
  const [buscaLocal, setBuscaLocal] = useState(currentFiltros.busca ?? '');
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const updateParams = useCallback(
    (updates: Record<string, string>) => {
      const params = new URLSearchParams(searchParams.toString());

      for (const [key, value] of Object.entries(updates)) {
        if (value) {
          params.set(key, value);
        } else {
          params.delete(key);
        }
      }

      // Reset page when filters change
      params.delete('page');

      startTransition(() => {
        router.push(`/financeiro/historico?${params.toString()}`);
      });
    },
    [router, searchParams, startTransition],
  );

  // Debounced text search
  useEffect(() => {
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }
    debounceRef.current = setTimeout(() => {
      if (buscaLocal !== (currentFiltros.busca ?? '')) {
        updateParams({ busca: buscaLocal });
      }
    }, 400);

    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
    };
  }, [buscaLocal, currentFiltros.busca, updateParams]);

  function handleMultiSelect(currentValues: string[], toggledValue: string) {
    const newValues = currentValues.includes(toggledValue)
      ? currentValues.filter((v) => v !== toggledValue)
      : [...currentValues, toggledValue];

    updateParams({ motoristaIds: newValues.join(',') });
  }

  function handleClearAll() {
    setBuscaLocal('');
    startTransition(() => {
      router.push('/financeiro/historico');
    });
  }

  const currentMotoristaIds = currentFiltros.motorista_ids ?? [];

  const hasActiveFilters =
    currentMotoristaIds.length > 0 ||
    (currentFiltros.tipo !== undefined && currentFiltros.tipo !== 'todos') ||
    (currentFiltros.status !== undefined && currentFiltros.status !== 'todos') ||
    !!currentFiltros.periodo_inicio ||
    !!currentFiltros.periodo_fim ||
    !!currentFiltros.busca;

  return (
    <div className="rounded-lg border border-surface-border bg-surface-card p-4">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="text-sm font-semibold text-primary-900">Filtros</h3>
        {hasActiveFilters && (
          <button
            type="button"
            onClick={handleClearAll}
            disabled={isPending}
            className="text-xs text-primary-600 transition-colors hover:text-primary-800"
          >
            Limpar filtros
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
        {/* Text search */}
        <div>
          <label
            htmlFor="busca"
            className="mb-1 block text-xs font-medium text-primary-700"
          >
            Buscar motorista
          </label>
          <input
            id="busca"
            type="text"
            value={buscaLocal}
            onChange={(e) => setBuscaLocal(e.target.value)}
            placeholder="Nome do motorista..."
            className="w-full rounded-md border border-surface-border bg-surface-card px-3 py-2 text-sm text-primary-900 placeholder:text-primary-400 focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
          />
        </div>

        {/* Motorista multi-select (admin only) */}
        {showMotoristaFilter && filterOptions && (
          <div>
            <span className="mb-1 block text-xs font-medium text-primary-700">
              Motorista
            </span>
            <MultiSelectDropdown
              options={filterOptions.motoristas.map((m) => ({
                value: m.id,
                label: m.nome,
              }))}
              selected={currentMotoristaIds}
              placeholder="Todos"
              onToggle={(value) =>
                handleMultiSelect(currentMotoristaIds, value)
              }
            />
          </div>
        )}

        {/* Tipo select */}
        <div>
          <label
            htmlFor="tipo"
            className="mb-1 block text-xs font-medium text-primary-700"
          >
            Tipo
          </label>
          <select
            id="tipo"
            value={currentFiltros.tipo ?? 'todos'}
            onChange={(e) => updateParams({ tipo: e.target.value === 'todos' ? '' : e.target.value })}
            className="w-full rounded-md border border-surface-border bg-surface-card px-3 py-2 text-sm text-primary-900 focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
          >
            <option value="todos">Todos</option>
            <option value="semanal">Semanal</option>
            <option value="mensal">Mensal</option>
          </select>
        </div>

        {/* Status select */}
        <div>
          <label
            htmlFor="status"
            className="mb-1 block text-xs font-medium text-primary-700"
          >
            Status
          </label>
          <select
            id="status"
            value={currentFiltros.status ?? 'todos'}
            onChange={(e) => updateParams({ status: e.target.value === 'todos' ? '' : e.target.value })}
            className="w-full rounded-md border border-surface-border bg-surface-card px-3 py-2 text-sm text-primary-900 focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
          >
            <option value="todos">Todos</option>
            <option value="aberto">Aberto</option>
            <option value="fechado">Fechado</option>
            <option value="pago">Pago</option>
          </select>
        </div>

        {/* Date range */}
        <div className="grid grid-cols-2 gap-2">
          <div>
            <label
              htmlFor="periodoInicio"
              className="mb-1 block text-xs font-medium text-primary-700"
            >
              De
            </label>
            <input
              id="periodoInicio"
              type="date"
              value={currentFiltros.periodo_inicio ?? ''}
              onChange={(e) => updateParams({ periodoInicio: e.target.value })}
              className="w-full rounded-md border border-surface-border bg-surface-card px-2 py-2 text-sm text-primary-900 focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
            />
          </div>
          <div>
            <label
              htmlFor="periodoFim"
              className="mb-1 block text-xs font-medium text-primary-700"
            >
              Ate
            </label>
            <input
              id="periodoFim"
              type="date"
              value={currentFiltros.periodo_fim ?? ''}
              onChange={(e) => updateParams({ periodoFim: e.target.value })}
              className="w-full rounded-md border border-surface-border bg-surface-card px-2 py-2 text-sm text-primary-900 focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
            />
          </div>
        </div>
      </div>

      {isPending && (
        <div className="mt-2 text-xs text-primary-500">Filtrando...</div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Multi-select dropdown (reused pattern from GastoFilters)
// ---------------------------------------------------------------------------

interface MultiSelectDropdownProps {
  options: Array<{ value: string; label: string }>;
  selected: string[];
  placeholder: string;
  onToggle: (value: string) => void;
}

function MultiSelectDropdown({
  options,
  selected,
  placeholder,
  onToggle,
}: MultiSelectDropdownProps) {
  const [isOpen, setIsOpen] = useState(false);

  const displayText =
    selected.length === 0
      ? placeholder
      : `${selected.length} selecionado${selected.length > 1 ? 's' : ''}`;

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="flex w-full items-center justify-between rounded-md border border-surface-border bg-surface-card px-3 py-2 text-left text-sm text-primary-900 focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
      >
        <span className={selected.length === 0 ? 'text-primary-400' : ''}>
          {displayText}
        </span>
        <svg
          className={`h-4 w-4 text-primary-400 transition-transform ${isOpen ? 'rotate-180' : ''}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M19 9l-7 7-7-7"
          />
        </svg>
      </button>

      {isOpen && (
        <>
          <div
            className="fixed inset-0 z-10"
            onClick={() => setIsOpen(false)}
          />
          <div className="absolute z-20 mt-1 max-h-60 w-full overflow-auto rounded-md border border-surface-border bg-surface-card py-1 shadow-lg">
            {options.length === 0 ? (
              <div className="px-3 py-2 text-sm text-primary-400">
                Nenhuma opcao
              </div>
            ) : (
              options.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => onToggle(option.value)}
                  className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm hover:bg-surface-muted"
                >
                  <span
                    className={`flex h-4 w-4 items-center justify-center rounded border ${
                      selected.includes(option.value)
                        ? 'border-primary-600 bg-primary-600 text-white'
                        : 'border-surface-border'
                    }`}
                  >
                    {selected.includes(option.value) && (
                      <svg
                        className="h-3 w-3"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={3}
                          d="M5 13l4 4L19 7"
                        />
                      </svg>
                    )}
                  </span>
                  <span className="text-primary-900">{option.label}</span>
                </button>
              ))
            )}
          </div>
        </>
      )}
    </div>
  );
}
