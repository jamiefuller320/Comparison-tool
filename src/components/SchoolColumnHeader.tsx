"use client";

import type { ReactNode } from "react";
import { useCompareSticky } from "@/components/CompareStickyContext";

/**
 * School / provider column heading for compare tables.
 * When “Pin column headings” is on, meta collapses into an Info control so the
 * whole sticky header row stays one compact line (no nested scroll on iPhone).
 */
export function SchoolColumnHeader({
  title,
  children,
}: {
  title: ReactNode;
  children?: ReactNode;
}) {
  const { stickyHeader } = useCompareSticky();
  const hasMeta = children != null && children !== false;

  if (!hasMeta) {
    return <>{title}</>;
  }

  if (!stickyHeader) {
    return (
      <div className="school-column-heading">
        <div className="school-column-title">{title}</div>
        <div className="school-meta">{children}</div>
      </div>
    );
  }

  return (
    <div className="school-column-heading is-compact">
      <div className="school-column-title">{title}</div>
      <details className="school-column-info">
        <summary className="school-column-info-btn">Info</summary>
        <div className="school-column-info-panel">
          <div className="school-meta">{children}</div>
        </div>
      </details>
    </div>
  );
}
