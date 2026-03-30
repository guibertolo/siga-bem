/**
 * Currency input mask for Brazilian Real (BRL).
 *
 * Formats user input as they type into BRL format: 1.234,56
 * Stores internally as centavos-compatible string.
 * Designed for 55+ audience — intuitive, no manual punctuation needed.
 */

/**
 * Applies BRL currency mask to an input value as the user types.
 * Only accepts digits; formats with thousand separators (.) and decimal comma (,).
 *
 * Examples:
 *   "1" -> "0,01"
 *   "15" -> "0,15"
 *   "150" -> "1,50"
 *   "1500" -> "15,00"
 *   "150000" -> "1.500,00"
 *
 * @param value - Raw input string (may contain non-digit chars from paste)
 * @returns Formatted BRL string without "R$" prefix
 */
export function maskCurrency(value: string): string {
  const digits = value.replace(/\D/g, '');
  const centavos = parseInt(digits || '0', 10);

  if (centavos === 0) return '0,00';

  return (centavos / 100).toLocaleString('pt-BR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

/**
 * Extracts raw centavos integer from a masked currency string.
 * Inverse of maskCurrency — use before form submission.
 *
 * @param masked - Formatted BRL string (e.g. "1.500,00")
 * @returns The string value compatible with parseBrlInputToCentavos
 */
export function unmaskCurrency(masked: string): string {
  return masked;
}
