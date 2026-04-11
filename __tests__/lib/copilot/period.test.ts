/**
 * Tests for Assistente FrotaViva period parser.
 * Story 9.2 AC-5.
 */

import { parsePeriod } from '@/lib/copilot/utils/period';

describe('parsePeriod', () => {
  describe('explicit cases', () => {
    it('returns a single-day range for "hoje"', () => {
      const r = parsePeriod('hoje');
      expect(r.startDate).toBe(r.endDate);
      expect(r.label).toBe('hoje');
      expect(r.startDate).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    });

    it('returns a single-day range for "ontem"', () => {
      const r = parsePeriod('ontem');
      expect(r.startDate).toBe(r.endDate);
      expect(r.label).toBe('ontem');
    });

    it('parses "este mes" as month-to-date', () => {
      const r = parsePeriod('este mes');
      expect(r.startDate.endsWith('-01')).toBe(true);
      expect(r.label).toBe('este mes');
      expect(r.startDate <= r.endDate).toBe(true);
    });

    it('parses "mes passado" as full previous month', () => {
      const r = parsePeriod('mes passado');
      expect(r.startDate.endsWith('-01')).toBe(true);
      expect(r.label).toBe('mes passado');
      const startDay = Number(r.startDate.slice(-2));
      const endDay = Number(r.endDate.slice(-2));
      expect(startDay).toBe(1);
      // Previous month may end in 28, 29, 30 or 31
      expect([28, 29, 30, 31]).toContain(endDay);
    });

    it('parses "ultima semana" as the last 7 days', () => {
      const r = parsePeriod('ultima semana');
      expect(r.label).toBe('ultimos 7 dias');
      const start = new Date(r.startDate);
      const end = new Date(r.endDate);
      const diffDays = Math.round(
        (end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24),
      );
      expect(diffDays).toBe(6);
    });

    it('parses "ultimos 30 dias" as a 30-day window', () => {
      const r = parsePeriod('ultimos 30 dias');
      const start = new Date(r.startDate);
      const end = new Date(r.endDate);
      const diffDays = Math.round(
        (end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24),
      );
      expect(diffDays).toBe(29);
    });

    it('parses "ultimos 7 dias" as a 7-day window', () => {
      const r = parsePeriod('ultimos 7 dias');
      const start = new Date(r.startDate);
      const end = new Date(r.endDate);
      const diffDays = Math.round(
        (end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24),
      );
      expect(diffDays).toBe(6);
    });

    it('parses "ultimos 60 dias" via generic regex', () => {
      const r = parsePeriod('ultimos 60 dias');
      expect(r.label).toBe('ultimos 60 dias');
      const start = new Date(r.startDate);
      const end = new Date(r.endDate);
      const diffDays = Math.round(
        (end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24),
      );
      expect(diffDays).toBe(59);
    });
  });

  describe('month names (current year)', () => {
    it('parses "marco" as March of current year', () => {
      const r = parsePeriod('marco');
      expect(r.startDate.slice(5, 7)).toBe('03');
      expect(r.endDate.slice(5, 7)).toBe('03');
      expect(r.startDate.slice(-2)).toBe('01');
      expect(r.endDate.slice(-2)).toBe('31');
    });

    it('parses "fevereiro" with 28 or 29 days depending on year', () => {
      const r = parsePeriod('fevereiro');
      expect(r.startDate.slice(5, 7)).toBe('02');
      expect(r.endDate.slice(5, 7)).toBe('02');
      const endDay = Number(r.endDate.slice(-2));
      expect([28, 29]).toContain(endDay);
    });

    it('parses "Janeiro" (case and accent insensitive)', () => {
      const r = parsePeriod('Janeiro');
      expect(r.startDate.slice(5, 7)).toBe('01');
      expect(r.endDate.slice(-2)).toBe('31');
    });

    it('parses short form "jan"', () => {
      const r = parsePeriod('jan');
      expect(r.startDate.slice(5, 7)).toBe('01');
    });
  });

  describe('month with explicit year', () => {
    it('parses "marco 2025"', () => {
      const r = parsePeriod('marco 2025');
      expect(r.startDate).toBe('2025-03-01');
      expect(r.endDate).toBe('2025-03-31');
    });

    it('parses "marco de 2024"', () => {
      const r = parsePeriod('marco de 2024');
      expect(r.startDate).toBe('2024-03-01');
      expect(r.endDate).toBe('2024-03-31');
    });
  });

  describe('fallback to last 30 days', () => {
    it('returns last 30 days for empty string', () => {
      const r = parsePeriod('');
      expect(r.label).toBe('ultimos 30 dias');
    });

    it('returns last 30 days for garbage input', () => {
      const r = parsePeriod('xyz blah blah');
      expect(r.label).toBe('ultimos 30 dias');
    });

    it('returns last 30 days for invalid month name', () => {
      const r = parsePeriod('xunxembro');
      expect(r.label).toBe('ultimos 30 dias');
    });

    it('rejects out-of-range year', () => {
      const r = parsePeriod('marco 1500');
      expect(r.label).toBe('ultimos 30 dias');
    });
  });
});
