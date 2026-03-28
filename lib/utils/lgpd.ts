/**
 * LGPD compliance utilities.
 * Story 4.2 — Relatorio e Impressao PDF (AC5, NFR-009)
 *
 * CPF masking for reports and exports to comply with
 * Brazilian General Data Protection Law (LGPD).
 */

/**
 * Mask a CPF for display in reports and PDFs.
 * Shows only the last 5 visible characters (last digit group + check digits).
 *
 * Input:  "123.456.789-01" or "12345678901"
 * Output: "***.***.*89-01"
 *
 * @param cpf - CPF string (formatted or raw digits)
 * @returns Masked CPF string
 */
export function mascararCpf(cpf: string): string {
  const digits = cpf.replace(/\D/g, '');

  if (digits.length !== 11) {
    // If invalid, mask everything except last 2
    return cpf.replace(/\d/g, '*');
  }

  // Last 5 digits visible: digits[6..10] -> *XX-XX
  return `***.***.*${digits.slice(6, 9)}-${digits.slice(9, 11)}`;
}
