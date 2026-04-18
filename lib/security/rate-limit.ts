import { Ratelimit } from '@upstash/ratelimit';
import { Redis } from '@upstash/redis';
import { NextResponse, type NextRequest } from 'next/server';

import { logError } from '@/lib/observability/logger';

// ---------------------------------------------------------------------------
// Configuration
// ---------------------------------------------------------------------------

interface RateLimitTier {
  /** Max requests in the window */
  limit: number;
  /** Window duration (Upstash duration string, e.g. "1 m") */
  window: string;
}

const SENSITIVE_ROUTES: Record<string, RateLimitTier> = {
  '/login': { limit: 10, window: '1 m' },
  '/aceitar-convite': { limit: 10, window: '1 m' },
  '/trocar-senha': { limit: 10, window: '1 m' },
  '/monitoring': { limit: 100, window: '1 m' },
};

const GENERAL_TIER: RateLimitTier = { limit: 1000, window: '1 m' };

const RESPONSE_MESSAGE =
  'Muitas tentativas. Aguarde um momento e tente novamente.';

// ---------------------------------------------------------------------------
// Redis client (lazy singleton)
// ---------------------------------------------------------------------------

let redis: Redis | null = null;

function getRedis(): Redis | null {
  if (redis) return redis;

  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;

  if (!url || !token) return null;

  redis = new Redis({ url, token });
  return redis;
}

// ---------------------------------------------------------------------------
// Rate limiter cache (one per tier to avoid re-creating on every request)
// ---------------------------------------------------------------------------

const limiterCache = new Map<string, Ratelimit>();

function getLimiter(tier: RateLimitTier): Ratelimit {
  const key = `${tier.limit}:${tier.window}`;
  const cached = limiterCache.get(key);
  if (cached) return cached;

  const redisClient = getRedis();
  if (!redisClient) {
    throw new Error('Redis not available');
  }

  const limiter = new Ratelimit({
    redis: redisClient,
    limiter: Ratelimit.slidingWindow(tier.limit, tier.window as `${number} ${'ms' | 's' | 'm' | 'h' | 'd'}`),
    analytics: false,
    prefix: 'frotaviva:rl',
  });

  limiterCache.set(key, limiter);
  return limiter;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function getClientIp(request: NextRequest): string {
  return (
    request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ??
    request.headers.get('x-real-ip') ??
    '127.0.0.1'
  );
}

function matchSensitiveRoute(pathname: string): RateLimitTier | null {
  for (const [route, tier] of Object.entries(SENSITIVE_ROUTES)) {
    if (pathname === route || pathname.startsWith(`${route}/`)) {
      return tier;
    }
  }
  return null;
}

function build429Response(resetMs: number): NextResponse {
  const retryAfterSeconds = Math.ceil(resetMs / 1000);

  return new NextResponse(
    JSON.stringify({ error: RESPONSE_MESSAGE }),
    {
      status: 429,
      headers: {
        'Content-Type': 'application/json',
        'Retry-After': String(retryAfterSeconds),
      },
    },
  );
}

function addRateLimitHeaders(
  response: NextResponse,
  limit: number,
  remaining: number,
  resetMs: number,
): NextResponse {
  response.headers.set('X-RateLimit-Limit', String(limit));
  response.headers.set('X-RateLimit-Remaining', String(remaining));
  response.headers.set('X-RateLimit-Reset', String(Math.ceil(resetMs / 1000)));
  return response;
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Applies rate limiting to the request. Returns a 429 NextResponse if the
 * limit is exceeded, or `null` if the request should proceed.
 *
 * On Redis failure, logs via Sentry and returns `null` (fail-open).
 */
export async function applyRateLimit(
  request: NextRequest,
  userId: string | null,
): Promise<NextResponse | null> {
  // If Upstash env vars are missing, rate limiting is disabled
  if (!getRedis()) return null;

  const pathname = request.nextUrl.pathname;
  const ip = getClientIp(request);

  // Determine tier: sensitive route takes priority, then general for all
  const sensitiveTier = matchSensitiveRoute(pathname);
  const tier = sensitiveTier ?? GENERAL_TIER;

  // Key: sensitive routes always use IP. General uses user_id if available.
  const identifier = sensitiveTier
    ? `ip:${ip}:${pathname}`
    : userId
      ? `user:${userId}`
      : `ip:${ip}`;

  try {
    const limiter = getLimiter(tier);
    const result = await limiter.limit(identifier);

    if (!result.success) {
      const resetMs = result.reset - Date.now();

      logError(
        {
          action: 'rate-limit-exceeded',
          usuarioId: userId,
          params: {
            rota: pathname,
            ip,
            user_id: userId ?? 'anonimo',
            limit: tier.limit,
            window: tier.window,
          },
        },
        new Error(`Rate limit exceeded: ${pathname}`),
      );

      return build429Response(resetMs);
    }

    // Attach headers to be merged by the caller (middleware)
    // We return null but store headers on request for the middleware to copy
    return null;
  } catch (error) {
    // Fail-open: log and allow request
    logError(
      {
        action: 'rate-limit-redis-error',
        usuarioId: userId,
        params: { rota: pathname, ip },
      },
      error,
    );

    return null;
  }
}

/**
 * Checks rate limit and returns headers + success status.
 * Used by middleware to both block and decorate responses.
 */
export async function checkRateLimit(
  request: NextRequest,
  userId: string | null,
): Promise<{
  blocked: boolean;
  response?: NextResponse;
  headers?: Record<string, string>;
}> {
  if (!getRedis()) return { blocked: false };

  const pathname = request.nextUrl.pathname;
  const ip = getClientIp(request);

  const sensitiveTier = matchSensitiveRoute(pathname);
  const tier = sensitiveTier ?? GENERAL_TIER;

  const identifier = sensitiveTier
    ? `ip:${ip}:${pathname}`
    : userId
      ? `user:${userId}`
      : `ip:${ip}`;

  try {
    const limiter = getLimiter(tier);
    const result = await limiter.limit(identifier);
    const resetMs = result.reset - Date.now();

    const headers: Record<string, string> = {
      'X-RateLimit-Limit': String(tier.limit),
      'X-RateLimit-Remaining': String(result.remaining),
      'X-RateLimit-Reset': String(Math.ceil(resetMs / 1000)),
    };

    if (!result.success) {
      logError(
        {
          action: 'rate-limit-exceeded',
          usuarioId: userId,
          params: {
            rota: pathname,
            ip,
            user_id: userId ?? 'anonimo',
            limit: tier.limit,
            window: tier.window,
          },
        },
        new Error(`Rate limit exceeded: ${pathname}`),
      );

      const response = build429Response(resetMs);
      // Also set X-RateLimit-* headers on the 429 response
      addRateLimitHeaders(response, tier.limit, result.remaining, resetMs);
      return { blocked: true, response };
    }

    return { blocked: false, headers };
  } catch (error) {
    logError(
      {
        action: 'rate-limit-redis-error',
        usuarioId: userId,
        params: { rota: pathname, ip },
      },
      error,
    );

    return { blocked: false };
  }
}
