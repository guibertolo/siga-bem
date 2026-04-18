/**
 * Date input mask for DD/MM/AAAA format.
 *
 * Designed for 55+ audience: auto-inserts slashes as user types digits.
 * Only accepts digits, formats progressively.
 *
 * Examples:
 *   "1" -> "1"
 *   "15" -> "15"
 *   "150" -> "15/0"
 *   "1504" -> "15/04"
 *   "15042" -> "15/04/2"
 *   "15042026" -> "15/04/2026"
 */

/**
 * Applies DD/MM/AAAA mask to input value as user types.
 *
 * @param value - Raw input string
 * @returns Formatted date string with slashes
 */
export function maskDate(value: string): string {
  const digits = value.replace(/\D/g, '').slice(0, 8);

  if (digits.length <= 2) return digits;
  if (digits.length <= 4) return `${digits.slice(0, 2)}/${digits.slice(2)}`;
  return `${digits.slice(0, 2)}/${digits.slice(2, 4)}/${digits.slice(4)}`;
}

/**
 * Converts DD/MM/AAAA to YYYY-MM-DD for database storage.
 *
 * @param masked - Date string in DD/MM/AAAA format
 * @returns ISO date string (YYYY-MM-DD) or empty string if invalid
 */
export function unmaskDate(masked: string): string {
  if (!masked) return '';
  // Already ISO format
  if (/^\d{4}-\d{2}-\d{2}$/.test(masked)) return masked;

  const match = masked.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  if (!match) return '';

  return `${match[3]}-${match[2]}-${match[1]}`;
}

/**
 * Converts YYYY-MM-DD (ISO) to DD/MM/AAAA for display.
 *
 * @param iso - ISO date string (YYYY-MM-DD)
 * @returns Date in DD/MM/AAAA format
 */
export function isoToDisplay(iso: string): string {
  if (!iso) return '';
  const match = iso.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (!match) return '';
  return `${match[3]}/${match[2]}/${match[1]}`;
}
