"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import type { SchoolRecord, SchoolsIndex } from "@/lib/types";
import { SchoolSearch } from "@/components/SchoolSearch";
import { ComparisonBoard } from "@/components/ComparisonBoard";
import { SelectedChips, SuggestAlternatives } from "@/components/SelectedChips";
import { headlineForParents, suggestAlternatives } from "@/lib/compare";

const DEFAULT_URNS = ["116338", "116051", "116007"];

export function CompareApp({ index }: { index: SchoolsIndex }) {
  const byUrn = useMemo(
    () => new Map(index.schools.map((s) => [s.urn, s])),
    [index.schools],
  );

  const defaultUrns = DEFAULT_URNS.filter((urn) => byUrn.has(urn));
  const [selected, setSelected] = useState<string[]>(
    defaultUrns.length >= 2 ? defaultUrns.slice(0, 3) : [],
  );
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const raw = params.get("schools") || params.get("urns");
    if (!raw) return;
    const urns = raw
      .split(",")
      .map((u) => u.trim())
      .filter((u) => byUrn.has(u))
      .slice(0, 4);
    if (urns.length) setSelected(urns);
  }, [byUrn]);

  useEffect(() => {
    const url = new URL(window.location.href);
    if (selected.length) url.searchParams.set("schools", selected.join(","));
    else url.searchParams.delete("schools");
    window.history.replaceState({}, "", url.toString());
  }, [selected]);

  const selectedSchools: SchoolRecord[] = selected
    .map((urn) => byUrn.get(urn))
    .filter((s): s is SchoolRecord => Boolean(s));

  const focus = selectedSchools[0];
  const suggestions = useMemo(() => {
    if (!focus) return [];
    return suggestAlternatives(focus, index.schools, 6).filter(
      (s) => !selected.includes(s.urn),
    );
  }, [focus, index.schools, selected]);

  function addSchool(urn: string) {
    startTransition(() => {
      setSelected((prev) => {
        if (prev.includes(urn) || prev.length >= 4) return prev;
        return [...prev, urn];
      });
    });
  }

  function removeSchool(urn: string) {
    startTransition(() => {
      setSelected((prev) => prev.filter((u) => u !== urn));
    });
  }

  return (
    <>
      <section className="section" id="compare">
        <div className="shell">
          <div className="section-head">
            <h2>Build your shortlist</h2>
            <p>
              Search any English school with published Key Stage 2 results, then
              compare up to four side by side. Figures are for parents weighing
              a choice — not a governing-board briefing.
            </p>
            <div className="stats-line">
              <span>
                <strong>{index.stats.schoolCount.toLocaleString("en-GB")}</strong>{" "}
                schools indexed
              </span>
              <span>
                Latest year <strong>{index.period}</strong>
              </span>
              <span>
                Refreshed <strong>{index.generatedAt}</strong>
              </span>
            </div>
          </div>

          <SchoolSearch
            schools={index.schools}
            selectedUrns={selected}
            onAdd={addSchool}
          />
          <SelectedChips schools={selectedSchools} onRemove={removeSchool} />

          {focus ? (
            <p className="footnote" style={{ marginTop: "1rem" }}>
              <strong>{focus.name}:</strong>{" "}
              {headlineForParents(focus, index.benchmarks.england.rwmExpected)}
              {pending ? " Updating…" : null}
            </p>
          ) : null}
        </div>
      </section>

      <section className="section" style={{ paddingTop: 0 }}>
        <div className="shell">
          <div className="section-head">
            <h2>Side by side</h2>
            <p>
              Expected standards, scaled scores, cohort context and group
              differences — with England shown as the parental benchmark on
              percentage measures.
            </p>
          </div>
          <ComparisonBoard
            schools={selectedSchools}
            england={index.benchmarks.england}
          />
        </div>
      </section>

      {suggestions.length > 0 ? (
        <section className="section" style={{ paddingTop: 0 }}>
          <div className="shell">
            <div className="section-head">
              <h2>Other schools you might weigh</h2>
              <p>
                Suggested from the same local authority or postcode area, with a
                similar phase and cohort size — then ordered toward stronger
                published outcomes.
              </p>
            </div>
            <SuggestAlternatives suggestions={suggestions} onAdd={addSchool} />
          </div>
        </section>
      ) : null}
    </>
  );
}
