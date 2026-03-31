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
  isMotorista?: boolean;
}

export function ViagemFilters({
  motoristas,
  initialFilters,
  onFilter,
  isMotorista = false,
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
          Situação
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

      {/* Atalhos de periodo */}
      <div>
        <label className="mb-2 block text-xs font-medium uppercase tracking-wide text-primary-500">
          Período
        </label>
        <div className="flex flex-wrap gap-2">
          {[
            { label: 'Esta semana', days: 7 },
            { label: 'Este mes', days: 30 },
            { label: 'Ultimos 3 meses', days: 90 },
            { label: 'Este ano', days: 365 },
          ].map(({ label, days }) => {
            const end = new Date().toISOString().split('T')[0];
            const start = new Date(Date.now() - days * 86400000).toISOString().split('T')[0];
            const isActive = filters.data_inicio === start && filters.data_fim === end;
            return (
              <button
                key={days}
                type="button"
                onClick={() => handleChange({ data_inicio: start, data_fim: end })}
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
      </div>

      <div className={`grid gap-4 sm:grid-cols-2 ${isMotorista ? 'lg:grid-cols-3' : 'lg:grid-cols-4'}`}>
        {/* Motorista — escondido para role motorista */}
        {!isMotorista && (
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
        )}

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
          Limpar busca
        </button>
      )}
    </div>
  );
}
