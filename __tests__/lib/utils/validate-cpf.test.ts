import {
  validateCPF,
  formatCPF,
  stripCPF,
  maskCPF,
  isCnhExpired,
  isCnhExpiringSoon,
} from '@/lib/utils/validate-cpf';

describe('validateCPF', () => {
  it('accepts a valid CPF (formatted)', () => {
    expect(validateCPF('529.982.247-25')).toBe(true);
  });

  it('accepts a valid CPF (raw digits)', () => {
    expect(validateCPF('52998224725')).toBe(true);
  });

  it('accepts another known valid CPF', () => {
    expect(validateCPF('111.444.777-35')).toBe(true);
  });

  it('rejects CPF with wrong check digits', () => {
    expect(validateCPF('529.982.247-26')).toBe(false);
  });

  it('rejects CPF with all same digits', () => {
    expect(validateCPF('111.111.111-11')).toBe(false);
    expect(validateCPF('000.000.000-00')).toBe(false);
    expect(validateCPF('999.999.999-99')).toBe(false);
  });

  it('rejects CPF with wrong length', () => {
    expect(validateCPF('123')).toBe(false);
    expect(validateCPF('529982247259999')).toBe(false);
  });

  it('rejects empty string', () => {
    expect(validateCPF('')).toBe(false);
  });

  it('rejects CPF with invalid first check digit', () => {
    // Valid is 529.982.247-25, flip first check digit
    expect(validateCPF('529.982.247-35')).toBe(false);
  });

  it('rejects CPF with invalid second check digit', () => {
    expect(validateCPF('529.982.247-24')).toBe(false);
  });
});

describe('formatCPF', () => {
  it('formats raw digits to XXX.XXX.XXX-XX', () => {
    expect(formatCPF('52998224725')).toBe('529.982.247-25');
  });

  it('returns original string if not 11 digits', () => {
    expect(formatCPF('123')).toBe('123');
  });

  it('strips existing formatting before reformatting', () => {
    expect(formatCPF('529.982.247-25')).toBe('529.982.247-25');
  });
});

describe('stripCPF', () => {
  it('removes all non-digit characters', () => {
    expect(stripCPF('529.982.247-25')).toBe('52998224725');
  });

  it('returns same string if already raw', () => {
    expect(stripCPF('52998224725')).toBe('52998224725');
  });
});

describe('maskCPF', () => {
  it('masks progressively as digits are added', () => {
    expect(maskCPF('5')).toBe('5');
    expect(maskCPF('529')).toBe('529');
    expect(maskCPF('5299')).toBe('529.9');
    expect(maskCPF('529982')).toBe('529.982');
    expect(maskCPF('5299822')).toBe('529.982.2');
    expect(maskCPF('529982247')).toBe('529.982.247');
    expect(maskCPF('5299822472')).toBe('529.982.247-2');
    expect(maskCPF('52998224725')).toBe('529.982.247-25');
  });

  it('truncates at 11 digits', () => {
    expect(maskCPF('529982247259999')).toBe('529.982.247-25');
  });
});

describe('isCnhExpired', () => {
  it('returns true for a past date', () => {
    expect(isCnhExpired('2020-01-01')).toBe(true);
  });

  it('returns false for a future date', () => {
    const futureDate = new Date();
    futureDate.setFullYear(futureDate.getFullYear() + 1);
    expect(isCnhExpired(futureDate.toISOString().split('T')[0])).toBe(false);
  });
});

describe('isCnhExpiringSoon', () => {
  it('returns true for a date within 30 days', () => {
    const soon = new Date();
    soon.setDate(soon.getDate() + 15);
    expect(isCnhExpiringSoon(soon.toISOString().split('T')[0], 30)).toBe(true);
  });

  it('returns false for a date more than 30 days away', () => {
    const farAway = new Date();
    farAway.setDate(farAway.getDate() + 60);
    expect(isCnhExpiringSoon(farAway.toISOString().split('T')[0], 30)).toBe(false);
  });

  it('returns false for an already expired date', () => {
    expect(isCnhExpiringSoon('2020-01-01', 30)).toBe(false);
  });
});
