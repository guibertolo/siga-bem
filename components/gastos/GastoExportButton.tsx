'use client';

import { useState, useTransition } from 'react';
import { exportGastosCsv } from '@/app/(dashboard)/gastos/actions';
import type { GastoFilters } from '@/types/gasto';

interface GastoExportButtonProps {
  filters: GastoFilters;
}

export function GastoExportButton({ filters }: GastoExportButtonProps) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function handleExport() {
    setError(null);
    startTransition(async () => {
      const result = await exportGastosCsv(filters);

      if (result.error) {
        setError(result.error);
        return;
      }

      if (result.csv) {
        downloadCsv(result.csv);
      }
    });
  }

  return (
    <div>
      <button
        type="button"
        onClick={handleExport}
        disabled={isPending}
        className="rounded-lg border border-surface-border bg-surface-card px-4 py-2 text-sm font-medium text-primary-700 transition-colors hover:bg-surface-muted disabled:opacity-50"
      >
        {isPending ? 'Exportando...' : 'Exportar CSV'}
      </button>
      {error && (
        <p className="mt-1 text-xs text-red-600">{error}</p>
      )}
    </div>
  );
}

function downloadCsv(csv: string) {
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;

  const today = new Date().toISOString().slice(0, 10);
  link.download = `gastos-${today}.csv`;

  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
