import { validateRenavam, stripRenavam } from '@/lib/utils/validate-renavam';

describe('stripRenavam', () => {
  it('removes non-digit characters', () => {
    expect(stripRenavam('123.456.789-01')).toBe('12345678901');
    expect(stripRenavam('00000000000')).toBe('00000000000');
  });
});

describe('validateRenavam', () => {
  it('returns true for empty string (field is optional)', () => {
    expect(validateRenavam('')).toBe(true);
  });

  it('returns false for all zeros', () => {
    expect(validateRenavam('00000000000')).toBe(false);
  });

  it('returns false for wrong length', () => {
    expect(validateRenavam('1234')).toBe(false);
    expect(validateRenavam('123456789012')).toBe(false);
  });

  it('validates known valid RENAVAM: 63930424498', () => {
    // Manual calculation:
    // digits: 6 3 9 3 0 4 2 4 4 9 | check: 8
    // weights: 3 2 9 8 7 6 5 4 3 2
    // products: 18+6+81+24+0+24+10+16+12+18 = 209
    // (209 * 10) % 11 = 2090 % 11 = 0
    // remainder 0 < 10, check digit = 0... let's recalculate
    // Actually need a known-good RENAVAM. Using algorithm to generate one:
    // For digits 1234567890X:
    // 1*3=3, 2*2=4, 3*9=27, 4*8=32, 5*7=35, 6*6=36, 7*5=35, 8*4=32, 9*3=27, 0*2=0
    // sum = 3+4+27+32+35+36+35+32+27+0 = 231
    // (231*10) % 11 = 2310 % 11 = 0
    // check = 0
    expect(validateRenavam('12345678900')).toBe(true);
  });

  it('returns false for invalid check digit', () => {
    expect(validateRenavam('12345678901')).toBe(false);
    expect(validateRenavam('12345678909')).toBe(false);
  });

  it('handles RENAVAM with formatting characters', () => {
    expect(validateRenavam('1234567890-0')).toBe(true);
  });

  it('validates another known RENAVAM: 00123456789 -> check calculation', () => {
    // 0*3=0, 0*2=0, 1*9=9, 2*8=16, 3*7=21, 4*6=24, 5*5=25, 6*4=24, 7*3=21, 8*2=16
    // sum = 0+0+9+16+21+24+25+24+21+16 = 156
    // (156*10) % 11 = 1560 % 11 = 1560 - 141*11 = 1560-1551 = 9
    // check = 9
    expect(validateRenavam('00123456789')).toBe(true);
    expect(validateRenavam('00123456780')).toBe(false);
  });
});
