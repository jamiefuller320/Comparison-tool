"use client";

import { useEffect } from "react";
import { recordFeedbackUsage } from "@/lib/productFeedback";

/**
 * Keeps feedback usage signals fresh from the live compare journey.
 * Pair with a single site-wide ProductFeedbackPrompt in the root layout.
 */
export function FeedbackUsageBridge({
  shortlistCount = 0,
  shortlistLas = [],
  hadPostcode = false,
  openedSideBySide = false,
  sawVisitPack = false,
  stages = [],
  sectors = [],
}: {
  shortlistCount?: number;
  shortlistLas?: string[];
  hadPostcode?: boolean;
  openedSideBySide?: boolean;
  sawVisitPack?: boolean;
  stages?: string[];
  sectors?: string[];
}) {
  useEffect(() => {
    recordFeedbackUsage({
      shortlistCount,
      shortlistLas,
      hadPostcode,
      openedSideBySide,
      sawVisitPack,
      stages,
      sectors,
    });
  }, [
    shortlistCount,
    shortlistLas,
    hadPostcode,
    openedSideBySide,
    sawVisitPack,
    stages,
    sectors,
  ]);

  return null;
}
