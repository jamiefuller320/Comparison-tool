"use client";

import type { SchoolRecord } from "@/lib/types";
import { schoolOutboundLinks } from "@/lib/schoolLinks";

/** Compact website / GIAS / tables links for compare headers and print packs. */
export function SchoolOutboundLinks({
  school,
  includeInspection = false,
  className = "school-outbound-links",
}: {
  school: SchoolRecord;
  includeInspection?: boolean;
  className?: string;
}) {
  const links = schoolOutboundLinks(school, { includeInspection });
  if (!links.length) return null;
  return (
    <span className={className}>
      {links.map((link) => (
        <a
          key={`${link.kind}-${link.href}`}
          href={link.href}
          target="_blank"
          rel="noreferrer"
          className={`school-outbound-link school-outbound-${link.kind}`}
        >
          {link.label} ↗
        </a>
      ))}
    </span>
  );
}
