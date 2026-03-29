'use client';

import { useState } from 'react';
import type { ViagemStatus } from '@/types/database';
import { VIAGEM_STATUS_LABELS, VIAGEM_STATUS_OPTIONS } from '@/types/viagem';

export interface ViagemFilterValues {
  status: ViagemStatus[];
  motorista_id: string;
  data_inicio: string;
  data_fim: string;
  texto: string;
}

interface ViagemFiltersProps {
  motoristas: Array<{ id: string; nome: string }>;
  initialFilters: ViagemFilterValues;
  onFilter: (filters: ViagemFilterValues) => void;
}

export function ViagemFilters({
  motoristas,
  initialFilters,
  onFilter,
}: ViagemFiltersProps) {
  const [filters, setFilters] = useState<ViagemFilterValues>(initialFilters);

  function handleChange(partial: Partial<ViagemFilterValues>) {
    const updated = { ...filters, ...partial };
    setFilters(updated);
    onFilter(updated);
  }

  function handleStatusToggle(status: ViagemStatus) {
    const current = filters.status;
    const updated = current.includes(status)
      ? current.filter((s) => s !== status)
      : [...current, status];
    handleChange({ status: updated });
  }

  function handleClear() {
    const cleared: ViagemFilterValues = {
      status: [],
      motorista_id: '',
      data_inicio: '',
      data_fim: '',
      texto: '',
    };
    setFilters(cleared);
    onFilter(cleared);
  }

  const hasFilters =
    filters.status.length > 0 ||
    filters.motorista_id !== '' ||
    filters.data_inicio !== '' ||
    filters.data_fim !== '' ||
    filters.texto !== '';

  return (
    <div className="space-y-4 rounded-lg border border-surface-border bg-surface-card p-4">
      {/* Status multi-select as checkboxes */}
      <div>
        <label className="mb-2 block text-xs font-medium uppercase tracking-wide text-primary-500">
          Status
        </label>
        <div className="flex flex-wrap gap-2">
          {VIAGEM_STATUS_OPTIONS.map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => handleStatusToggle(s)}
              className={`rounded-full border px-3 py-1 text-xs font-medium transition-colors ${
                filters.status.includes(s)
                  ? 'border-primary-500 bg-primary-100 text-primary-800'
                  : 'border-surface-border text-primary-500 hover:bg-surface-muted'
              }`}
            >
              {VIAGEM_STATUS_LABELS[s]}
            </button>
          ))}
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {/* Motorista */}
        <div>
          <label htmlFor="filter-motorista" className="mb-1 block text-xs font-medium uppercase tracking-wide text-primary-500">
            Motorista
          </label>
          <select
            id="filter-motorista"
            value={filters.motorista_id}
            onChange={(e) => handleChange({ motorista_id: e.target.value })}
            className="block w-full rounded-lg border border-surface-border bg-surface-card px-3 py-2 text-sm"
          >
            <option value="">Todos</option>
            {motoristas.map((m) => (
              <option key={m.id} value={m.id}>{m.nome}</option>
            ))}
          </select>
        </div>

        {/* Data Inicio */}
        <div>
          <label htmlFor="filter-data-inicio" className="mb-1 block text-xs font-medium uppercase tracking-wide text-primary-500">
            Data Inicio
          </label>
          <input
            id="filter-data-inicio"
            type="date"
            value={filters.data_inicio}
            onChange={(e) => handleChange({ data_inicio: e.target.value })}
            className="block w-full rounded-lg border border-surface-border bg-surface-card px-3 py-2 text-sm"
          />
        </div>

        {/* Data Fim */}
        <div>
          <label htmlFor="filter-data-fim" className="mb-1 block text-xs font-medium uppercase tracking-wide text-primary-500">
            Data Fim
          </label>
          <input
            id="filter-data-fim"
            type="date"
            value={filters.data_fim}
            onChange={(e) => handleChange({ data_fim: e.target.value })}
            className="block w-full rounded-lg border border-surface-border bg-surface-card px-3 py-2 text-sm"
          />
        </div>

        {/* Texto livre */}
        <div>
          <label htmlFor="filter-texto" className="mb-1 block text-xs font-medium uppercase tracking-wide text-primary-500">
            Busca
          </label>
          <input
            id="filter-texto"
            type="text"
            placeholder="Origem ou destino..."
            value={filters.texto}
            onChange={(e) => handleChange({ texto: e.target.value })}
            className="block w-full rounded-lg border border-surface-border bg-surface-card px-3 py-2 text-sm"
          />
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
