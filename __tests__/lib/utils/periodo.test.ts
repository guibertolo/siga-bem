import {
  rangeEsteMes,
  rangeMesPassado,
  rangeUltimos3Meses,
  calcularRangeMensal,
} from '@/lib/utils/periodo';

describe('rangeEsteMes', () => {
  it('returns inicio as first day of current month', () => {
    const result = rangeEsteMes();
    const now = new Date();
    const expectedInicio = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`;
    expect(result.inicio).toBe(expectedInicio);
  });

  it('returns fim as last day of current month', () => {
    const result = rangeEsteMes();
    const now = new Date();
    const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
    const expectedFim = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;
    expect(result.fim).toBe(expectedFim);
  });
});

describe('rangeMesPassado', () => {
  it('returns range for previous month', () => {
    const result = rangeMesPassado();
    const now = new Date();
    const prev = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const expectedInicio = `${prev.getFullYear()}-${String(prev.getMonth() + 1).padStart(2, '0')}-01`;
    expect(result.inicio).toBe(expectedInicio);
  });

  it('returns correct last day of previous month', () => {
    const result = rangeMesPassado();
    const now = new Date();
    const lastDayPrev = new Date(now.getFullYear(), now.getMonth(), 0).getDate();
    expect(result.fim).toContain(String(lastDayPrev).padStart(2, '0'));
  });
});

describe('rangeUltimos3Meses', () => {
  it('returns inicio as first day of 3 months ago', () => {
    const result = rangeUltimos3Meses();
    const now = new Date();
    const threeAgo = new Date(now.getFullYear(), now.getMonth() - 2, 1);
    const expectedInicio = `${threeAgo.getFullYear()}-${String(threeAgo.getMonth() + 1).padStart(2, '0')}-01`;
    expect(result.inicio).toBe(expectedInicio);
  });

  it('returns fim as last day of current month', () => {
    const result = rangeUltimos3Meses();
    const esteMes = rangeEsteMes();
    expect(result.fim).toBe(esteMes.fim);
  });

  it('covers at least 3 months', () => {
    const result = rangeUltimos3Meses();
    const inicio = new Date(result.inicio + 'T12:00:00');
    const fim = new Date(result.fim + 'T12:00:00');
    const diffMonths = (fim.getFullYear() - inicio.getFullYear()) * 12 + (fim.getMonth() - inicio.getMonth());
    expect(diffMonths).toBeGreaterThanOrEqual(2);
  });
});

describe('calcularRangeMensal (existing)', () => {
  it('returns correct range for March 2026', () => {
    const result = calcularRangeMensal(2026, 3);
    expect(result.inicio).toBe('2026-03-01');
    expect(result.fim).toBe('2026-03-31');
  });

  it('returns correct range for February 2024 (leap year)', () => {
    const result = calcularRangeMensal(2024, 2);
    expect(result.inicio).toBe('2024-02-01');
    expect(result.fim).toBe('2024-02-29');
  });
});
