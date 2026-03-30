'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { useCallback, useEffect, useState, useTransition } from 'react';

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
  const [isPending, startTransition] = useTransition();

  // Optimistic local state — updates immediately on user interaction
  const [motoristaId, setMotoristaId] = useState(searchParams.get('motorista_id') ?? '');
  const [status, setStatus] = useState(searchParams.get('status') ?? '');
  const [tipo, setTipo] = useState(searchParams.get('tipo') ?? '');

  // Sync local state when searchParams finish updating
  useEffect(() => {
    setMotoristaId(searchParams.get('motorista_id') ?? '');
    setStatus(searchParams.get('status') ?? '');
    setTipo(searchParams.get('tipo') ?? '');
  }, [searchParams]);

  const updateParam = useCallback(
    (key: string, value: string) => {
      // Update local state immediately (optimistic)
      if (key === 'motorista_id') setMotoristaId(value);
      if (key === 'status') setStatus(value);
      if (key === 'tipo') setTipo(value);

      const params = new URLSearchParams(searchParams.toString());
      if (value) {
        params.set(key, value);
      } else {
        params.delete(key);
      }
      // Reset to page 1 when filters change
      params.delete('page');
      startTransition(() => {
        router.push(`/fechamentos?${params.toString()}`);
      });
    },
    [router, searchParams, startTransition],
  );

  const hasFilters =
    motoristaId !== '' ||
    status !== '' ||
    tipo !== '';

  function handleClear() {
    setMotoristaId('');
    setStatus('');
    setTipo('');
    startTransition(() => {
      router.push('/fechamentos');
    });
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
              value={motoristaId}
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
            value={status}
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
            value={tipo}
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
          disabled={isPending}
          className="text-xs text-primary-500 transition-colors hover:text-primary-700"
        >
          Limpar filtros
        </button>
      )}

      {isPending && (
        <div className="mt-2 text-xs text-primary-500">Buscando...</div>
      )}
    </div>
  );
}
