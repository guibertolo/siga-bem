/**
 * Tests for LGPD CPF masking utility.
 * Story 4.2 — AC5 (NFR-009)
 */

import { mascararCpf } from '@/lib/utils/lgpd';

describe('mascararCpf', () => {
  it('masks formatted CPF showing last 5 digits visible', () => {
    // digits[6..10] visible: ***.***.*789-01
    expect(mascararCpf('123.456.789-01')).toBe('***.***.*789-01');
  });

  it('masks raw digits CPF showing last 5 digits visible', () => {
    expect(mascararCpf('12345678901')).toBe('***.***.*789-01');
  });

  it('handles different CPF values', () => {
    expect(mascararCpf('000.000.000-00')).toBe('***.***.*000-00');
    expect(mascararCpf('999.999.999-99')).toBe('***.***.*999-99');
  });

  it('returns fully masked for invalid length CPF', () => {
    // Less than 11 digits: all digits masked
    expect(mascararCpf('123.456')).toBe('***.***');
  });

  it('handles empty string gracefully', () => {
    const result = mascararCpf('');
    expect(result).toBe('');
  });

  it('masks CPF with spaces or other separators', () => {
    // Only digits are extracted, format rebuilt
    expect(mascararCpf('123 456 789 01')).toBe('***.***.*789-01');
  });
});
