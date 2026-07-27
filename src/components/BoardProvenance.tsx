"use client";

import type { ChallengeBoardId, SourceStamp } from "@/lib/sourceStamp";
import { SourceStampLine } from "@/components/SourceStampLine";
import { ReportProblemButton } from "@/components/ReportProblemButton";

/** Shared provenance + challenge controls for a comparison board. */
export function BoardProvenance({
  stamp,
  board,
  urn,
  schoolName,
}: {
  stamp: SourceStamp;
  board: ChallengeBoardId;
  urn?: string | null;
  schoolName?: string | null;
}) {
  return (
    <div className="board-provenance">
      <SourceStampLine stamp={stamp} />
      <ReportProblemButton
        board={board}
        stamp={stamp}
        urn={urn}
        schoolName={schoolName}
      />
    </div>
  );
}
