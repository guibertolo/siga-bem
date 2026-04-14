import { maskDate, unmaskDate, isoToDisplay } from '@/lib/utils/mask-date';

describe('maskDate', () => {
  it('returns single digit as-is', () => {
    expect(maskDate('1')).toBe('1');
  });

  it('returns two digits as-is (day)', () => {
    expect(maskDate('15')).toBe('15');
  });

  it('inserts first slash after day', () => {
    expect(maskDate('150')).toBe('15/0');
  });

  it('formats day and month', () => {
    expect(maskDate('1504')).toBe('15/04');
  });

  it('inserts second slash after month', () => {
    expect(maskDate('15042')).toBe('15/04/2');
  });

  it('formats complete date', () => {
    expect(maskDate('15042026')).toBe('15/04/2026');
  });

  it('strips non-digit characters', () => {
    expect(maskDate('15/04/2026')).toBe('15/04/2026');
  });

  it('limits to 8 digits', () => {
    expect(maskDate('150420261')).toBe('15/04/2026');
  });

  it('handles empty string', () => {
    expect(maskDate('')).toBe('');
  });
});

describe('unmaskDate', () => {
  it('converts DD/MM/AAAA to YYYY-MM-DD', () => {
    expect(unmaskDate('15/04/2026')).toBe('2026-04-15');
  });

  it('returns ISO format as-is', () => {
    expect(unmaskDate('2026-04-15')).toBe('2026-04-15');
  });

  it('returns empty string for empty input', () => {
    expect(unmaskDate('')).toBe('');
  });

  it('returns empty string for incomplete date', () => {
    expect(unmaskDate('15/04')).toBe('');
  });
});

describe('isoToDisplay', () => {
  it('converts YYYY-MM-DD to DD/MM/AAAA', () => {
    expect(isoToDisplay('2026-04-15')).toBe('15/04/2026');
  });

  it('returns empty string for empty input', () => {
    expect(isoToDisplay('')).toBe('');
  });

  it('handles ISO with time part', () => {
    expect(isoToDisplay('2026-04-15T00:00:00')).toBe('15/04/2026');
  });
});
