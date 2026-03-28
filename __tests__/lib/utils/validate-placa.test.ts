import { validatePlaca, normalizePlaca, maskPlaca } from '@/lib/utils/validate-placa';

describe('normalizePlaca', () => {
  it('strips hyphens and spaces, uppercases', () => {
    expect(normalizePlaca('abc-1234')).toBe('ABC1234');
    expect(normalizePlaca('ABC 1D23')).toBe('ABC1D23');
    expect(normalizePlaca('abc1d23')).toBe('ABC1D23');
  });
});

describe('validatePlaca', () => {
  describe('Mercosul format (ABC1D23)', () => {
    it('accepts valid Mercosul plates', () => {
      expect(validatePlaca('ABC1D23')).toBe(true);
      expect(validatePlaca('XYZ9A00')).toBe(true);
      expect(validatePlaca('BRA2E19')).toBe(true);
    });

    it('accepts with hyphens/spaces/lowercase', () => {
      expect(validatePlaca('abc1d23')).toBe(true);
      expect(validatePlaca('ABC-1D23')).toBe(true);
    });
  });

  describe('Antigo format (ABC1234)', () => {
    it('accepts valid antigo plates', () => {
      expect(validatePlaca('ABC1234')).toBe(true);
      expect(validatePlaca('XYZ0000')).toBe(true);
    });

    it('accepts with hyphens/spaces/lowercase', () => {
      expect(validatePlaca('abc-1234')).toBe(true);
      expect(validatePlaca('abc 1234')).toBe(true);
    });
  });

  describe('invalid formats', () => {
    it('rejects empty string', () => {
      expect(validatePlaca('')).toBe(false);
    });

    it('rejects too short', () => {
      expect(validatePlaca('ABC12')).toBe(false);
    });

    it('rejects too long', () => {
      expect(validatePlaca('ABC12345')).toBe(false);
    });

    it('rejects numbers first', () => {
      expect(validatePlaca('123ABCD')).toBe(false);
    });

    it('rejects all letters', () => {
      expect(validatePlaca('ABCDEFG')).toBe(false);
    });

    it('rejects all numbers', () => {
      expect(validatePlaca('1234567')).toBe(false);
    });

    it('rejects mixed invalid patterns', () => {
      expect(validatePlaca('AB12C34')).toBe(false);
      expect(validatePlaca('ABC1DE2')).toBe(false);
    });
  });
});

describe('maskPlaca', () => {
  it('uppercases input', () => {
    expect(maskPlaca('abc')).toBe('ABC');
  });

  it('applies dash for antigo format', () => {
    expect(maskPlaca('ABC1234')).toBe('ABC-1234');
  });

  it('does not apply dash for Mercosul format', () => {
    expect(maskPlaca('ABC1D23')).toBe('ABC1D23');
  });

  it('truncates at 7 chars', () => {
    expect(maskPlaca('ABC12345678')).toBe('ABC-1234');
  });
});
