/**
 * Tests for Assistente FrotaViva logger (graceful Sentry degradation).
 * Story 9.7 AC-6.
 */

// Mock Sentry before importing logger
jest.mock('@sentry/nextjs', () => ({
  addBreadcrumb: jest.fn(),
  withScope: jest.fn(),
  captureException: jest.fn(),
}));

import * as Sentry from '@sentry/nextjs';
import { logger } from '@/lib/copilot/logger';

describe('logger', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.spyOn(console, 'info').mockImplementation(() => {});
    jest.spyOn(console, 'warn').mockImplementation(() => {});
    jest.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('info', () => {
    it('logs to console with feature tag', () => {
      logger.info('test message', { userId: '123' });
      expect(console.info).toHaveBeenCalledWith(
        '[assistente] test message',
        expect.objectContaining({ feature: 'assistente', userId: '123' }),
      );
    });

    it('calls Sentry.addBreadcrumb', () => {
      logger.info('test');
      expect(Sentry.addBreadcrumb).toHaveBeenCalledWith(
        expect.objectContaining({ category: 'assistente', level: 'info' }),
      );
    });

    it('does not throw when Sentry fails', () => {
      (Sentry.addBreadcrumb as jest.Mock).mockImplementation(() => {
        throw new Error('Sentry quota exceeded');
      });
      expect(() => logger.info('test')).not.toThrow();
      expect(console.info).toHaveBeenCalled();
    });
  });

  describe('warn', () => {
    it('logs to console with feature tag', () => {
      logger.warn('warning message');
      expect(console.warn).toHaveBeenCalledWith(
        '[assistente] warning message',
        expect.objectContaining({ feature: 'assistente' }),
      );
    });

    it('does not throw when Sentry fails', () => {
      (Sentry.addBreadcrumb as jest.Mock).mockImplementation(() => {
        throw new Error('Sentry network error');
      });
      expect(() => logger.warn('test')).not.toThrow();
    });
  });

  describe('error', () => {
    it('logs to console with error details', () => {
      const err = new Error('DB timeout');
      logger.error('query failed', err, { query: 'SELECT *' });
      expect(console.error).toHaveBeenCalledWith(
        '[assistente] query failed',
        'DB timeout',
        expect.objectContaining({ feature: 'assistente', query: 'SELECT *' }),
      );
    });

    it('calls Sentry.withScope and captureException', () => {
      const err = new Error('test');
      (Sentry.withScope as jest.Mock).mockImplementation((cb) => cb({
        setTag: jest.fn(),
        addBreadcrumb: jest.fn(),
      }));
      logger.error('fail', err);
      expect(Sentry.withScope).toHaveBeenCalled();
    });

    it('does not throw when Sentry fails completely', () => {
      (Sentry.withScope as jest.Mock).mockImplementation(() => {
        throw new Error('Sentry dead');
      });
      const err = new Error('original');
      expect(() => logger.error('fail', err)).not.toThrow();
      expect(console.error).toHaveBeenCalled();
    });

    it('handles non-Error thrown values', () => {
      logger.error('fail', 'string error');
      expect(console.error).toHaveBeenCalledWith(
        '[assistente] fail',
        'string error',
        expect.objectContaining({ feature: 'assistente' }),
      );
    });
  });
});
