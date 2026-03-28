/**
 * CPF masking utility for LGPD compliance.
 * Story 4.3 — AC8: CPF mascarado na exportacao e exibicao.
 *
 * Masks CPF to show only first 3 and last 2 digits:
 *   "123.456.789-00" -> "123.***.***-00"
 *   "12345678900"    -> "123.***.***-00"
 */

/**
 * Mask a CPF for LGPD-compliant display.
 * Shows first 3 digits and last 2 digits, masking the middle.
 *
 * @param cpf - CPF in any format (formatted or raw digits)
 * @returns Masked CPF string: "123.***.***-00"
 */
export function mascararCpf(cpf: string): string {
  const digits = cpf.replace(/\D/g, '');

  if (digits.length !== 11) {
    return cpf; // Return as-is if not a valid CPF length
  }

  const first3 = digits.slice(0, 3);
  const last2 = digits.slice(9, 11);

  return `${first3}.***.***-${last2}`;
}
