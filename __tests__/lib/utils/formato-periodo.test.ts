import { formatarRangeCurto } from '@/lib/utils/formato-periodo';

describe('formatarRangeCurto', () => {
  it('formats range within same month', () => {
    const inicio = new Date(2026, 3, 1); // April 1
    const fim = new Date(2026, 3, 30); // April 30
    expect(formatarRangeCurto(inicio, fim)).toBe('1/04 - 30/04');
  });

  it('formats range across months', () => {
    const inicio = new Date(2026, 1, 1); // Feb 1
    const fim = new Date(2026, 3, 30); // April 30
    expect(formatarRangeCurto(inicio, fim)).toBe('1/02 - 30/04');
  });

  it('formats single day range', () => {
    const date = new Date(2026, 0, 15); // Jan 15
    expect(formatarRangeCurto(date, date)).toBe('15/01 - 15/01');
  });

  it('pads month with leading zero', () => {
    const inicio = new Date(2026, 0, 5); // Jan 5
    const fim = new Date(2026, 0, 31); // Jan 31
    expect(formatarRangeCurto(inicio, fim)).toBe('5/01 - 31/01');
  });
});
