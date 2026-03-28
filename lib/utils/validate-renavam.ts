/**
 * Validates RENAVAM (Registro Nacional de Veiculos Automotores).
 *
 * RENAVAM has 11 digits. The last digit is a check digit calculated
 * using weights [3,2,9,8,7,6,5,4,3,2] applied to the first 10 digits,
 * sum modulo 11. If remainder is >= 10, check digit is 0.
 *
 * Field is optional (VARCHAR 20). When provided, validation is applied.
 */

const RENAVAM_WEIGHTS = [3, 2, 9, 8, 7, 6, 5, 4, 3, 2] as const;

/**
 * Strips non-digit characters from a RENAVAM string.
 */
export function stripRenavam(renavam: string): string {
  return renavam.replace(/\D/g, '');
}

/**
 * Validates a RENAVAM check digit.
 * Returns true if:
 * - The input is empty (field is optional)
 * - The input has 11 digits with a valid check digit
 *
 * Returns false if the input has digits but is invalid.
 */
export function validateRenavam(renavam: string): boolean {
  const digits = stripRenavam(renavam);

  // Empty is valid (field is optional)
  if (digits.length === 0) return true;

  // Must be exactly 11 digits
  if (digits.length !== 11) return false;

  // All zeros is invalid
  if (/^0+$/.test(digits)) return false;

  // Calculate check digit
  let sum = 0;
  for (let i = 0; i < 10; i++) {
    sum += parseInt(digits[i], 10) * RENAVAM_WEIGHTS[i];
  }

  const remainder = (sum * 10) % 11;
  const checkDigit = remainder >= 10 ? 0 : remainder;

  return checkDigit === parseInt(digits[10], 10);
}
