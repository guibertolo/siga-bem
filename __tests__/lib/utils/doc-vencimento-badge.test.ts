import { getDocBadgeInfo } from '@/lib/utils/doc-vencimento-badge';

describe('getDocBadgeInfo', () => {
  // Fixed reference date for all tests: 2026-04-14
  const today = new Date(2026, 3, 14); // April 14, 2026

  it('returns null when doc_vencimento is null', () => {
    expect(getDocBadgeInfo(null, today)).toBeNull();
  });

  it('returns null when doc_vencimento is empty string', () => {
    expect(getDocBadgeInfo('', today)).toBeNull();
  });

  it('returns null for invalid date string', () => {
    expect(getDocBadgeInfo('invalid-date', today)).toBeNull();
  });

  it('returns "vencido" when date is in the past', () => {
    const result = getDocBadgeInfo('2026-04-13', today);
    expect(result).not.toBeNull();
    expect(result!.level).toBe('vencido');
    expect(result!.label).toBe('Vencido');
    expect(result!.bgClass).toBe('bg-badge-danger-bg');
    expect(result!.fgClass).toBe('text-badge-danger-fg');
  });

  it('returns "vencido" when date is far in the past', () => {
    const result = getDocBadgeInfo('2025-01-01', today);
    expect(result!.level).toBe('vencido');
  });

  it('returns "vencendo" when date is today (0 days)', () => {
    const result = getDocBadgeInfo('2026-04-14', today);
    expect(result).not.toBeNull();
    expect(result!.level).toBe('vencendo');
    expect(result!.label).toBe('Vence em 0d');
    expect(result!.bgClass).toBe('bg-badge-warning-bg');
  });

  it('returns "vencendo" when date is within 30 days', () => {
    const result = getDocBadgeInfo('2026-05-10', today);
    expect(result).not.toBeNull();
    expect(result!.level).toBe('vencendo');
    expect(result!.bgClass).toBe('bg-badge-warning-bg');
  });

  it('returns "vencendo" when date is exactly 30 days from today', () => {
    const result = getDocBadgeInfo('2026-05-14', today);
    expect(result).not.toBeNull();
    expect(result!.level).toBe('vencendo');
    expect(result!.label).toBe('Vence em 30d');
  });

  it('returns "ok" when date is more than 30 days away', () => {
    const result = getDocBadgeInfo('2026-05-15', today);
    expect(result).not.toBeNull();
    expect(result!.level).toBe('ok');
    expect(result!.label).toBe('Em dia');
    expect(result!.bgClass).toBe('bg-badge-success-bg');
    expect(result!.fgClass).toBe('text-badge-success-fg');
  });

  it('returns "ok" when date is far in the future', () => {
    const result = getDocBadgeInfo('2027-12-31', today);
    expect(result!.level).toBe('ok');
  });

  it('uses current date when today param is not provided', () => {
    // Date far in the future should always be "ok" regardless of current date
    const result = getDocBadgeInfo('2099-12-31');
    expect(result).not.toBeNull();
    expect(result!.level).toBe('ok');
  });
});
