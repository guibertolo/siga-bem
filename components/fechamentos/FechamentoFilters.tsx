'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { useCallback } from 'react';

interface FechamentoFiltersProps {
  motoristas: Array<{ id: string; nome: string }>;
  showMotoristaFilter: boolean;
}

export function FechamentoFilters({
  motoristas,
  showMotoristaFilter,
}: FechamentoFiltersProps) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const updateParam = useCallback(
    (key: string, value: string) => {
      const params = new URLSearchParams(searchParams.toString());
      if (value) {
        params.set(key, value);
      } else {
        params.delete(key);
      }
      // Reset to page 1 when filters change
      params.delete('page');
      router.push(`/fechamentos?${params.toString()}`);
    },
    [router, searchParams],
  );

  const hasFilters =
    searchParams.has('motorista_id') ||
    searchParams.has('status') ||
    searchParams.has('tipo');

  function handleClear() {
    router.push('/fechamentos');
  }

  return (
    <div className="space-y-4 rounded-lg border border-surface-border bg-surface-card p-4">
      <div
        className={`grid gap-3 grid-cols-1 ${
          showMotoristaFilter ? 'sm:grid-cols-2 lg:grid-cols-3' : 'sm:grid-cols-2'
        }`}
      >
        {/* Motorista */}
        {showMotoristaFilter && (
          <div>
            <label
              htmlFor="filter-motorista"
              className="mb-1 block text-xs font-medium uppercase tracking-wide text-primary-500"
            >
              Motorista
            </label>
            <select
              id="filter-motorista"
              value={searchParams.get('motorista_id') ?? ''}
              onChange={(e) => updateParam('motorista_id', e.target.value)}
              className="block w-full min-h-[48px] rounded-lg border border-surface-border bg-surface-card px-4 py-3 text-base text-primary-900 focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
            >
              <option value="">Todos motoristas</option>
              {motoristas.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.nome}
                </option>
              ))}
            </select>
          </div>
        )}

        {/* Status */}
        <div>
          <label
            htmlFor="filter-status"
            className="mb-1 block text-xs font-medium uppercase tracking-wide text-primary-500"
          >
            Situacao
          </label>
          <select
            id="filter-status"
            value={searchParams.get('status') ?? ''}
            onChange={(e) => updateParam('status', e.target.value)}
            className="block w-full min-h-[48px] rounded-lg border border-surface-border bg-surface-card px-4 py-3 text-base text-primary-900 focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
          >
            <option value="">Todas as situacoes</option>
            <option value="aberto">Aberto</option>
            <option value="fechado">Fechado</option>
            <option value="pago">Pago</option>
          </select>
        </div>

        {/* Tipo */}
        <div>
          <label
            htmlFor="filter-tipo"
            className="mb-1 block text-xs font-medium uppercase tracking-wide text-primary-500"
          >
            Tipo
          </label>
          <select
            id="filter-tipo"
            value={searchParams.get('tipo') ?? ''}
            onChange={(e) => updateParam('tipo', e.target.value)}
            className="block w-full min-h-[48px] rounded-lg border border-surface-border bg-surface-card px-4 py-3 text-base text-primary-900 focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
          >
            <option value="">Todos os tipos</option>
            <option value="semanal">Semanal</option>
            <option value="mensal">Mensal</option>
          </select>
        </div>
      </div>

      {hasFilters && (
        <button
          type="button"
          onClick={handleClear}
          className="text-xs text-primary-500 transition-colors hover:text-primary-700"
        >
          Limpar filtros
        </button>
      )}
    </div>
  );
}
