'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { useCallback, useState, useEffect, useTransition } from 'react';
import type { BIFilterOptions } from '@/types/bi';

interface BiFiltrosProps {
  options: BIFilterOptions;
}

export function BiFiltros({ options }: BiFiltrosProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();

  // Optimistic local state — updates immediately on user interaction
  const [periodo, setPeriodo] = useState(searchParams.get('periodo') ?? '30');
  const [caminhaoId, setCaminhaoId] = useState(searchParams.get('caminhaoId') ?? '');
  const [motoristaId, setMotoristaId] = useState(searchParams.get('motoristaId') ?? '');
  const [categoriaId, setCategoriaId] = useState(searchParams.get('categoriaId') ?? '');

  // Sync local state when searchParams finish updating
  useEffect(() => {
    setPeriodo(searchParams.get('periodo') ?? '30');
    setCaminhaoId(searchParams.get('caminhaoId') ?? '');
    setMotoristaId(searchParams.get('motoristaId') ?? '');
    setCategoriaId(searchParams.get('categoriaId') ?? '');
  }, [searchParams]);

  const updateParams = useCallback(
    (updates: Record<string, string>) => {
      // Update local state immediately (optimistic)
      for (const [key, value] of Object.entries(updates)) {
        if (key === 'periodo') setPeriodo(value || '30');
        if (key === 'caminhaoId') setCaminhaoId(value);
        if (key === 'motoristaId') setMotoristaId(value);
        if (key === 'categoriaId') setCategoriaId(value);
      }

      const params = new URLSearchParams(searchParams.toString());
      for (const [key, value] of Object.entries(updates)) {
        if (value) {
          params.set(key, value);
        } else {
          params.delete(key);
        }
      }

      startTransition(() => {
        router.push(`/bi?${params.toString()}`);
      });
    },
    [router, searchParams, startTransition],
  );

  function handleClearAll() {
    setPeriodo('30');
    setCaminhaoId('');
    setMotoristaId('');
    setCategoriaId('');
    startTransition(() => {
      router.push('/bi');
    });
  }

  const hasActiveFilters =
    periodo !== '30' ||
    caminhaoId !== '' ||
    motoristaId !== '' ||
    categoriaId !== '';

  return (
    <div className="rounded-card border border-surface-border bg-surface-card p-4 shadow-sm">
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
        {/* Periodo */}
        <div>
          <label
            htmlFor="bi-periodo"
            className="mb-1 block text-xs font-medium text-primary-700"
          >
            Periodo
          </label>
          <select
            id="bi-periodo"
            value={periodo}
            onChange={(e) => updateParams({ periodo: e.target.value })}
            className="w-full rounded-md border border-surface-border bg-surface-card px-3 py-2 text-sm text-primary-900 focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
          >
            <option value="30">Ultimos 30 dias</option>
            <option value="90">Ultimos 3 meses</option>
            <option value="180">Ultimos 6 meses</option>
            <option value="365">Ultimos 12 meses</option>
          </select>
        </div>

        {/* Caminhao */}
        <div>
          <label
            htmlFor="bi-caminhao"
            className="mb-1 block text-xs font-medium text-primary-700"
          >
            Caminhao
          </label>
          <select
            id="bi-caminhao"
            value={caminhaoId}
            onChange={(e) => updateParams({ caminhaoId: e.target.value })}
            className="w-full rounded-md border border-surface-border bg-surface-card px-3 py-2 text-sm text-primary-900 focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
          >
            <option value="">Todos</option>
            {options.caminhoes.map((c) => (
              <option key={c.id} value={c.id}>
                {c.placa} - {c.modelo}
              </option>
            ))}
          </select>
        </div>

        {/* Motorista */}
        <div>
          <label
            htmlFor="bi-motorista"
            className="mb-1 block text-xs font-medium text-primary-700"
          >
            Motorista
          </label>
          <select
            id="bi-motorista"
            value={motoristaId}
            onChange={(e) => updateParams({ motoristaId: e.target.value })}
            className="w-full rounded-md border border-surface-border bg-surface-card px-3 py-2 text-sm text-primary-900 focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
          >
            <option value="">Todos</option>
            {options.motoristas.map((m) => (
              <option key={m.id} value={m.id}>
                {m.nome}
              </option>
            ))}
          </select>
        </div>

        {/* Categoria */}
        <div>
          <label
            htmlFor="bi-categoria"
            className="mb-1 block text-xs font-medium text-primary-700"
          >
            Categoria
          </label>
          <select
            id="bi-categoria"
            value={categoriaId}
            onChange={(e) => updateParams({ categoriaId: e.target.value })}
            className="w-full rounded-md border border-surface-border bg-surface-card px-3 py-2 text-sm text-primary-900 focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
          >
            <option value="">Todas</option>
            {options.categorias.map((c) => (
              <option key={c.id} value={c.id}>
                {c.nome}
              </option>
            ))}
          </select>
        </div>
      </div>

      {isPending && (
        <div className="mt-2 text-xs text-primary-500">Carregando...</div>
      )}
    </div>
  );
}
