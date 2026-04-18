/**
 * Assistente FrotaViva — persistent rate limit (Story 9.1 scaffold).
 *
 * Provider: Upstash Redis + @upstash/ratelimit (free tier 500k cmds/mo).
 * See: docs/stories/frotaviva-copilot/rate-limit-decision.md
 *
 * Two sliding-window limiters are consulted per request; the most
 * restrictive decision wins. If Upstash itself errors out (quota
 * exhausted, network), we fail-open with a warning so the Assistente
 * stays usable while @devops investigates.
 */

import { Ratelimit } from '@upstash/ratelimit';
import { Redis } from '@upstash/redis';

export const RATE_LIMIT_PER_MINUTE = 10;
export const RATE_LIMIT_PER_DAY = 200;

export interface RateLimitDecision {
  allowed: boolean;
  retryAfterSeconds?: number;
  reason?: 'per_minute' | 'per_day';
}

let minuteLimiter: Ratelimit | null = null;
let dayLimiter: Ratelimit | null = null;

function getLimiters(): { minute: Ratelimit; day: Ratelimit } {
  if (!minuteLimiter || !dayLimiter) {
    const redis = Redis.fromEnv();
    minuteLimiter = new Ratelimit({
      redis,
      limiter: Ratelimit.slidingWindow(RATE_LIMIT_PER_MINUTE, '60 s'),
      prefix: 'assistente:rl:min',
      analytics: false,
    });
    dayLimiter = new Ratelimit({
      redis,
      limiter: Ratelimit.slidingWindow(RATE_LIMIT_PER_DAY, '1 d'),
      prefix: 'assistente:rl:day',
      analytics: false,
    });
  }
  return { minute: minuteLimiter, day: dayLimiter };
}

/**
 * Check whether `userId` can make another Assistente request right now.
 *
 * Returns `{ allowed: true }` on success, or `{ allowed: false, retryAfterSeconds, reason }`
 * if any of the sliding windows denies the request.
 *
 * On Upstash errors (quota/network) we fail-open to keep the feature
 * available; callers should inspect logs to detect silent degradation.
 */
export async function checkRateLimit(
  userId: string,
): Promise<RateLimitDecision> {
  try {
    const { minute, day } = getLimiters();

    const [minuteResult, dayResult] = await Promise.all([
      minute.limit(userId),
      day.limit(userId),
    ]);

    if (!minuteResult.success) {
      const retryAfterSeconds = Math.max(
        1,
        Math.ceil((minuteResult.reset - Date.now()) / 1000),
      );
      return { allowed: false, retryAfterSeconds, reason: 'per_minute' };
    }

    if (!dayResult.success) {
      const retryAfterSeconds = Math.max(
        1,
        Math.ceil((dayResult.reset - Date.now()) / 1000),
      );
      return { allowed: false, retryAfterSeconds, reason: 'per_day' };
    }

    return { allowed: true };
  } catch (error) {
    // Fail-open: never block a legitimate user because Upstash hiccupped.
    // Story 9.5 adds logger.warn here with `{ feature: 'assistente', userId }`.
    console.warn(
      '[assistente] rate-limit check failed, failing open:',
      error instanceof Error ? error.message : error,
    );
    return { allowed: true };
  }
}
