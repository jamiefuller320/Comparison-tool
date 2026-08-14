/** Mainstream vs specialist / AP / PRU provision filter. */

import { isSpecialApOrPru } from "@/lib/dataGaps";
import type { SchoolRecord } from "@/lib/types";

export const PROVISION_OPTIONS = [
  {
    id: "any",
    label: "Any provision",
    short: "Any",
    hint: "Mainstream and specialist / alternative provision",
  },
  {
    id: "mainstream",
    label: "Mainstream",
    short: "Mainstream",
    hint: "Hide special schools, alternative provision and pupil referral units",
  },
  {
    id: "specialist",
    label: "Specialist / AP",
    short: "Specialist",
    hint: "Only special schools, alternative provision and pupil referral units",
  },
] as const;

export type ProvisionFilterId = (typeof PROVISION_OPTIONS)[number]["id"];

export const DEFAULT_PROVISION: ProvisionFilterId = "any";

const PROVISION_IDS = new Set<string>(PROVISION_OPTIONS.map((o) => o.id));

export function normalizeProvisionFilter(
  raw: string | null | undefined,
): ProvisionFilterId {
  const id = (raw || "").trim().toLowerCase();
  if (PROVISION_IDS.has(id)) return id as ProvisionFilterId;
  return DEFAULT_PROVISION;
}

export function schoolMatchesProvision(
  school: SchoolRecord,
  filter: ProvisionFilterId,
): boolean {
  if (filter === "any") return true;
  const specialist = isSpecialApOrPru(school);
  if (filter === "specialist") return specialist;
  return !specialist;
}
