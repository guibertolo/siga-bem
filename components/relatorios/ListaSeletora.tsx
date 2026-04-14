'use client';

import { useState, useMemo } from 'react';

/**
 * Filterable list of motoristas or caminhoes for selection.
 * Story 23.4 — AC4
 */

export interface ListaSeletoraItem {
  id: string;
  label: string;
  sublabel?: string;
}

interface ListaSeletoraProps {
  items: ListaSeletoraItem[];
  tipo: 'motorista' | 'caminhao';
  onSelect: (id: string) => void;
  onVoltar: () => void;
  isLoading?: boolean;
  error?: string | null;
}

export function ListaSeletora({
  items,
  tipo,
  onSelect,
  onVoltar,
  isLoading = false,
  error = null,
}: ListaSeletoraProps) {
  const [busca, setBusca] = useState('');

  const filteredItems = useMemo(() => {
    if (!busca.trim()) return items;
    const term = busca.toLowerCase().trim();
    return items.filter(
      (item) =>
        item.label.toLowerCase().includes(term) ||
        (item.sublabel && item.sublabel.toLowerCase().includes(term)),
    );
  }, [items, busca]);

  const titulo = tipo === 'motorista' ? 'Escolha o motorista' : 'Escolha o caminhao';
  const placeholder = tipo === 'motorista' ? 'Buscar motorista pelo nome...' : 'Buscar caminhao pela placa ou modelo...';

  if (error) {
    return (
      <div className="space-y-4">
        <button
          type="button"
          onClick={onVoltar}
          className="text-sm text-primary-500 transition-colors hover:text-primary-700 min-h-[48px] px-2"
        >
          &larr; Voltar
        </button>
        <div className="rounded-lg border border-warning/30 bg-warning/10 p-4 text-base text-warning-dark">
          Nao foi possivel carregar a lista. Tente novamente.
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={onVoltar}
          className="text-sm text-primary-500 transition-colors hover:text-primary-700 min-h-[48px] px-2"
        >
          &larr; Voltar
        </button>
        <h3 className="text-lg font-bold text-primary-900">{titulo}</h3>
      </div>

      <input
        type="text"
        value={busca}
        onChange={(e) => setBusca(e.target.value)}
        placeholder={placeholder}
        className="w-full rounded-lg border border-surface-border bg-surface-card px-4 py-3 text-base text-primary-900 placeholder:text-primary-400 focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500 min-h-[48px]"
      />

      {isLoading ? (
        <div className="space-y-2">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-16 animate-pulse rounded-lg bg-surface-muted" />
          ))}
        </div>
      ) : filteredItems.length === 0 ? (
        <div className="rounded-lg border border-surface-border bg-surface-muted p-6 text-center text-base text-primary-500">
          {busca.trim()
            ? `Nenhum ${tipo === 'motorista' ? 'motorista' : 'caminhao'} encontrado para "${busca}".`
            : `Nenhum ${tipo === 'motorista' ? 'motorista' : 'caminhao'} cadastrado.`}
        </div>
      ) : (
        <div className="space-y-1">
          {filteredItems.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => onSelect(item.id)}
              className="flex w-full items-center gap-3 rounded-lg border border-surface-border bg-surface-card px-4 py-3 text-left transition-colors hover:bg-surface-hover focus:outline-none focus:ring-2 focus:ring-primary-500 min-h-[48px] cursor-pointer"
            >
              <div className="min-w-0 flex-1">
                <span className="block text-base font-semibold text-primary-900 truncate">
                  {item.label}
                </span>
                {item.sublabel && (
                  <span className="block text-sm text-primary-500 truncate">
                    {item.sublabel}
                  </span>
                )}
              </div>
              <svg
                className="h-5 w-5 shrink-0 text-primary-400"
                aria-hidden="true"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
