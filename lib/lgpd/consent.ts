/**
 * LGPD Consent Management
 *
 * Manages cookie consent state via a first-party cookie `frotaviva_consent`.
 * Categories: essential (always on), analytics, functionality.
 */

export interface ConsentState {
  essential: boolean; // Always true — cannot be disabled
  analytics: boolean; // Vercel Analytics, Sentry replay
  functionality: boolean; // Theme preference, UI settings
  timestamp: string; // ISO date of consent
}

const COOKIE_NAME = 'frotaviva_consent';
const COOKIE_TTL_DAYS = 365;

/**
 * Read current consent state from cookie.
 * Returns null if no consent has been given yet.
 */
export function getConsentState(): ConsentState | null {
  if (typeof document === 'undefined') return null;

  const raw = document.cookie
    .split('; ')
    .find((c) => c.startsWith(`${COOKIE_NAME}=`));

  if (!raw) return null;

  try {
    const decoded = decodeURIComponent(raw.split('=')[1]);
    return JSON.parse(decoded) as ConsentState;
  } catch {
    return null;
  }
}

/**
 * Persist consent state to cookie with 365-day TTL.
 */
export function setConsentState(state: ConsentState): void {
  if (typeof document === 'undefined') return;

  const value = encodeURIComponent(JSON.stringify(state));
  const expires = new Date();
  expires.setDate(expires.getDate() + COOKIE_TTL_DAYS);

  document.cookie = `${COOKIE_NAME}=${value}; path=/; expires=${expires.toUTCString()}; SameSite=Lax; Secure`;
}

/**
 * Check if user has already given consent (any type).
 */
export function hasConsent(): boolean {
  return getConsentState() !== null;
}

/**
 * Check if user consented to analytics cookies.
 */
export function hasAnalyticsConsent(): boolean {
  const state = getConsentState();
  return state?.analytics === true;
}

/**
 * Build a consent state for "accept all".
 */
export function acceptAll(): ConsentState {
  return {
    essential: true,
    analytics: true,
    functionality: true,
    timestamp: new Date().toISOString(),
  };
}

/**
 * Build a consent state for "accept essentials only".
 */
export function acceptEssentialsOnly(): ConsentState {
  return {
    essential: true,
    analytics: false,
    functionality: false,
    timestamp: new Date().toISOString(),
  };
}
