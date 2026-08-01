/**
 * Parent-facing interpretation copy: what published figures and inspection
 * précis do / do not support when shortlisting schools and early years.
 */

export type GuidancePathId =
  | "general"
  | "ks1"
  | "ks2"
  | "ks4"
  | "early-years"
  | "childminders";

export interface DecisionGuidanceSection {
  id: string;
  title: string;
  items: string[];
}

export interface DecisionGuidanceContent {
  path: GuidancePathId;
  heading: string;
  lead: string;
  sections: DecisionGuidanceSection[];
}

const SHARED_LIMITS: DecisionGuidanceSection = {
  id: "limits",
  title: "What this is not telling you",
  items: [
    "Whether your child will be happy, taught well, or make friends here.",
    "Admissions chances, catchment, faith criteria, or waiting-list practice.",
    "Day-to-day ethos, behaviour climate, or SEND support beyond short excerpts.",
    "A ranked “best school” — tables and reports are one lens, not a verdict.",
  ],
};

const SHARED_USE: DecisionGuidanceSection = {
  id: "use",
  title: "How to use this for decisions",
  items: [
    "Shortlist a few settings that look plausible on paper and on the map.",
    "Treat gaps and older inspections as prompts to ask, not automatic rejects.",
    "Visit (or watch a normal session), talk to staff, and weigh fit for your child.",
    "Keep notes on what you saw — printed packs are for that, not for league ranks.",
  ],
};

const PRECIS_SECTION: DecisionGuidanceSection = {
  id: "precis",
  title: "Reading the inspection précis",
  items: [
    "Excerpts are verbatim from the latest usable Ofsted or ISI report PDF.",
    "Positives and improvements are what inspectors wrote — not our summary of quality.",
    "A short précis cannot replace reading the full report in context.",
    "Academy conversion letters and admin PDFs are skipped when a real inspection exists.",
  ],
};

export const DECISION_GUIDANCE: Record<GuidancePathId, DecisionGuidanceContent> =
  {
    general: {
      path: "general",
      heading: "How to read this as a parent",
      lead: "Published tables and inspection excerpts help you compare a shortlist. They do not choose a school for you.",
      sections: [
        {
          id: "telling",
          title: "What the data can tell you",
          items: [
            "How nearby settings compare on the same published measures.",
            "Whether outcomes sit near, above, or below local / England context.",
            "Themes inspectors recently highlighted — strengths and next steps.",
            "Travel distance as a practical filter, not a measure of school quality.",
          ],
        },
        SHARED_LIMITS,
        {
          id: "conclude",
          title: "Fair conclusions you can draw",
          items: [
            "Which settings look similar enough to visit side by side.",
            "Which questions the numbers raise for open days and phone calls.",
            "Where coverage is thin (missing grades, new academies) so you dig deeper.",
          ],
        },
        SHARED_USE,
        PRECIS_SECTION,
      ],
    },
    ks1: {
      path: "ks1",
      heading: "How to read Year 1 / phonics context",
      lead: "School-level phonics scores are not published here. Area benchmarks give background for infant and primary choice — not a league table of schools.",
      sections: [
        {
          id: "telling",
          title: "What this path can tell you",
          items: [
            "Local-authority phonics context for the area around your shortlist.",
            "Which infant / primary settings are nearby to visit.",
            "Inspection précis where a recent report exists.",
          ],
        },
        {
          id: "limits",
          title: "What this is not telling you",
          items: [
            "How any one school’s Year 1 cohort performed in phonics.",
            "Classroom teaching quality or reading culture day to day.",
            ...SHARED_LIMITS.items.slice(1),
          ],
        },
        {
          id: "conclude",
          title: "Fair conclusions you can draw",
          items: [
            "Which schools belong on a visit list given location and phase.",
            "What to ask about early reading when you visit.",
          ],
        },
        SHARED_USE,
        PRECIS_SECTION,
      ],
    },
    ks2: {
      path: "ks2",
      heading: "How to read Key Stage 2 figures",
      lead: "End-of-primary tables show how Year 6 cohorts met expected and higher standards. Use them to spot patterns across a shortlist, then visit.",
      sections: [
        {
          id: "telling",
          title: "What this data can tell you",
          items: [
            "Share of pupils meeting expected / higher standards in reading, writing, maths (and combined).",
            "How a school sits against England (and trends across published years).",
            "Whether a year looks unusually high or low — small cohorts bounce more.",
            "Inspection themes from the latest usable Ofsted or ISI report.",
          ],
        },
        SHARED_LIMITS,
        {
          id: "conclude",
          title: "Fair conclusions you can draw",
          items: [
            "Relative strengths and gaps across the schools you are comparing.",
            "Which schools warrant a visit based on outcomes plus distance.",
            "Questions to ask about reading, writing, maths, and support for SEND.",
          ],
        },
        SHARED_USE,
        PRECIS_SECTION,
      ],
    },
    ks4: {
      path: "ks4",
      heading: "How to read Key Stage 4 / 16–18 figures",
      lead: "GCSE and 16–18 tables (and Ofsted/ISI excerpts) help you compare secondaries. KS3 has no school-level attainment table — published outcomes still appear at KS4.",
      sections: [
        {
          id: "telling",
          title: "What this data can tell you",
          items: [
            "Published GCSE / 16–18 headline measures for state and independent settings where available.",
            "How a school sits against the benchmark shown on the board.",
            "Inspection themes from the latest usable Ofsted or ISI report.",
            "When a setting lacks comparable tables — often special / AP — and why.",
          ],
        },
        SHARED_LIMITS,
        {
          id: "conclude",
          title: "Fair conclusions you can draw",
          items: [
            "Which secondaries look similar enough to visit with the same questions.",
            "Where missing progress or sparse 2024/25 measures mean you need the full report and a visit.",
            "What to ask about curriculum breadth, behaviour, and sixth-form pathways.",
          ],
        },
        SHARED_USE,
        PRECIS_SECTION,
      ],
    },
    "early-years": {
      path: "early-years",
      heading: "How to read early years Ofsted & EYFSP",
      lead: "Ofsted grades describe inspection judgements for settings. EYFSP area figures are local context — provider-level EYFSP is not published.",
      sections: [
        {
          id: "telling",
          title: "What this data can tell you",
          items: [
            "Latest overall / early years Ofsted grades and inspection dates where published.",
            "Local EYFSP area context (England / LA) — a different question from Ofsted grades.",
            "Verbatim précis themes from the latest usable report.",
          ],
        },
        {
          id: "limits",
          title: "What this is not telling you",
          items: [
            "How any one nursery’s children scored on the EYFSP.",
            "Fees, funded hours practice, or day-to-day ratios you will experience.",
            ...SHARED_LIMITS.items,
          ],
        },
        {
          id: "conclude",
          title: "Fair conclusions you can draw",
          items: [
            "Which nurseries / school early years belong on a visit shortlist.",
            "What to ask using the visit-pack interview prompts.",
          ],
        },
        SHARED_USE,
        PRECIS_SECTION,
      ],
    },
    childminders: {
      path: "childminders",
      heading: "How to read the childminder directory",
      lead: "This is a consented Ofsted directory plus checklist — wrap-around and home-based care, not the nursery Ofsted comparison table.",
      sections: [
        {
          id: "telling",
          title: "What this can tell you",
          items: [
            "Names and addresses childminders have consented to publish.",
            "Ofsted grade and report link where available.",
            "Practical vetting prompts for phone calls and visits.",
          ],
        },
        {
          id: "limits",
          title: "What this is not telling you",
          items: [
            "Phone numbers (not in Ofsted’s public consented file).",
            "Availability, fees, or whether they are the right fit for your child.",
            "A ranked list of “best” childminders.",
          ],
        },
        {
          id: "conclude",
          title: "Fair conclusions you can draw",
          items: [
            "Who to contact first based on location and published grade.",
            "Which checklist items to cover before you decide.",
          ],
        },
        SHARED_USE,
        PRECIS_SECTION,
      ],
    },
  };

export function guidanceForPath(
  path: GuidancePathId | null | undefined,
): DecisionGuidanceContent {
  if (path && path in DECISION_GUIDANCE) {
    return DECISION_GUIDANCE[path];
  }
  return DECISION_GUIDANCE.general;
}

/** Compact lines suitable above a compare board or inside a print pack. */
export function guidancePrintLines(
  path: GuidancePathId,
): { title: string; lines: string[] } {
  const content = guidanceForPath(path);
  const telling = content.sections.find((s) => s.id === "telling");
  const limits = content.sections.find((s) => s.id === "limits");
  const use = content.sections.find((s) => s.id === "use");
  const lines: string[] = [];
  if (telling?.items[0]) lines.push(`Can tell you: ${telling.items[0]}`);
  if (limits?.items[0]) lines.push(`Does not tell you: ${limits.items[0]}`);
  if (use?.items[0]) lines.push(`Next step: ${use.items[0]}`);
  lines.push(
    "Use numbers and précis to shortlist and prepare questions — decide after you visit.",
  );
  return { title: content.heading, lines };
}
