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

  return (
    <div className="flex flex-wrap gap-3 rounded-lg border border-surface-border bg-surface-card p-4">
      {showMotoristaFilter && (
        <select
          value={searchParams.get('motorista_id') ?? ''}
          onChange={(e) => updateParam('motorista_id', e.target.value)}
          className="rounded-lg border border-surface-border bg-surface-card px-3 py-2 text-sm text-primary-900 focus:border-primary-500 focus:outline-none"
        >
          <option value="">Todos motoristas</option>
          {motoristas.map((m) => (
            <option key={m.id} value={m.id}>
              {m.nome}
            </option>
          ))}
        </select>
      )}

      <select
        value={searchParams.get('status') ?? ''}
        onChange={(e) => updateParam('status', e.target.value)}
        className="rounded-lg border border-surface-border bg-surface-card px-3 py-2 text-sm text-primary-900 focus:border-primary-500 focus:outline-none"
      >
        <option value="">Todos os status</option>
        <option value="aberto">Aberto</option>
        <option value="fechado">Fechado</option>
        <option value="pago">Pago</option>
      </select>

      <select
        value={searchParams.get('tipo') ?? ''}
        onChange={(e) => updateParam('tipo', e.target.value)}
        className="rounded-lg border border-surface-border bg-surface-card px-3 py-2 text-sm text-primary-900 focus:border-primary-500 focus:outline-none"
      >
        <option value="">Todos os tipos</option>
        <option value="semanal">Semanal</option>
        <option value="mensal">Mensal</option>
      </select>
    </div>
  );
}
