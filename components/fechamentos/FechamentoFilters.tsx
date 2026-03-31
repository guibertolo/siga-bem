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
  const [dataInicio, setDataInicio] = useState(searchParams.get('dataInicio') ?? '');
  const [dataFim, setDataFim] = useState(searchParams.get('dataFim') ?? '');

  // Sync local state when searchParams finish updating
  useEffect(() => {
    setMotoristaId(searchParams.get('motorista_id') ?? '');
    setStatus(searchParams.get('status') ?? '');
    setTipo(searchParams.get('tipo') ?? '');
    setDataInicio(searchParams.get('dataInicio') ?? '');
    setDataFim(searchParams.get('dataFim') ?? '');
  }, [searchParams]);

  const updateParams = useCallback(
    (updates: Record<string, string>) => {
      // Update local state immediately (optimistic)
      for (const [key, value] of Object.entries(updates)) {
        if (key === 'motorista_id') setMotoristaId(value);
        if (key === 'status') setStatus(value);
        if (key === 'tipo') setTipo(value);
        if (key === 'dataInicio') setDataInicio(value);
        if (key === 'dataFim') setDataFim(value);
      }

      const params = new URLSearchParams(searchParams.toString());
      for (const [key, value] of Object.entries(updates)) {
        if (value) {
          params.set(key, value);
        } else {
          params.delete(key);
        }
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
    tipo !== '' ||
    dataInicio !== '' ||
    dataFim !== '';

  function handleClear() {
    setMotoristaId('');
    setStatus('');
    setTipo('');
    setDataInicio('');
    setDataFim('');
    startTransition(() => {
      router.push('/fechamentos');
    });
  }

  return (
    <div className="space-y-4 rounded-lg border border-surface-border bg-surface-card p-4">
      {/* Atalhos de periodo */}
      <div className="flex flex-wrap gap-2">
        {[
          { label: 'Esta semana', days: 7 },
          { label: 'Este mes', days: 30 },
          { label: 'Ultimos 3 meses', days: 90 },
          { label: 'Este ano', days: 365 },
        ].map(({ label, days }) => {
          const end = new Date().toISOString().split('T')[0];
          const start = new Date(Date.now() - days * 86400000).toISOString().split('T')[0];
          const isActive = dataInicio === start && dataFim === end;
          return (
            <button
              key={days}
              type="button"
              onClick={() => updateParams({ dataInicio: start, dataFim: end })}
              className={`rounded-full px-3 py-1.5 text-sm font-medium transition-colors min-h-[36px] ${
                isActive
                  ? 'bg-btn-primary text-white'
                  : 'bg-surface-muted text-primary-700 hover:bg-surface-hover'
              }`}
            >
              {label}
            </button>
          );
        })}
      </div>

      <div
        className={`grid gap-3 grid-cols-1 ${
          showMotoristaFilter ? 'sm:grid-cols-2 lg:grid-cols-5' : 'sm:grid-cols-2 lg:grid-cols-4'
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
              onChange={(e) => updateParams({ motorista_id: e.target.value })}
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
            Situação
          </label>
          <select
            id="filter-status"
            value={status}
            onChange={(e) => updateParams({ status: e.target.value })}
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
            onChange={(e) => updateParams({ tipo: e.target.value })}
            className="block w-full min-h-[48px] rounded-lg border border-surface-border bg-surface-card px-4 py-3 text-base text-primary-900 focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
          >
            <option value="">Todos os tipos</option>
            <option value="semanal">Semanal</option>
            <option value="mensal">Mensal</option>
          </select>
        </div>

        {/* Periodo personalizado */}
        <div>
          <label
            htmlFor="filter-dataInicio"
            className="mb-1 block text-xs font-medium uppercase tracking-wide text-primary-500"
          >
            De
          </label>
          <input
            id="filter-dataInicio"
            type="date"
            value={dataInicio}
            onChange={(e) => updateParams({ dataInicio: e.target.value })}
            className="block w-full min-h-[48px] rounded-lg border border-surface-border bg-surface-card px-4 py-3 text-base text-primary-900 focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
          />
        </div>

        <div>
          <label
            htmlFor="filter-dataFim"
            className="mb-1 block text-xs font-medium uppercase tracking-wide text-primary-500"
          >
            Ate
          </label>
          <input
            id="filter-dataFim"
            type="date"
            value={dataFim}
            onChange={(e) => updateParams({ dataFim: e.target.value })}
            className="block w-full min-h-[48px] rounded-lg border border-surface-border bg-surface-card px-4 py-3 text-base text-primary-900 focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
          />
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
