/**
 * Validates and normalizes Brazilian vehicle license plates.
 *
 * Accepted formats:
 * - Mercosul: ABC1D23 (3 letters + 1 digit + 1 letter + 2 digits)
 * - Antigo: ABC1234 (3 letters + 4 digits)
 *
 * Input may contain hyphens or spaces; they are stripped before validation.
 */

const MERCOSUL_REGEX = /^[A-Z]{3}[0-9][A-Z][0-9]{2}$/;
const ANTIGO_REGEX = /^[A-Z]{3}[0-9]{4}$/;

/**
 * Strips hyphens, spaces, and converts to uppercase.
 */
export function normalizePlaca(placa: string): string {
  return placa.replace(/[-\s]/g, '').toUpperCase();
}

/**
 * Validates a placa string against Mercosul and antigo formats.
 * Returns true if the normalized placa matches either format.
 */
export function validatePlaca(placa: string): boolean {
  const normalized = normalizePlaca(placa);
  if (normalized.length !== 7) return false;
  return MERCOSUL_REGEX.test(normalized) || ANTIGO_REGEX.test(normalized);
}

/**
 * Applies a visual mask to a placa for display.
 * - Antigo format: ABC-1234
 * - Mercosul format: ABC1D23 (no separator)
 */
export function maskPlaca(input: string): string {
  const raw = input.replace(/[^A-Za-z0-9]/g, '').toUpperCase();
  if (raw.length <= 3) return raw;
  if (raw.length <= 7) {
    // Check if 4th char is digit and 5th is letter (Mercosul) — no dash
    if (raw.length >= 5 && /[0-9]/.test(raw[3]) && /[A-Z]/.test(raw[4])) {
      return raw;
    }
    // Antigo format: add dash after 3 letters
    if (/[0-9]/.test(raw[3])) {
      return raw.slice(0, 3) + '-' + raw.slice(3);
    }
    return raw;
  }
  return maskPlaca(raw.slice(0, 7));
}
