"use client";

import { useCallback, useEffect, useState } from "react";
import type {
  ChildmindersIndex,
  EyProvidersIndex,
  SchoolsIndex,
} from "@/lib/types";
import {
  loadChildmindersIndex,
  loadEyProvidersIndex,
  loadSchoolsIndex,
} from "@/lib/data";
import { CompareApp } from "@/components/CompareApp";

export function CompareLoader() {
  const [index, setIndex] = useState<SchoolsIndex | null>(null);
  const [eyIndex, setEyIndex] = useState<EyProvidersIndex | null>(null);
  const [childmindersIndex, setChildmindersIndex] =
    useState<ChildmindersIndex | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [reloadToken, setReloadToken] = useState(0);

  const reloadIndex = useCallback(async () => {
    const [data, ey, childminders] = await Promise.all([
      loadSchoolsIndex(fetch, true),
      loadEyProvidersIndex(fetch, true),
      loadChildmindersIndex(fetch, true),
    ]);
    setIndex(data);
    setEyIndex(ey);
    setChildmindersIndex(childminders);
    setError(null);
    setReloadToken((n) => n + 1);
  }, []);

  useEffect(() => {
    let cancelled = false;
    Promise.all([
      loadSchoolsIndex(fetch, reloadToken > 0),
      loadEyProvidersIndex(fetch, reloadToken > 0),
      loadChildmindersIndex(fetch, reloadToken > 0),
    ])
      .then(([data, ey, childminders]) => {
        if (!cancelled) {
          setIndex(data);
          setEyIndex(ey);
          setChildmindersIndex(childminders);
          setError(null);
        }
      })
      .catch((err: Error) => {
        if (!cancelled) setError(err.message || "Could not load school data");
      });
    return () => {
      cancelled = true;
    };
  }, [reloadToken]);

  if (error && !index) {
    return (
      <section className="hero">
        <div className="shell hero-inner">
          <p className="hero-brand">
            School<em>side</em>
          </p>
          <h1>Compare English schools side by side when you are choosing.</h1>
          <p className="postcode-error">{error}</p>
        </div>
      </section>
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

  return (
    <CompareApp
      index={index}
      eyIndex={eyIndex}
      childmindersIndex={childmindersIndex}
      onIndexReload={reloadIndex}
    />
  );
}
