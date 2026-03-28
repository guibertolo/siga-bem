import {
  brlToCentavos,
  centavosToBrl,
  formatBRL,
  parseBrlInputToCentavos,
} from '@/lib/utils/currency';

describe('brlToCentavos', () => {
  it('converts whole BRL to centavos', () => {
    expect(brlToCentavos(150)).toBe(15000);
  });

  it('converts BRL with cents to centavos', () => {
    expect(brlToCentavos(150.50)).toBe(15050);
  });

  it('converts zero', () => {
    expect(brlToCentavos(0)).toBe(0);
  });

  it('handles floating point precision with Math.round', () => {
    // 19.99 * 100 = 1998.9999999999998 in IEEE 754
    expect(brlToCentavos(19.99)).toBe(1999);
  });

  it('handles 0.01 (one centavo)', () => {
    expect(brlToCentavos(0.01)).toBe(1);
  });

  it('handles large values', () => {
    expect(brlToCentavos(99999.99)).toBe(9999999);
  });
});

describe('centavosToBrl', () => {
  it('converts centavos to BRL', () => {
    expect(centavosToBrl(15000)).toBe(150);
  });

  it('converts centavos with decimal to BRL', () => {
    expect(centavosToBrl(15050)).toBe(150.50);
  });

  it('converts one centavo', () => {
    expect(centavosToBrl(1)).toBe(0.01);
  });

  it('converts zero', () => {
    expect(centavosToBrl(0)).toBe(0);
  });
});

describe('formatBRL', () => {
  it('formats centavos as BRL currency string', () => {
    expect(formatBRL(15000)).toBe('R$\u00a0150,00');
  });

  it('formats zero', () => {
    expect(formatBRL(0)).toBe('R$\u00a00,00');
  });

  it('formats one centavo', () => {
    expect(formatBRL(1)).toBe('R$\u00a00,01');
  });

  it('formats large value with thousands separator', () => {
    const result = formatBRL(1500000);
    // Should contain "15.000,00" or "15,000.00" depending on locale
    expect(result).toContain('15.000,00');
  });
});

describe('parseBrlInputToCentavos', () => {
  it('parses simple number', () => {
    expect(parseBrlInputToCentavos('150')).toBe(15000);
  });

  it('parses number with dot decimal', () => {
    expect(parseBrlInputToCentavos('150.50')).toBe(15050);
  });

  it('parses number with comma decimal (Brazilian format)', () => {
    expect(parseBrlInputToCentavos('150,50')).toBe(15050);
  });

  it('parses Brazilian format with thousand separator', () => {
    expect(parseBrlInputToCentavos('1.500,50')).toBe(150050);
  });

  it('parses US format with thousand separator', () => {
    expect(parseBrlInputToCentavos('1,500.50')).toBe(150050);
  });

  it('strips R$ prefix', () => {
    expect(parseBrlInputToCentavos('R$ 150,00')).toBe(15000);
  });

  it('strips R$ prefix without space', () => {
    expect(parseBrlInputToCentavos('R$150,00')).toBe(15000);
  });

  it('returns null for empty string', () => {
    expect(parseBrlInputToCentavos('')).toBeNull();
  });

  it('returns null for negative values', () => {
    expect(parseBrlInputToCentavos('-10')).toBeNull();
  });

  it('returns null for non-numeric input', () => {
    expect(parseBrlInputToCentavos('abc')).toBeNull();
  });

  it('handles floating point precision correctly', () => {
    // 19.99 should be 1999 centavos, not 1998
    expect(parseBrlInputToCentavos('19,99')).toBe(1999);
    expect(parseBrlInputToCentavos('19.99')).toBe(1999);
  });

  it('parses zero as zero centavos', () => {
    expect(parseBrlInputToCentavos('0')).toBe(0);
  });
});
