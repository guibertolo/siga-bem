import * as Sentry from '@sentry/nextjs';

/**
 * Check if user consented to analytics cookies (LGPD - Story 22.4).
 * Reads the `frotaviva_consent` cookie directly to avoid importing
 * client-only modules into the Sentry config.
 */
function hasAnalyticsConsent(): boolean {
  if (typeof document === 'undefined') return false;
  const raw = document.cookie
    .split('; ')
    .find((c) => c.startsWith('frotaviva_consent='));
  if (!raw) return false;
  try {
    const decoded = decodeURIComponent(raw.split('=')[1]);
    const state = JSON.parse(decoded);
    return state?.analytics === true;
  } catch {
    return false;
  }
}

const analyticsAllowed = hasAnalyticsConsent();

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  tracesSampleRate: 0.1,
  replaysSessionSampleRate: 0,
  // Only enable error replays if user consented to analytics (LGPD)
  replaysOnErrorSampleRate: analyticsAllowed ? 1.0 : 0,
  debug: false,
  enabled: process.env.NODE_ENV === 'production',
  integrations: analyticsAllowed
    ? [
        Sentry.replayIntegration({
          maskAllInputs: true,
          maskAllText: true,
          blockAllMedia: true,
        }),
      ]
    : [],
});
