/**
 * Date formatting utilities for pt-BR locale.
 * Story 4.2 — Relatorio e Impressao PDF
 */

/**
 * Format an ISO date string to pt-BR display format.
 *
 * @param dateStr - ISO date string (YYYY-MM-DD or ISO 8601)
 * @returns Formatted date string (e.g., "28/03/2026")
 */
export function formatarData(dateStr: string): string {
  const date = new Date(dateStr + 'T00:00:00');
  return date.toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
}

/**
 * Format an ISO date string to a long pt-BR format.
 *
 * @param dateStr - ISO date string
 * @returns Formatted date (e.g., "28 de marco de 2026")
 */
export function formatarDataLonga(dateStr: string): string {
  const date = new Date(dateStr + 'T00:00:00');
  return date.toLocaleDateString('pt-BR', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}
