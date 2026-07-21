"use client";

import { useEffect, useState } from "react";
import type { SchoolsIndex } from "@/lib/types";
import { loadSchoolsIndex } from "@/lib/data";
import { CompareApp } from "@/components/CompareApp";

export function CompareLoader() {
  const [index, setIndex] = useState<SchoolsIndex | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    loadSchoolsIndex()
      .then((data) => {
        if (!cancelled) setIndex(data);
      })
      .catch((err: Error) => {
        if (!cancelled) setError(err.message || "Could not load school data");
      });
    return () => {
      cancelled = true;
    };
  }, []);

  if (error) {
    return (
      <section className="section" id="compare">
        <div className="shell">
          <div className="empty-compare">
            Could not load the school index. {error}
          </div>
        </div>
      </section>
    );
  }

  if (!index) {
    return (
      <section className="section" id="compare">
        <div className="shell">
          <div className="empty-compare" aria-live="polite">
            Loading English school performance data…
          </div>
        </div>
      </section>
    );
  }

  return <CompareApp index={index} />;
}
