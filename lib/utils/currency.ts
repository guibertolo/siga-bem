/**
 * Currency conversion utilities for centavos <-> BRL.
 *
 * CRITICAL (CON-003): All monetary values stored as INTEGER centavos.
 * These functions handle the UI (BRL float) <-> DB (centavos integer) conversion.
 */

/**
 * Convert a BRL value (e.g., 150.50) to centavos (15050).
 * Uses Math.round() to avoid floating point precision issues.
 *
 * @param brl - Value in BRL (e.g., 150.50)
 * @returns Integer centavos (e.g., 15050)
 */
export function brlToCentavos(brl: number): number {
  return Math.round(brl * 100);
}

/**
 * Convert centavos (e.g., 15050) to BRL value (150.50).
 *
 * @param centavos - Integer centavos (e.g., 15050)
 * @returns BRL value (e.g., 150.50)
 */
export function centavosToBrl(centavos: number): number {
  return centavos / 100;
}

/**
 * Format centavos as a BRL currency string for display.
 * Uses Intl.NumberFormat for proper pt-BR locale formatting.
 *
 * @param centavos - Integer centavos (e.g., 15000)
 * @returns Formatted string (e.g., "R$ 150,00")
 */
export function formatBRL(centavos: number): string {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(centavos / 100);
}

/**
 * Parse a BRL string input (from UI) to centavos.
 * Handles both dot and comma as decimal separators.
 * Strips "R$", spaces, and thousand separators.
 *
 * @param input - User input string (e.g., "1.500,50" or "1500.50" or "R$ 150,00")
 * @returns Integer centavos, or null if invalid
 */
export function parseBrlInputToCentavos(input: string): number | null {
  // Strip R$, spaces
  let cleaned = input.replace(/R\$\s*/g, '').trim();

  if (cleaned === '') return null;

  // Detect format: if has both dot and comma, the last one is decimal separator
  const lastDot = cleaned.lastIndexOf('.');
  const lastComma = cleaned.lastIndexOf(',');

  if (lastComma > lastDot) {
    // Brazilian format: 1.500,50 -> remove dots, replace comma with dot
    cleaned = cleaned.replace(/\./g, '').replace(',', '.');
  } else if (lastDot > lastComma) {
    // Already dot-decimal: 1,500.50 -> remove commas
    cleaned = cleaned.replace(/,/g, '');
  }

  const value = parseFloat(cleaned);
  if (isNaN(value) || value < 0) return null;

  return Math.round(value * 100);
}
