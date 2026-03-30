/**
 * Maps category icon slugs (stored in DB) to emoji for display.
 * Used across BI breakdown, gasto lists, viagem detail, etc.
 */
const ICONE_MAP: Record<string, string> = {
  toll: '🛣️',
  fuel: '⛽',
  tire: '🛞',
  wrench: '🔧',
  droplet: '💧',
  parking: '🅿️',
  utensils: '🍽️',
  bed: '🛏️',
  shield: '🛡️',
  alert: '⚠️',
  ellipsis: '📦',
};

/**
 * Resolves an icon slug to its emoji representation.
 * If the slug is already an emoji or unknown, returns as-is.
 */
export function resolveIcone(icone?: string | null): string {
  if (!icone) return '📋';
  return ICONE_MAP[icone] ?? icone;
}
