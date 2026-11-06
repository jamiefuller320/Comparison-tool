/**
 * Closed-school landings that should send people to the successor URN.
 * Written by scripts/sync-gias-lifecycle.py.
 */

import { existsSync, readFileSync } from "fs";
import { join } from "path";
import { BRAND_HOME_URL } from "@/lib/brand";
import { schoolPath } from "@/lib/seoSchools";

export type GiasSuccessorRedirect = {
  urn: string;
  name: string;
  localAuthority: string | null;
  areaSlug: string;
  successorUrn: string;
  successorName: string;
  /** Successor has an open School Compass landing. */
  successorOnSite: boolean;
  closeDate: string | null;
  closeReason: string | null;
};

type RedirectFile = {
  version?: number;
  generatedAt?: string | null;
  redirects?: GiasSuccessorRedirect[];
};

let cached: GiasSuccessorRedirect[] | null = null;

export function listGiasSuccessorRedirects(): GiasSuccessorRedirect[] {
  if (cached) return cached;
  const path = join(process.cwd(), "public/data/gias-successor-redirects.json");
  if (!existsSync(path)) {
    cached = [];
    return cached;
  }
  try {
    const raw = JSON.parse(readFileSync(path, "utf8")) as RedirectFile;
    const rows = Array.isArray(raw.redirects) ? raw.redirects : [];
    cached = rows.filter((row) => row?.urn && row?.successorUrn);
  } catch {
    cached = [];
  }
  return cached;
}

export function getGiasSuccessorRedirect(
  urn: string,
): GiasSuccessorRedirect | undefined {
  const key = String(urn);
  return listGiasSuccessorRedirects().find((row) => row.urn === key);
}

/** Absolute URL the closed landing refreshes to. */
export function giasRedirectHref(row: GiasSuccessorRedirect): string {
  if (row.successorOnSite) {
    return `${BRAND_HOME_URL}${schoolPath(row.successorUrn)}`;
  }
  return (
    "https://www.get-information-schools.service.gov.uk/" +
    `Establishments/Establishment/Details/${encodeURIComponent(row.successorUrn)}`
  );
}

const MONTHS = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

export function formatGiasCloseDate(iso: string | null | undefined): string | null {
  if (!iso) return null;
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso.trim());
  if (!match) return iso;
  const month = MONTHS[Number(match[2]) - 1];
  if (!month) return iso;
  return `${Number(match[3])} ${month} ${match[1]}`;
}
