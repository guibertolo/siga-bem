/**
 * Validates a Brazilian CNPJ using the standard modulo-11 algorithm.
 * Accepts both formatted (00.000.000/0000-00) and raw digits (00000000000000).
 *
 * @param cnpj - The CNPJ string to validate
 * @returns true if the CNPJ is valid, false otherwise
 */
export function validateCNPJ(cnpj: string): boolean {
  // Strip non-digits
  const digits = cnpj.replace(/\D/g, '');

  // Must be exactly 14 digits
  if (digits.length !== 14) {
    return false;
  }

  // Reject known invalid patterns (all same digits)
  if (/^(\d)\1{13}$/.test(digits)) {
    return false;
  }

  // Validate first check digit
  const weights1 = [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];
  let sum = 0;
  for (let i = 0; i < 12; i++) {
    sum += parseInt(digits[i], 10) * weights1[i];
  }
  let remainder = sum % 11;
  const checkDigit1 = remainder < 2 ? 0 : 11 - remainder;

  if (parseInt(digits[12], 10) !== checkDigit1) {
    return false;
  }

  // Validate second check digit
  const weights2 = [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];
  sum = 0;
  for (let i = 0; i < 13; i++) {
    sum += parseInt(digits[i], 10) * weights2[i];
  }
  remainder = sum % 11;
  const checkDigit2 = remainder < 2 ? 0 : 11 - remainder;

  if (parseInt(digits[13], 10) !== checkDigit2) {
    return false;
  }

  return true;
}

/**
 * Formats a CNPJ string with mask: XX.XXX.XXX/XXXX-XX
 *
 * @param cnpj - Raw or partially formatted CNPJ
 * @returns Formatted CNPJ or the original string if not 14 digits
 */
export function formatCNPJ(cnpj: string): string {
  const digits = cnpj.replace(/\D/g, '');
  if (digits.length !== 14) {
    return cnpj;
  }
  return `${digits.slice(0, 2)}.${digits.slice(2, 5)}.${digits.slice(5, 8)}/${digits.slice(8, 12)}-${digits.slice(12, 14)}`;
}

/**
 * Strips formatting from a CNPJ, returning only digits.
 *
 * @param cnpj - Formatted CNPJ
 * @returns Raw digits string
 */
export function stripCNPJ(cnpj: string): string {
  return cnpj.replace(/\D/g, '');
}

/**
 * Applies CNPJ mask progressively as user types.
 *
 * @param value - Current input value
 * @returns Masked value
 */
export function maskCNPJ(value: string): string {
  const digits = value.replace(/\D/g, '').slice(0, 14);

  if (digits.length <= 2) return digits;
  if (digits.length <= 5) return `${digits.slice(0, 2)}.${digits.slice(2)}`;
  if (digits.length <= 8) return `${digits.slice(0, 2)}.${digits.slice(2, 5)}.${digits.slice(5)}`;
  if (digits.length <= 12) return `${digits.slice(0, 2)}.${digits.slice(2, 5)}.${digits.slice(5, 8)}/${digits.slice(8)}`;
  return `${digits.slice(0, 2)}.${digits.slice(2, 5)}.${digits.slice(5, 8)}/${digits.slice(8, 12)}-${digits.slice(12)}`;
}

/**
 * Applies phone mask progressively: (00) 00000-0000 or (00) 0000-0000
 *
 * @param value - Current input value
 * @returns Masked value
 */
export function maskPhone(value: string): string {
  const digits = value.replace(/\D/g, '').slice(0, 11);

  if (digits.length <= 2) return digits.length ? `(${digits}` : '';
  if (digits.length <= 6) return `(${digits.slice(0, 2)}) ${digits.slice(2)}`;
  if (digits.length <= 10) return `(${digits.slice(0, 2)}) ${digits.slice(2, 6)}-${digits.slice(6)}`;
  return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`;
}

/**
 * Applies CEP mask: 00000-000
 *
 * @param value - Current input value
 * @returns Masked value
 */
export function maskCEP(value: string): string {
  const digits = value.replace(/\D/g, '').slice(0, 8);

  if (digits.length <= 5) return digits;
  return `${digits.slice(0, 5)}-${digits.slice(5)}`;
}
