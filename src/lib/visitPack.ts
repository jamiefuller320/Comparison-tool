import type { SchoolRecord } from "@/lib/types";
import {
  CHILDMINDER_VETTING_CHECKLIST,
  type ChecklistItem,
} from "@/lib/childminderChecklist";
import { isChildminder, isEyProvider } from "@/lib/eyMetrics";
import type { GuidancePathId } from "@/lib/decisionGuidance";

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

/** Open-day / visit prompts for primary and secondary shortlists. */
export const SCHOOL_VISIT_QUESTIONS: ChecklistItem[] = [
  {
    id: "feel",
    title: "What a day feels like for a child like mine",
    detail:
      "Ask how a typical day runs, how new pupils settle, and how staff respond when a child is anxious, bored, or stuck. Watch corridors and lunch if you can.",
  },
  {
    id: "learning",
    title: "Teaching, reading and support",
    detail:
      "For primary: early reading, writing, and maths support. For secondary: curriculum breadth, homework, and how they stretch or scaffold. Ask about SEND and disadvantaged pupils.",
  },
  {
    id: "behaviour",
    title: "Behaviour, pastoral care and belonging",
    detail:
      "Ask how behaviour is handled, how bullying is followed up, and who a child goes to with a worry. Look for calm, purposeful interactions — not just polished open-day moments.",
  },
  {
    id: "inspection",
    title: "Since the last inspection",
    detail:
      "Open the latest Ofsted/ISI report (or School Compass précis). Ask what changed on the strengths and the areas for improvement — especially if the report is a few years old.",
  },
  {
    id: "outcomes",
    title: "Published outcomes in context",
    detail:
      "If tables look strong or weak, ask how leaders explain recent years, cohort size, and what they are working on now. Treat one year’s spike as a question, not a verdict.",
  },
  {
    id: "admissions",
    title: "Admissions practicalities",
    detail:
      "Confirm deadlines, criteria, sibling rules, and transport. Published performance does not tell you your chance of a place.",
  },
  {
    id: "visit-observe",
    title: "See ordinary school life",
    detail:
      "Prefer a working visit or tour that includes lessons in progress. Note whether pupils seem engaged and whether staff know pupils’ names and needs.",
  },
  {
    id: "decide",
    title: "Your decision notes",
    detail:
      "Write what felt right or wrong for your child, open questions, and application dates. Compare notes across the shortlist after visits — not only on the numbers.",
  },
];

export type VisitPackKind = "nursery" | "childminder" | "school";

/**
 * Height for the printable notes block on each contact card.
 * Uses remaining space on an A4-ish first sheet when contacts are few;
 * stays compact when the shortlist needs multiple contact pages.
 */
export function computePrintNoteHeightPx(contactCount: number): number {
  const n = Math.max(1, contactCount);
  const pageContentPx = 980;
  const headerPx = 100;
  const cardChromePx = 128;
  const noteMinPx = 64;
  const noteMaxPx = 240;
  const singlePageBudget = pageContentPx - headerPx - n * cardChromePx;
  if (singlePageBudget >= n * noteMinPx) {
    return Math.min(
      noteMaxPx,
      Math.max(noteMinPx, Math.floor(singlePageBudget / n)),
    );
  }
  return noteMinPx + Math.max(0, 48 - n * 4);
}

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
  // Primary / secondary / all-through for school shortlist packs.
  if (record.urn && record.name) {
    return "school";
  }
  return null;
}

export function questionsForKind(kind: VisitPackKind): ChecklistItem[] {
  if (kind === "childminder") return CHILDMINDER_VETTING_CHECKLIST;
  if (kind === "school") return SCHOOL_VISIT_QUESTIONS;
  return NURSERY_VISIT_QUESTIONS;
}

/** Map a compare path to decision-guidance + pack labelling. */
export function guidancePathForPack(args: {
  schools?: SchoolRecord[];
  nurseries?: SchoolRecord[];
  childminders?: SchoolRecord[];
  preferPath?: GuidancePathId;
}): GuidancePathId {
  if (args.preferPath) return args.preferPath;
  if (args.childminders?.length) return "childminders";
  if (args.nurseries?.length) return "early-years";
  const schools = args.schools || [];
  if (schools.some((s) => s.phases?.includes("ks4") || s.phase === "secondary")) {
    return "ks4";
  }
  if (schools.some((s) => s.phases?.includes("ks2") || s.phase === "primary")) {
    return "ks2";
  }
  if (schools.some((s) => s.phases?.includes("ks1"))) {
    return "ks1";
  }
  return schools.length ? "ks2" : "general";
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
  ageRange?: string | null;
  /** Optional inspection précis fields for visit-pack qualitative context. */
  inspectionPrecis?: string | null;
  inspectionQuotes?: SchoolRecord["inspectionQuotes"];
  inspectionStrengths?: SchoolRecord["inspectionStrengths"];
  inspectionImprovements?: SchoolRecord["inspectionImprovements"];
  inspectionReportFileUrl?: string | null;
  inspectionReportLabel?: string | null;
  inspectionPrecisSource?: SchoolRecord["inspectionPrecisSource"];
}

export function toVisitContactRow(
  record: SchoolRecord,
  forceKind?: VisitPackKind,
): VisitContactRow | null {
  const kind = forceKind ?? visitPackKind(record);
  if (!kind) return null;
  const addressLine = [record.address, record.town, record.postcode]
    .filter(Boolean)
    .join(", ");
  const schoolLabel =
    record.schoolTypeLabel ||
    record.phase ||
    (record.phases?.includes("ks4") ? "Secondary" : null) ||
    (record.phases?.includes("ks2") ? "Primary" : null) ||
    "School";
  return {
    urn: record.urn,
    name: record.name,
    kind,
    kindLabel:
      kind === "childminder"
        ? record.providerSubtype || "Childminder"
        : kind === "school"
          ? schoolLabel
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
    ageRange: record.ageRange,
    inspectionPrecis: record.inspectionPrecis,
    inspectionQuotes: record.inspectionQuotes,
    inspectionStrengths: record.inspectionStrengths,
    inspectionImprovements: record.inspectionImprovements,
    inspectionReportFileUrl: record.inspectionReportFileUrl,
    inspectionReportLabel: record.inspectionReportLabel,
    inspectionPrecisSource: record.inspectionPrecisSource,
  };
}
