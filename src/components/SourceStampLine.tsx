"use client";

import type { SourceStamp } from "@/lib/sourceStamp";
import { formatSourceStamp } from "@/lib/sourceStamp";

export function SourceStampLine({
  stamp,
  className,
}: {
  stamp: SourceStamp;
  className?: string;
}) {
  return (
    <p className={className ?? "source-stamp"} data-source-stamp={stamp.id}>
      <span className="source-stamp-label">Source</span>
      <span>{formatSourceStamp(stamp)}</span>
      {stamp.deepLink ? (
        <>
          {" · "}
          <a href={stamp.deepLink} target="_blank" rel="noreferrer">
            Official source ↗
          </a>
        </>
      ) : null}
      {stamp.note ? <span className="source-stamp-note">{stamp.note}</span> : null}
    </p>
  );
}
