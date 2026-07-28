/** Verifiable source stamps for numbers and judgements shown to parents. */

export interface SourceStamp {
  /** Stable id for challenge payloads / tests. */
  id: string;
  /** Short human label, e.g. "KS2 performance tables". */
  label: string;
  period?: string | null;
  asAt?: string | null;
  dataset?: string | null;
  deepLink?: string | null;
  note?: string | null;
}

export type ChallengeBoardId =
  | "ks2"
  | "ks4"
  | "ks1-phonics"
  | "early-years-ofsted"
  | "eyfsp"
  | "childminders"
  | "visit-pack"
  | "general";

const CSP_HOME =
  "https://www.compare-school-performance.service.gov.uk/";
const OFSTED_SCHOOLS_MI =
  "https://www.gov.uk/government/statistical-data-sets/monthly-management-information-ofsteds-school-inspections-outcomes";
const OFSTED_CHILDCARE_MI =
  "https://www.gov.uk/government/statistical-data-sets/childcare-providers-and-inspections-management-information";
const CONSENTED_ADDRESSES =
  "https://www.gov.uk/government/publications/consented-addresses-for-childminders-and-domestic-childcare";
const PHONICS_EXPLORE =
  "https://explore-education-statistics.service.gov.uk/find-statistics/phonics-screening-check-attainment";
const EYFSP_EXPLORE =
  "https://explore-education-statistics.service.gov.uk/find-statistics/early-years-foundation-stage-profile-results";

export function formatSourceStamp(stamp: SourceStamp): string {
  const bits = [
    stamp.label,
    stamp.period ? `period ${stamp.period}` : null,
    stamp.asAt ? `as at ${stamp.asAt}` : null,
    stamp.dataset ? stamp.dataset : null,
  ].filter(Boolean);
  return bits.join(" · ");
}

export function ks2TablesStamp(opts: {
  period?: string | null;
  primarySite?: string | null;
  generatedAt?: string | null;
}): SourceStamp {
  return {
    id: "ks2-tables",
    label: "KS2 performance tables",
    period: opts.period ?? null,
    asAt: opts.generatedAt ?? null,
    dataset: "DfE Explore Education Statistics / Compare school performance",
    deepLink: opts.primarySite || CSP_HOME,
    note: "Institution-level Key Stage 2 attainment where published.",
  };
}

export function ks4TablesStamp(opts: {
  period?: string | null;
  ks5Period?: string | null;
  datasetId?: string | null;
  generatedAt?: string | null;
}): SourceStamp {
  return {
    id: "ks4-tables",
    label: "KS4 / 16–18 tables",
    period: opts.period ?? null,
    asAt: opts.generatedAt ?? null,
    dataset: opts.datasetId
      ? `DfE EES KS4 (${opts.datasetId})`
      : "DfE Explore Education Statistics — Key Stage 4 / 16–18",
    deepLink: CSP_HOME,
    note: opts.ks5Period
      ? `16–18 figures use period ${opts.ks5Period} where published.`
      : "GCSE and 16–18 outcomes where published.",
  };
}

export function ofstedStateStamp(opts: {
  asAt?: string | null;
  sourcePage?: string | null;
}): SourceStamp {
  return {
    id: "ofsted-state-schools",
    label: "Ofsted school inspections MI",
    asAt: opts.asAt ?? null,
    dataset: "Ofsted monthly management information — state schools",
    deepLink: opts.sourcePage || OFSTED_SCHOOLS_MI,
    note: "Overall and domain grades from the latest graded inspection in Ofsted’s MI.",
  };
}

export function ofstedChildcareStamp(opts: {
  asAt?: string | null;
  sourcePage?: string | null;
}): SourceStamp {
  return {
    id: "ofsted-childcare",
    label: "Ofsted childcare MI",
    asAt: opts.asAt ?? null,
    dataset: "Ofsted childcare providers and inspections management information",
    deepLink: opts.sourcePage || OFSTED_CHILDCARE_MI,
    note: "Early Years Register day-care inspection outcomes.",
  };
}

export function eyfspStamp(opts: {
  period?: string | null;
  sourceUrl?: string | null;
}): SourceStamp {
  return {
    id: "eyfsp-area",
    label: "EYFSP area benchmarks",
    period: opts.period ?? null,
    dataset: "DfE Early years foundation stage profile results",
    deepLink: opts.sourceUrl || EYFSP_EXPLORE,
    note: "England / local authority aggregates only — not provider-level scores.",
  };
}

export function phonicsStamp(opts: {
  period?: string | null;
  datasetId?: string | null;
}): SourceStamp {
  return {
    id: "phonics-la",
    label: "Phonics screening (LA / England)",
    period: opts.period ?? null,
    dataset: opts.datasetId
      ? `DfE EES phonics (${opts.datasetId})`
      : "DfE phonics screening check attainment",
    deepLink: PHONICS_EXPLORE,
    note: "Published for England and local authorities only — not individual schools.",
  };
}

export function childminderConsentStamp(opts: {
  consentedAsAt?: string | null;
  ofstedAsAt?: string | null;
  sourcePage?: string | null;
}): SourceStamp {
  return {
    id: "childminder-consented",
    label: "Consented childminder addresses",
    asAt: opts.consentedAsAt ?? null,
    dataset: "Ofsted consented addresses for childminders and domestic childcare",
    deepLink: opts.sourcePage || CONSENTED_ADDRESSES,
    note: opts.ofstedAsAt
      ? `Ofsted grade join uses childcare MI as at ${opts.ofstedAsAt}.`
      : "Directory limited to settings that consented to publish an address.",
  };
}

export function schoolDeepLink(school: {
  compareUrl?: string | null;
  ofstedReportUrl?: string | null;
  isiReportsUrl?: string | null;
  inspectionReportsUrl?: string | null;
  giasUrl?: string | null;
}): string | null {
  return (
    school.compareUrl ||
    school.ofstedReportUrl ||
    school.inspectionReportsUrl ||
    school.isiReportsUrl ||
    school.giasUrl ||
    null
  );
}
