import type { SchoolRecord } from "@/lib/types";
import {
  CHILDMINDER_VETTING_CHECKLIST,
  type ChecklistItem,
} from "@/lib/childminderChecklist";
import { isChildminder, isEyProvider } from "@/lib/eyMetrics";

/** Interview / visit prompts for day-care and school nurseries. */
export const NURSERY_VISIT_QUESTIONS: ChecklistItem[] = [
  {
    id: "registration",
    title: "Confirm Ofsted registration and latest report",
    detail:
      "Check the setting is registered for the ages you need and open the latest Ofsted report. Ask what changed since the inspection if it was a while ago.",
  },
  {
    id: "safeguarding",
    title: "Safeguarding, illness and first aid",
    detail:
      "Ask how they handle arrivals, collection passwords, allergies, medicines, and accidents. Confirm first-aid cover and how you will be contacted if something happens.",
  },
  {
    id: "ratios",
    title: "Group sizes, rooms and key person",
    detail:
      "Clarify room ages, staff-to-child ratios, and who will be your child’s key person. Ask what happens when staff are absent.",
  },
  {
    id: "routines",
    title: "Day structure and early learning",
    detail:
      "Talk through outdoor play, meals, sleep/rest, and how they support language and social skills. For school nurseries, ask how reception transition works.",
  },
  {
    id: "communication",
    title: "Updates and settling",
    detail:
      "Agree how you hear about the day (app, notebook, chat). Ask about settling sessions, settling-in length, and what they do if your child is distressed.",
  },
  {
    id: "funding",
    title: "Hours, fees and funded entitlements",
    detail:
      "Get written terms for hours, deposits, notice, and what funded hours cover. Ask about extras (meals, trips, late pickup) and waiting-list practice.",
  },
  {
    id: "visit",
    title: "See a session in action",
    detail:
      "Visit during a normal session if you can. Watch how children are greeted, how staff speak to them, and whether the room feels calm enough for your child.",
  },
  {
    id: "references",
    title: "Other parents and next steps",
    detail:
      "Where possible, speak to current parents. Note open questions, application deadlines, and when you need to decide.",
  },
];

export type VisitPackKind = "nursery" | "childminder";

export function visitPackKind(record: SchoolRecord): VisitPackKind | null {
  if (isChildminder(record)) return "childminder";
  if (isEyProvider(record)) return "nursery";
  // State school nursery / infant with EY intake on the Ofsted board.
  if (
    record.sector !== "independent" &&
    (record.phases?.includes("early-years") ||
      (record.ageRange &&
        (() => {
          const nums = record.ageRange.match(/\d+/g)?.map(Number) ?? [];
          return nums.length >= 2 && nums[0] <= 4;
        })()))
  ) {
    return "nursery";
  }
  return null;
}

export function questionsForKind(kind: VisitPackKind): ChecklistItem[] {
  return kind === "childminder"
    ? CHILDMINDER_VETTING_CHECKLIST
    : NURSERY_VISIT_QUESTIONS;
}

export interface VisitContactRow {
  urn: string;
  name: string;
  kind: VisitPackKind;
  kindLabel: string;
  addressLine: string;
  town?: string | null;
  postcode?: string | null;
  localAuthority?: string | null;
  ofstedOverall?: string | null;
  ofstedEarlyYearsProvision?: string | null;
  ofstedInspectionDate?: string | null;
  ofstedReportUrl?: string | null;
  ofstedUrn?: string | null;
  places?: number | null;
  providerSubtype?: string | null;
}

export function toVisitContactRow(record: SchoolRecord): VisitContactRow | null {
  const kind = visitPackKind(record);
  if (!kind) return null;
  const addressLine = [record.address, record.town, record.postcode]
    .filter(Boolean)
    .join(", ");
  return {
    urn: record.urn,
    name: record.name,
    kind,
    kindLabel:
      kind === "childminder"
        ? record.providerSubtype || "Childminder"
        : record.providerSubtype ||
          record.schoolTypeLabel ||
          record.phase ||
          "Nursery",
    addressLine: addressLine || "Address not published",
    town: record.town,
    postcode: record.postcode,
    localAuthority: record.localAuthority,
    ofstedOverall: record.ofstedOverall,
    ofstedEarlyYearsProvision: record.ofstedEarlyYearsProvision,
    ofstedInspectionDate: record.ofstedInspectionDate,
    ofstedReportUrl: record.ofstedReportUrl,
    ofstedUrn: record.ofstedUrn || undefined,
    places: record.places ?? record.placesIncludingEstimates,
    providerSubtype: record.providerSubtype || record.schoolTypeLabel,
  };
}
