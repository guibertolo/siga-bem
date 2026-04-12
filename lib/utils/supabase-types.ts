/**
 * Supabase join type helpers.
 *
 * Supabase PostgREST returns relations as `T | T[]` depending on cardinality.
 * TypeScript infers them as arrays even for single relations (many-to-one).
 * These helpers provide safe unwrapping without `as unknown as` casts.
 */

/**
 * Unwrap a Supabase single relation (many-to-one / one-to-one).
 * PostgREST may return `T`, `T[]`, or `null`. This normalizes to `T | null`.
 */
export function singleRelation<T>(value: T | T[] | null | undefined): T | null {
  if (value == null) return null;
  if (Array.isArray(value)) return value[0] ?? null;
  return value;
}
