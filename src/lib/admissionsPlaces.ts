import type { SchoolRecord } from "@/lib/types";
import {
  isHospitalOrSecure,
  isSpecialApOrPru,
} from "@/lib/dataGaps";
import { resolveSchoolSector } from "@/lib/sectors";

/** School places / offer pressure fields from DfE open data. */
export interface AdmissionsPlacesFields {
  schoolPlaces?: number | null;
  pupilsOnRoll?: number | null;
  placesFillPercent?: number | null;
  pupilsOverCapacity?: number | null;
  unfilledPlaces?: number | null;
  placesPeriod?: string | null;
  placesSource?: string | null;
  admissionEntryYear?: string | null;
  admissionPhase?: string | null;
  admissionPlacesOffered?: number | null;
  firstPreferenceApplications?: number | null;
  anyPreferenceApplications?: number | null;
  firstPreferenceOffers?: number | null;
  /** firstPreferenceApplications / admissionPlacesOffered */
  firstPreferenceDemandRatio?: number | null;
  applicationsFromOtherLa?: number | null;
  offersToOtherLa?: number | null;
  admissionsPeriod?: string | null;
  admissionsSource?: string | null;
}

export type CapacityMissingReason =
  | "independent"
  | "special-ap"
  | "nursery"
  | "not-in-release";

export type OffersMissingReason =
  | "independent"
  | "special-ap"
  | "junior-transfer"
  | "nursery"
  | "not-in-release";

export function schoolHasAdmissionsPlaces(
  school: SchoolRecord | AdmissionsPlacesFields,
): boolean {
  return (
    school.schoolPlaces != null ||
    school.placesFillPercent != null ||
    school.firstPreferenceApplications != null ||
    school.admissionPlacesOffered != null
  );
}

export function formatDemandRatio(ratio: number | null | undefined): string {
  if (ratio == null || Number.isNaN(ratio)) return "—";
  return `${ratio.toFixed(2)}×`;
}

export function demandPressureHint(
  ratio: number | null | undefined,
): string | null {
  if (ratio == null) return null;
  if (ratio >= 1.2) return "More first preferences than places offered";
  if (ratio >= 1.0) return "About as many first preferences as places";
  return "Fewer first preferences than places offered";
}

export function fillPressureHint(
  fillPercent: number | null | undefined,
): string | null {
  if (fillPercent == null) return null;
  if (fillPercent > 100) return "On roll above published capacity";
  if (fillPercent >= 95) return "Near full on published capacity";
  return null;
}

function isNurserySetting(school: SchoolRecord): boolean {
  const blob = `${school.phase || ""} ${school.schoolTypeLabel || ""} ${school.name || ""}`.toLowerCase();
  return blob.includes("nursery");
}

function isJuniorPhase(school: SchoolRecord): boolean {
  const phase = (school.phase || "").toLowerCase();
  if (phase === "junior") return true;
  const ages = school.ageRange || "";
  // Typical junior: starts at 7, ends at 11 — Y3 entry, not National Offer Day R/Y7.
  return /\b7\s*to\s*11\b/i.test(ages) || /\b7\s*-\s*11\b/i.test(ages);
}

export function classifyCapacityMissing(
  school: SchoolRecord,
): CapacityMissingReason | null {
  if (school.schoolPlaces != null || school.pupilsOnRoll != null) return null;
  if (resolveSchoolSector(school) === "independent") return "independent";
  if (isSpecialApOrPru(school) || isHospitalOrSecure(school)) return "special-ap";
  if (isNurserySetting(school)) return "nursery";
  return "not-in-release";
}

export function capacityMissingMeta(reason: CapacityMissingReason): {
  label: string;
  detail: string;
} {
  switch (reason) {
    case "independent":
      return {
        label: "Not in state capacity survey",
        detail:
          "School capacity (SCAP) covers state-funded schools. Independents are outside that return.",
      };
    case "special-ap":
      return {
        label: "Special / AP capacity not in mainstream file",
        detail:
          "Special schools, alternative provision and similar settings are usually outside the mainstream places table used here.",
      };
    case "nursery":
      return {
        label: "Nursery places use a different register",
        detail:
          "Maintained nursery capacity is not the same SCAP school-places series shown for primary and secondary.",
      };
    default:
      return {
        label: "Not in latest capacity release",
        detail:
          "No school-places / on-roll row in the latest DfE school capacity release for this URN.",
      };
  }
}

export function classifyOffersMissing(
  school: SchoolRecord,
): OffersMissingReason | null {
  if (
    school.firstPreferenceApplications != null ||
    school.admissionPlacesOffered != null
  ) {
    return null;
  }
  if (resolveSchoolSector(school) === "independent") return "independent";
  if (isSpecialApOrPru(school) || isHospitalOrSecure(school)) return "special-ap";
  if (isNurserySetting(school)) return "nursery";
  if (isJuniorPhase(school)) return "junior-transfer";
  return "not-in-release";
}

export function offersMissingMeta(reason: OffersMissingReason): {
  label: string;
  detail: string;
} {
  switch (reason) {
    case "independent":
      return {
        label: "Not in coordinated offer-day stats",
        detail:
          "National Offer Day preference counts cover state coordinated admissions, not independent entry.",
      };
    case "special-ap":
      return {
        label: "Special / AP not in offer-day file",
        detail:
          "Special and alternative provision places are usually allocated outside the mainstream preference tables.",
      };
    case "junior-transfer":
      return {
        label: "Junior Year 3 entry — not in offer-day stats",
        detail:
          "National Offer Day preference counts cover Reception and Year 7. Junior schools usually admit at Year 3, so those figures are often not published for them.",
      };
    case "nursery":
      return {
        label: "No offer-day round for nursery",
        detail:
          "Maintained nurseries are not part of the primary/secondary applications and offers collection.",
      };
    default:
      return {
        label: "Not in latest offer-day release",
        detail:
          "No preference / offers row in the latest DfE applications and offers release for this URN (small school, suppressed, or not returned that year).",
      };
  }
}

/** Positive blank label for capacity cells (places / on roll / fill). */
export function capacityBlankLabel(school: SchoolRecord): string | null {
  const reason = classifyCapacityMissing(school);
  return reason ? capacityMissingMeta(reason).label : null;
}

/** Positive blank label for offer-day cells. */
export function offersBlankLabel(school: SchoolRecord): string | null {
  const reason = classifyOffersMissing(school);
  return reason ? offersMissingMeta(reason).label : null;
}

export function admissionsSummaryGapLabel(school: SchoolRecord): string | null {
  const hasCap =
    school.schoolPlaces != null || school.placesFillPercent != null;
  const hasOffers =
    school.firstPreferenceApplications != null ||
    school.admissionPlacesOffered != null;
  if (hasCap || hasOffers) return null;

  const offersReason = classifyOffersMissing(school);
  const capReason = classifyCapacityMissing(school);
  // Prefer the more specific parental explanation when both are missing.
  if (offersReason === "junior-transfer") {
    return offersMissingMeta(offersReason).label;
  }
  if (capReason) return capacityMissingMeta(capReason).label;
  if (offersReason) return offersMissingMeta(offersReason).label;
  return "No places / offers figures in this release";
}
