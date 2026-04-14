import type { NextConfig } from 'next';
import { withSentryConfig } from '@sentry/nextjs';

const nextConfig: NextConfig = {
  turbopack: {
    root: process.cwd(),
  },
  experimental: {
    optimizePackageImports: [
      '@supabase/supabase-js',
      'react-hook-form',
      '@hookform/resolvers',
      '@react-pdf/renderer',
      'zod',
    ],
  },
  webpack: (config) => {
    // @react-pdf/renderer uses canvas and other Node modules — exclude from server bundle
    config.resolve.alias.canvas = false;
    return config;
  },
  async headers() {
    // CSP directives for Next.js + Supabase + Sentry + Vercel Analytics + Google Fonts
    // Report-only mode: does NOT block anything, only reports violations to Sentry.
    // TODO (Story 22.2b): After 1 week monitoring without critical violations,
    // switch Content-Security-Policy-Report-Only to Content-Security-Policy (enforce mode).
    const cspDirectives = [
      "default-src 'self'",
      // Next.js requires 'unsafe-inline' and 'unsafe-eval' for dev; production uses nonces
      // but report-only mode is safe to deploy with these directives.
      "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://va.vercel-scripts.com https://*.sentry.io",
      "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
      "img-src 'self' data: blob: https://*.supabase.co",
      "font-src 'self' https://fonts.gstatic.com",
      "connect-src 'self' https://*.supabase.co wss://*.supabase.co https://*.sentry.io https://va.vercel-scripts.com",
      "media-src 'self' https://*.supabase.co",
      "object-src 'none'",
      "frame-ancestors 'none'",
      "base-uri 'self'",
      "form-action 'self'",
      "report-uri https://o4511141128962048.ingest.us.sentry.io/api/4511141136171008/security/?sentry_key=3a5fa1738af7d7ac85e5218d76d7670c",
    ].join('; ');

    return [
      {
        source: '/(.*)',
        headers: [
          // Existing security headers (preserved)
          { key: 'X-Frame-Options', value: 'DENY' },
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          { key: 'X-DNS-Prefetch-Control', value: 'on' },
          {
            key: 'Permissions-Policy',
            value: 'camera=(), microphone=(), geolocation=()',
          },
          // HSTS: 2 years, eligible for preload list (hstspreload.org)
          {
            key: 'Strict-Transport-Security',
            value: 'max-age=63072000; includeSubDomains; preload',
          },
          // CSP in report-only mode (does not block requests)
          {
            key: 'Content-Security-Policy-Report-Only',
            value: cspDirectives,
          },
        ],
      },
    ];
  },
};

export default withSentryConfig(nextConfig, {
  org: process.env.SENTRY_ORG,
  project: process.env.SENTRY_PROJECT,
  silent: !process.env.CI,
  widenClientFileUpload: true,
  disableLogger: true,
  tunnelRoute: '/monitoring',
  sourcemaps: { deleteSourcemapsAfterUpload: true },
});
