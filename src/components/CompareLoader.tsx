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
      <>
        <section className="hero">
          <div className="shell hero-inner">
            <p className="hero-brand">
              School<em>side</em>
            </p>
            <h1>Compare English schools side by side when you are choosing.</h1>
            <p className="postcode-error">{error}</p>
          </div>
        </section>
      </>
    );
  }

  if (!index) {
    return (
      <section className="hero">
        <div className="shell hero-inner">
          <p className="hero-brand">
            School<em>side</em>
          </p>
          <h1>Compare English schools side by side when you are choosing.</h1>
          <p>Loading English school performance data…</p>
        </div>
      </section>
    );
  }

  return <CompareApp index={index} />;
}
