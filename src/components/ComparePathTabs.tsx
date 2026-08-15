"use client";

import { BinderTabs, type BinderTabItem } from "@/components/BinderTabs";
import {
  COMPARE_PATH_OPTIONS,
  type ComparePathId,
} from "@/lib/comparePaths";

export function ComparePathTabs({
  available,
  active,
  onChange,
  withShortlist,
}: {
  available: ComparePathId[];
  active: ComparePathId;
  onChange: (id: ComparePathId) => void;
  withShortlist: ComparePathId[];
}) {
  if (available.length <= 1) return null;

  const shortlisted = new Set(withShortlist);
  const items: BinderTabItem<ComparePathId>[] = COMPARE_PATH_OPTIONS.filter(
    (opt) => available.includes(opt.id),
  ).map((opt, index) => ({
    id: opt.id,
    label: opt.label,
    shortLabel: opt.shortLabel,
    step: index + 1,
    badge: shortlisted.has(opt.id),
    title: shortlisted.has(opt.id)
      ? `${opt.label} (on your shortlist)`
      : opt.label,
  }));

  return (
    <BinderTabs
      className="compare-path-binder"
      tone="paper"
      ariaLabel="Comparison path"
      dataTour="compare-paths"
      items={items}
      activeId={active}
      onChange={onChange}
    />
  );
}
