'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { useCallback, useState, useTransition } from 'react';
import type { GastoFilterOptions } from '@/types/gasto';

interface GastoFiltersProps {
  options: GastoFilterOptions;
  showMotoristaFilter: boolean;
}

export function GastoFilters({
  options,
  showMotoristaFilter,
}: GastoFiltersProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();

  const currentMotoristaIds = searchParams.get('motoristaIds')?.split(',').filter(Boolean) ?? [];
  const currentCaminhaoIds = searchParams.get('caminhaoIds')?.split(',').filter(Boolean) ?? [];
  const currentCategoriaIds = searchParams.get('categoriaIds')?.split(',').filter(Boolean) ?? [];
  const currentStartDate = searchParams.get('startDate') ?? '';
  const currentEndDate = searchParams.get('endDate') ?? '';

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
        router.push(`?${params.toString()}`);
      });
    },
    [router, searchParams, startTransition],
  );

  function handleMultiSelect(
    paramName: string,
    currentValues: string[],
    toggledValue: string,
  ) {
    const newValues = currentValues.includes(toggledValue)
      ? currentValues.filter((v) => v !== toggledValue)
      : [...currentValues, toggledValue];

    updateParams({ [paramName]: newValues.join(',') });
  }

  function handleClearAll() {
    startTransition(() => {
      router.push('/gastos');
    });
  }

  const hasActiveFilters =
    currentMotoristaIds.length > 0 ||
    currentCaminhaoIds.length > 0 ||
    currentCategoriaIds.length > 0 ||
    currentStartDate !== '' ||
    currentEndDate !== '';

  return (
    <div className="rounded-lg border border-surface-border bg-surface-card p-4">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="text-sm font-semibold text-primary-900">Buscar por</h3>
        {hasActiveFilters && (
          <button
            type="button"
            onClick={handleClearAll}
            disabled={isPending}
            className="text-xs text-primary-500 transition-colors hover:text-primary-800"
          >
            Limpar busca
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {/* Date range: start */}
        <div>
          <label
            htmlFor="startDate"
            className="mb-1 block text-xs font-medium text-primary-700"
          >
            Data inicio
          </label>
          <input
            id="startDate"
            type="date"
            value={currentStartDate}
            onChange={(e) => updateParams({ startDate: e.target.value })}
            className="w-full rounded-md border border-surface-border bg-surface-card px-3 py-2 text-sm text-primary-900 focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
          />
        </div>

        {/* Date range: end */}
        <div>
          <label
            htmlFor="endDate"
            className="mb-1 block text-xs font-medium text-primary-700"
          >
            Data fim
          </label>
          <input
            id="endDate"
            type="date"
            value={currentEndDate}
            onChange={(e) => updateParams({ endDate: e.target.value })}
            className="w-full rounded-md border border-surface-border bg-surface-card px-3 py-2 text-sm text-primary-900 focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
          />
        </div>

        {/* Motorista multi-select (hidden for motorista role) */}
        {showMotoristaFilter && (
          <div>
            <span className="mb-1 block text-xs font-medium text-primary-700">
              Motorista
            </span>
            <MultiSelectDropdown
              options={options.motoristas.map((m) => ({
                value: m.id,
                label: m.nome,
              }))}
              selected={currentMotoristaIds}
              placeholder="Todos"
              onToggle={(value) =>
                handleMultiSelect('motoristaIds', currentMotoristaIds, value)
              }
            />
          </div>
        )}

        {/* Caminhao multi-select */}
        <div>
          <span className="mb-1 block text-xs font-medium text-primary-700">
            Caminhao
          </span>
          <MultiSelectDropdown
            options={options.caminhoes.map((c) => ({
              value: c.id,
              label: `${c.placa} - ${c.modelo}`,
            }))}
            selected={currentCaminhaoIds}
            placeholder="Todos"
            onToggle={(value) =>
              handleMultiSelect('caminhaoIds', currentCaminhaoIds, value)
            }
          />
        </div>

        {/* Categoria multi-select */}
        <div>
          <span className="mb-1 block text-xs font-medium text-primary-700">
            Categoria
          </span>
          <MultiSelectDropdown
            options={options.categorias.map((c) => ({
              value: c.id,
              label: c.nome,
            }))}
            selected={currentCategoriaIds}
            placeholder="Todas"
            onToggle={(value) =>
              handleMultiSelect('categoriaIds', currentCategoriaIds, value)
            }
          />
        </div>
      </div>

      {isPending && (
        <div className="mt-2 text-xs text-primary-500">Buscando...</div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Multi-select dropdown component (inline, reusable within this file)
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
          {/* Backdrop to close dropdown */}
          <div
            className="fixed inset-0 z-10"
            onClick={() => setIsOpen(false)}
          />
          <div className="absolute z-20 mt-1 max-h-60 w-full overflow-auto rounded-md border border-surface-border bg-surface-card py-1 shadow-lg">
            {options.length === 0 ? (
              <div className="px-3 py-2 text-sm text-primary-400">
                Nada encontrado
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

