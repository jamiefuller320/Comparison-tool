import type { SchoolRecord } from "@/lib/types";

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
