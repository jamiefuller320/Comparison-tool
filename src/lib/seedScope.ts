/**
 * Seed geography for the economic initial scope.
 * Full maintained coverage starts here; other areas expand on demand.
 *
 * Matches school `localAuthority` / DfE LA labels in the harvested index
 * (Hampshire County Council area — not Southampton or Portsmouth unitaries).
 *
 * On-demand pack helpers live in `laPacks.ts` (re-exported here for
 * existing imports).
 */
export {
  SEED_LOCAL_AUTHORITY,
  SEED_GEOGRAPHY_LABEL,
  COVERAGE_REGION_LABEL,
  COVERAGE_REGION_LOCAL_AUTHORITIES,
  LONDON_BOROUGH_LOCAL_AUTHORITIES,
  SOUTHEAST_PLUS_DORSET_LOCAL_AUTHORITIES,
  isSeedLocalAuthority,
  isSoutheastPlusDorsetLocalAuthority,
  isCoverageRegionLocalAuthority,
  isLondonBoroughLocalAuthority,
  isLocalAuthority,
  laSlug,
  normalizeLaName,
  packDataPath,
} from "@/lib/laPacks";
