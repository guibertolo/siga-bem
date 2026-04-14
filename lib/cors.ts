import { NextResponse } from 'next/server';

/**
 * Allowed origins for CORS validation.
 * Derived from NEXT_PUBLIC_SITE_URL (production) and localhost (development).
 */
function getAllowedOrigins(): string[] {
  const origins: string[] = ['http://localhost:3000'];
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL;
  if (siteUrl) {
    // Remove trailing slash if present
    origins.push(siteUrl.replace(/\/$/, ''));
  }
  return origins;
}

/**
 * Check if an origin is in the allowlist.
 */
function isOriginAllowed(origin: string | null): boolean {
  if (!origin) return false;
  return getAllowedOrigins().includes(origin);
}

/**
 * Add CORS headers to a response if the request origin is allowed.
 * If origin is not allowed, no CORS headers are added (browser blocks by absence).
 */
export function applyCorsHeaders(
  response: NextResponse,
  origin: string | null,
  methods: string,
): NextResponse {
  if (!origin || !isOriginAllowed(origin)) {
    return response;
  }

  response.headers.set('Access-Control-Allow-Origin', origin);
  response.headers.set('Access-Control-Allow-Methods', methods);
  response.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  return response;
}

/**
 * Handle OPTIONS preflight request.
 * Returns a 204 response with CORS headers if origin is allowed.
 * Returns null if method is not OPTIONS (caller should proceed with normal flow).
 */
export function handleOptions(
  request: Request,
  methods: string,
): NextResponse | null {
  if (request.method !== 'OPTIONS') {
    return null;
  }

  const origin = request.headers.get('Origin');

  if (!isOriginAllowed(origin)) {
    return new NextResponse(null, { status: 405 });
  }

  const response = new NextResponse(null, { status: 204 });
  response.headers.set('Access-Control-Allow-Origin', origin!);
  response.headers.set('Access-Control-Allow-Methods', methods);
  response.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  response.headers.set('Access-Control-Max-Age', '86400');

  return response;
}
