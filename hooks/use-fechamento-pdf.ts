/**
 * Hook for generating Fechamento PDF reports.
 * Story 4.2 — Relatorio e Impressao de Fechamento (PDF)
 *
 * Manages PDF generation state (idle/loading/error).
 * Uses dynamic import for @react-pdf/renderer (client-only).
 * Cleans up object URLs on unmount to prevent memory leaks.
 *
 * AC1: Generates PDF and opens in new tab
 * AC3: Loading state while generating (< 5s for 100 items)
 * AC4: Download with descriptive filename
 */
'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import type { FechamentoCompleto } from '@/types/fechamento';

type PdfStatus = 'idle' | 'loading' | 'error';

interface UseFechamentoPDFReturn {
  gerarPDF: (dados: FechamentoCompleto) => Promise<void>;
  isLoading: boolean;
  error: string | null;
}

/**
 * Build a sanitized filename for the PDF download.
 * Format: fechamento-{nome-motorista}-{periodo_inicio}.pdf
 */
function buildFilename(dados: FechamentoCompleto): string {
  const nomeSanitized = dados.motorista.nome
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, '-')
    .toLowerCase();
  return `fechamento-${nomeSanitized}-${dados.periodo_inicio}.pdf`;
}

export function useFechamentoPDF(): UseFechamentoPDFReturn {
  const [status, setStatus] = useState<PdfStatus>('idle');
  const [error, setError] = useState<string | null>(null);
  const objectUrlRef = useRef<string | null>(null);

  // Cleanup object URL on unmount
  useEffect(() => {
    return () => {
      if (objectUrlRef.current) {
        URL.revokeObjectURL(objectUrlRef.current);
      }
    };
  }, []);

  const gerarPDF = useCallback(async (dados: FechamentoCompleto) => {
    setStatus('loading');
    setError(null);

    // Revoke previous URL if any
    if (objectUrlRef.current) {
      URL.revokeObjectURL(objectUrlRef.current);
      objectUrlRef.current = null;
    }

    try {
      // Dynamic import to avoid SSR issues
      const [{ pdf }, { FechamentoPDFDocument }] = await Promise.all([
        import('@react-pdf/renderer'),
        import('@/components/fechamentos/FechamentoPDF'),
      ]);

      const blob = await pdf(
        FechamentoPDFDocument({ fechamento: dados }),
      ).toBlob();

      const url = URL.createObjectURL(blob);
      objectUrlRef.current = url;

      // Create hidden link for download
      const link = document.createElement('a');
      link.href = url;
      link.download = buildFilename(dados);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      setStatus('idle');
    } catch (err) {
      const message =
        err instanceof Error ? err.message : 'Erro ao gerar PDF';
      setError(message);
      setStatus('error');
    }
  }, []);

  return {
    gerarPDF,
    isLoading: status === 'loading',
    error,
  };
}
