import { type NextRequest, NextResponse } from 'next/server';

import { checkRateLimit } from '@/lib/security/rate-limit';
import { updateSession } from '@/lib/supabase/middleware';

/**
 * Routes that need rate limiting but are public (no auth redirect).
 * These were previously excluded from the matcher entirely.
 */
const RATE_LIMIT_ONLY_ROUTES = [
  '/login',
  '/aceitar-convite',
  '/trocar-senha',
];

/**
 * Check if this is a rate-limit-only route (public, no auth needed).
 */
function isRateLimitOnlyRoute(pathname: string): boolean {
  return RATE_LIMIT_ONLY_ROUTES.some(
    (route) => pathname === route || pathname.startsWith(`${route}/`),
  );
}

/**
 * Decode a base64url string (JWT segments use base64url, not standard base64).
 */
function decodeBase64Url(str: string): string {
  // Replace base64url chars with standard base64 and add padding
  const base64 = str.replace(/-/g, '+').replace(/_/g, '/');
  const padded = base64 + '='.repeat((4 - (base64.length % 4)) % 4);
  return atob(padded);
}

/**
 * Extract user_id from Supabase session cookie without full session refresh.
 * Returns null for unauthenticated requests.
 */
function extractUserIdFromCookie(request: NextRequest): string | null {
  // Supabase stores session in sb-*-auth-token cookies
  for (const cookie of request.cookies.getAll()) {
    if (cookie.name.includes('auth-token')) {
      try {
        // The auth token cookie can be a JWT or a JSON-encoded value
        const parts = cookie.value.split('.');
        if (parts.length === 3) {
          const payload = JSON.parse(decodeBase64Url(parts[1]));
          if (payload.sub) return payload.sub;
        }
        // Try JSON array format (older Supabase SSR)
        const parsed = JSON.parse(cookie.value);
        if (Array.isArray(parsed) && parsed[0]) {
          const tokenParts = String(parsed[0]).split('.');
          if (tokenParts.length === 3) {
            const payload = JSON.parse(decodeBase64Url(tokenParts[1]));
            if (payload.sub) return payload.sub;
          }
        }
      } catch {
        // Cookie parsing failed, continue
      }
    }
  }
  return null;
}

export async function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname;

  // -----------------------------------------------------------------------
  // Step 1: Rate limiting (runs for ALL matched routes, before auth)
  // -----------------------------------------------------------------------
  const userId = extractUserIdFromCookie(request);
  const rateLimitResult = await checkRateLimit(request, userId);

  if (rateLimitResult.blocked && rateLimitResult.response) {
    return rateLimitResult.response;
  }

  // -----------------------------------------------------------------------
  // Step 2: Public rate-limited routes skip auth entirely
  // -----------------------------------------------------------------------
  if (isRateLimitOnlyRoute(pathname)) {
    const response = NextResponse.next();
    if (rateLimitResult.headers) {
      for (const [key, value] of Object.entries(rateLimitResult.headers)) {
        response.headers.set(key, value);
      }
    }
    return response;
  }

  // -----------------------------------------------------------------------
  // Step 3: Auth session refresh for protected routes
  // -----------------------------------------------------------------------
  const response = await updateSession(request);

  // Attach rate limit headers to auth response
  if (rateLimitResult.headers) {
    for (const [key, value] of Object.entries(rateLimitResult.headers)) {
      response.headers.set(key, value);
    }
  }

  return response;
}

/**
 * Matcher: protege tudo EXCETO assets estaticos e rotas realmente publicas.
 *
 * IMPORTANTE: login, aceitar-convite e trocar-senha foram REMOVIDAS da
 * exclusao para que o rate limiting se aplique a elas. O middleware trata
 * essas rotas como "rate-limit-only" (sem redirect de auth).
 *
 * Rotas excluidas (sem rate limit e sem auth):
 * - /_next/* (Next.js internals)
 * - /auth/* (callback, reset-password)
 * - /api/public/* (future public APIs)
 * - /tutorial
 * - /sitemap.xml
 * - Static assets (favicon, logos, images, icons, manifest, sw)
 *
 * Rotas incluidas (com rate limit, sem auth redirect):
 * - /login, /aceitar-convite, /trocar-senha, /signup
 *
 * Rotas incluidas (com rate limit + auth):
 * - Todas as demais (dashboard, API, etc.)
 */
export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon\\.ico|logos/|images/|icons/|manifest\\.json|sw\\.js|sitemap\\.xml|api/public|auth/|tutorial).*)',
  ],
};
