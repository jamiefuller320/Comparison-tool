import type { SchoolRecord } from "@/lib/types";

export type SchoolLinkKind = "website" | "gias" | "tables" | "ofsted" | "isi";

export interface SchoolOutboundLink {
  kind: SchoolLinkKind;
  label: string;
  href: string;
}

function normalizeWebsite(url: string): string {
  const t = url.trim();
  if (!t) return t;
  if (/^https?:\/\//i.test(t)) return t;
  return `https://${t}`;
}

/**
 * Parent-facing outbound links. Prefer the school’s own website; always aim
 * to expose at least one school-page style link (website or GIAS).
 */
export function schoolOutboundLinks(
  school: SchoolRecord,
  opts: { includeInspection?: boolean } = {},
): SchoolOutboundLink[] {
  const links: SchoolOutboundLink[] = [];
  const website = school.schoolWebsite?.trim();
  if (website) {
    links.push({
      kind: "website",
      label: "Website",
      href: normalizeWebsite(website),
    });
  } else if (school.giasUrl) {
    links.push({
      kind: "gias",
      label: "School page (GIAS)",
      href: school.giasUrl,
    });
  } else if (school.urn && /^\d+$/.test(String(school.urn))) {
    links.push({
      kind: "gias",
      label: "School page (GIAS)",
      href: `https://www.get-information-schools.service.gov.uk/Establishments/Establishment/Details/${school.urn}`,
    });
  }

  if (school.compareUrl) {
    links.push({
      kind: "tables",
      label: "Official tables",
      href: school.compareUrl,
    });
  }

  if (opts.includeInspection) {
    if (school.isiLatestReportUrl) {
      links.push({
        kind: "isi",
        label: "ISI report",
        href: school.isiLatestReportUrl,
      });
    } else if (school.isiProfileUrl || school.isiReportsUrl) {
      links.push({
        kind: "isi",
        label: "ISI reports",
        href: (school.isiProfileUrl || school.isiReportsUrl) as string,
      });
    }
    if (school.ofstedReportUrl) {
      links.push({
        kind: "ofsted",
        label: "Ofsted",
        href: school.ofstedReportUrl,
      });
    }
  }

  return links;
}

/** True when we can show a school website or GIAS school-page fallback. */
export function hasSchoolPageLink(school: SchoolRecord): boolean {
  return schoolOutboundLinks(school).some(
    (l) => l.kind === "website" || l.kind === "gias",
  );
}
