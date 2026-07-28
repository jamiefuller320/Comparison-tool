"use client";

import type { ChallengeBoardId, SourceStamp } from "@/lib/sourceStamp";
import type { DataGap } from "@/lib/dataGaps";
import { boardGaps } from "@/lib/dataGaps";
import { SourceStampLine } from "@/components/SourceStampLine";
import { ReportProblemButton } from "@/components/ReportProblemButton";
import { DataGapFlags } from "@/components/DataGapFlags";

/** Shared provenance + known-gap flags + challenge controls for a board. */
export function BoardProvenance({
  stamp,
  board,
  urn,
  schoolName,
  gaps,
}: {
  stamp: SourceStamp;
  board: ChallengeBoardId;
  urn?: string | null;
  schoolName?: string | null;
  gaps?: DataGap[] | null;
}) {
  const flags = boardGaps(gaps ?? []);
  return (
    <div className="board-provenance">
      <div className="board-provenance-main">
        <SourceStampLine stamp={stamp} />
        <DataGapFlags gaps={flags} />
      </div>
      <ReportProblemButton
        board={board}
        stamp={stamp}
        urn={urn}
        schoolName={schoolName}
      />
    </div>
  );
}
