/**
 * Tests for date formatting utilities.
 * Story 4.2 — Date display in PDF report
 */

import { formatarData, formatarDataLonga } from '@/lib/utils/format-date';

describe('formatarData', () => {
  it('formats ISO date to pt-BR short format', () => {
    expect(formatarData('2026-03-28')).toBe('28/03/2026');
  });

  it('formats single-digit day and month with leading zeros', () => {
    expect(formatarData('2026-01-05')).toBe('05/01/2026');
  });

  it('formats end-of-year date', () => {
    expect(formatarData('2026-12-31')).toBe('31/12/2026');
  });
});

describe('formatarDataLonga', () => {
  it('formats ISO date to pt-BR long format', () => {
    const result = formatarDataLonga('2026-03-28');
    // Locale-dependent but should contain day, month name, year
    expect(result).toContain('2026');
    expect(result).toContain('28');
  });
});
