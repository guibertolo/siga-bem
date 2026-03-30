/**
 * Odometer/KM input mask.
 *
 * Formats km values with thousand separators for readability.
 * Target audience: 55+ truckers who deal with large odometer numbers.
 *
 * Examples:
 *   "1250" -> "1.250"
 *   "320450" -> "320.450"
 *   "1000000" -> "1.000.000"
 */

/**
 * Applies thousand-separator mask to a KM/odometer input value.
 * Only accepts digits.
 *
 * @param value - Raw input string
 * @returns Formatted string with dots as thousand separators
 */
export function maskKm(value: string): string {
  const digits = value.replace(/\D/g, '');

  if (digits === '') return '';

  const num = parseInt(digits, 10);
  if (isNaN(num)) return '';

  return num.toLocaleString('pt-BR');
}

/**
 * Removes mask from KM string, returning raw digits.
 * Use before form submission.
 *
 * @param masked - Formatted KM string (e.g. "320.450")
 * @returns Raw numeric string (e.g. "320450")
 */
export function unmaskKm(masked: string): string {
  return masked.replace(/\D/g, '');
}
