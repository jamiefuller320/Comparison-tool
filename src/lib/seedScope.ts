/**
 * Seed geography for the economic initial scope.
 * Full maintained coverage starts here; other areas expand on demand.
 *
 * Matches school `localAuthority` / DfE LA labels in the harvested index
 * (Hampshire County Council area — not Southampton or Portsmouth unitaries).
 */
export const SEED_LOCAL_AUTHORITY = "Hampshire";

/** Human label for UI / docs. */
export const SEED_GEOGRAPHY_LABEL = "Hampshire";

export function isSeedLocalAuthority(
  localAuthority?: string | null,
): boolean {
  if (!localAuthority) return false;
  return localAuthority.trim().toLowerCase() === SEED_LOCAL_AUTHORITY.toLowerCase();
}
