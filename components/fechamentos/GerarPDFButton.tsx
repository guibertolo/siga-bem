/**
 * Client component: "Gerar PDF" button with loading state.
 * Story 4.2 — AC1, AC3, AC4
 *
 * Fetches complete fechamento data via server action,
 * then delegates to useFechamentoPDF hook for generation.
 */
'use client';

import { useState, useCallback } from 'react';
import { useFechamentoPDF } from '@/hooks/use-fechamento-pdf';
import { getFechamentoCompleto } from '@/app/(dashboard)/fechamentos/[id]/actions';

interface GerarPDFButtonProps {
  fechamentoId: string;
}

export function GerarPDFButton({ fechamentoId }: GerarPDFButtonProps) {
  const { gerarPDF, isLoading: isPdfLoading } = useFechamentoPDF();
  const [isFetching, setIsFetching] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isLoading = isFetching || isPdfLoading;

  const handleClick = useCallback(async () => {
    setError(null);
    setIsFetching(true);

    try {
      const result = await getFechamentoCompleto(fechamentoId);

      if (!result.success || !result.data) {
        setError(result.error ?? 'Erro ao buscar dados do fechamento');
        setIsFetching(false);
        return;
      }

      setIsFetching(false);
      await gerarPDF(result.data);
    } catch (err) {
      const message =
        err instanceof Error ? err.message : 'Erro inesperado ao gerar PDF';
      setError(message);
      setIsFetching(false);
    }
  }, [fechamentoId, gerarPDF]);

  return (
    <div>
      <button
        type="button"
        onClick={handleClick}
        disabled={isLoading}
        className="inline-flex items-center gap-2 rounded-lg bg-primary-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {isLoading ? (
          <>
            <svg
              className="h-4 w-4 animate-spin"
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
            >
              <circle
                className="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="4"
              />
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
              />
            </svg>
            Gerando PDF...
          </>
        ) : (
          <>
            <svg
              className="h-4 w-4"
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={1.5}
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m.75 12 3 3m0 0 3-3m-3 3v-6m-1.5-9H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9Z"
              />
            </svg>
            Gerar PDF
          </>
        )}
      </button>
      {error && (
        <p className="mt-2 text-sm text-red-600">{error}</p>
      )}
    </div>
  );
}
