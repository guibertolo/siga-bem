/**
 * Validates a Brazilian CPF using the standard modulo-11 algorithm.
 * Accepts both formatted (000.000.000-00) and raw digits (00000000000).
 *
 * @param cpf - The CPF string to validate
 * @returns true if the CPF is valid, false otherwise
 */
export function validateCPF(cpf: string): boolean {
  const digits = cpf.replace(/\D/g, '');

  if (digits.length !== 11) {
    return false;
  }

  // Reject known invalid patterns (all same digits)
  if (/^(\d)\1{10}$/.test(digits)) {
    return false;
  }

  // Validate first check digit
  let sum = 0;
  for (let i = 0; i < 9; i++) {
    sum += parseInt(digits[i], 10) * (10 - i);
  }
  let remainder = (sum * 10) % 11;
  if (remainder === 10) remainder = 0;

  if (parseInt(digits[9], 10) !== remainder) {
    return false;
  }

  // Validate second check digit
  sum = 0;
  for (let i = 0; i < 10; i++) {
    sum += parseInt(digits[i], 10) * (11 - i);
  }
  remainder = (sum * 10) % 11;
  if (remainder === 10) remainder = 0;

  if (parseInt(digits[10], 10) !== remainder) {
    return false;
  }

  return true;
}

/**
 * Formats a CPF string with mask: XXX.XXX.XXX-XX
 *
 * @param cpf - Raw or partially formatted CPF
 * @returns Formatted CPF or the original string if not 11 digits
 */
export function formatCPF(cpf: string): string {
  const digits = cpf.replace(/\D/g, '');
  if (digits.length !== 11) {
    return cpf;
  }
  return `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6, 9)}-${digits.slice(9, 11)}`;
}

/**
 * Strips formatting from a CPF, returning only digits.
 *
 * @param cpf - Formatted CPF
 * @returns Raw digits string
 */
export function stripCPF(cpf: string): string {
  return cpf.replace(/\D/g, '');
}

/**
 * Applies CPF mask progressively as user types.
 *
 * @param value - Current input value
 * @returns Masked value
 */
export function maskCPF(value: string): string {
  const digits = value.replace(/\D/g, '').slice(0, 11);

  if (digits.length <= 3) return digits;
  if (digits.length <= 6) return `${digits.slice(0, 3)}.${digits.slice(3)}`;
  if (digits.length <= 9) return `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6)}`;
  return `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6, 9)}-${digits.slice(9)}`;
}

/**
 * Checks if a CNH expiration date is within N days from now.
 *
 * @param cnhValidade - CNH expiration date string (YYYY-MM-DD)
 * @param days - Number of days threshold (default 30)
 * @returns true if CNH expires within the given days
 */
export function isCnhExpiringSoon(cnhValidade: string, days = 30): boolean {
  const expirationDate = new Date(cnhValidade);
  const now = new Date();
  const threshold = new Date();
  threshold.setDate(now.getDate() + days);
  return expirationDate <= threshold && expirationDate >= now;
}

/**
 * Checks if a CNH has already expired.
 *
 * @param cnhValidade - CNH expiration date string (YYYY-MM-DD)
 * @returns true if CNH is expired
 */
export function isCnhExpired(cnhValidade: string): boolean {
  const expirationDate = new Date(cnhValidade);
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  return expirationDate < now;
}
