"use client";

import { useMemo, useState } from "react";
import type { SchoolRecord } from "@/lib/types";
import { searchSchools } from "@/lib/search";
import { formatPhases, phasesFromAgeRange } from "@/lib/phases";
import { requestForceRefresh, requestLaPack } from "@/lib/data";
import { SEED_GEOGRAPHY_LABEL, isSeedLocalAuthority } from "@/lib/seedScope";

export function MissingSchoolButton({
  schools,
  onIndexReload,
}: {
  schools: SchoolRecord[];
  onIndexReload: () => Promise<void>;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [laQuery, setLaQuery] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [tone, setTone] = useState<"ok" | "warn" | "err">("ok");

  const matches = useMemo(() => {
    if (!query.trim()) return [];
    return searchSchools(schools, query, 5);
  }, [schools, query]);

  async function submitHampshire() {
    const q = query.trim();
    if (!q) {
      setTone("warn");
      setMessage("Enter a school name or URN first.");
      return;
    }
    setBusy(true);
    setMessage(null);
    try {
      if (matches.length) {
        setTone("ok");
        setMessage(
          `“${matches[0].name}” is already in the directory` +
            (matches[0].ageRange
              ? ` (ages ${matches[0].ageRange}` +
                (formatPhases(phasesFromAgeRange(matches[0].ageRange))
                  ? ` · ${formatPhases(phasesFromAgeRange(matches[0].ageRange))}`
                  : "") +
                ")."
              : ".") +
            " Try widening the range ring or adjusting the stage filters.",
        );
        setBusy(false);
        return;
      }

      const result = await requestForceRefresh(q);
      setTone(result.ok ? "ok" : result.status === "limited" ? "warn" : "err");
      setMessage(result.detail);
      await onIndexReload();
    } finally {
      setBusy(false);
    }
  }

  async function submitLaPack() {
    const la = laQuery.trim();
    if (!la) {
      setTone("warn");
      setMessage("Enter a local authority name (exact DfE label, e.g. Surrey).");
      return;
    }
    if (isSeedLocalAuthority(la)) {
      setTone("warn");
      setMessage(
        `${SEED_GEOGRAPHY_LABEL} is already the maintained set — use “Update directory” above for a Hampshire refresh.`,
      );
      return;
    }
    setBusy(true);
    setMessage(null);
    try {
      const result = await requestLaPack(la);
      setTone(result.ok ? "ok" : result.status === "limited" ? "warn" : "err");
      setMessage(result.detail);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="missing-school">
      <button
        type="button"
        className="btn btn-ghost missing-school-trigger"
        onClick={() => {
          setOpen((v) => !v);
          setMessage(null);
        }}
      >
        A school is missing
      </button>

      {open ? (
        <div
          className="missing-school-panel"
          role="dialog"
          aria-label="Report a missing school"
        >
          <p>
            This build maintains <strong>{SEED_GEOGRAPHY_LABEL}</strong> schools
            and early years settings, and silently includes any other local
            authorities already collated into the directory. Search first — many
            infants and secondaries appear once the right stages and range are
            selected. If a {SEED_GEOGRAPHY_LABEL} setting is truly absent, this
            queues a maintained-set rebuild (limited to{" "}
            <strong>one per day</strong>).
          </p>
          <div className="postcode-row">
            <input
              type="search"
              placeholder="School name or URN"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  void submitHampshire();
                }
              }}
            />
            <button
              type="button"
              className="btn btn-primary"
              disabled={busy}
              onClick={() => void submitHampshire()}
            >
              {busy ? "Working…" : "Update directory"}
            </button>
          </div>
          {matches.length > 0 ? (
            <ul className="missing-school-matches">
              {matches.map((school) => (
                <li key={school.urn}>
                  <strong>{school.name}</strong>
                  <span>
                    {[
                      formatPhases(phasesFromAgeRange(school.ageRange)),
                      school.town,
                      school.postcode,
                      `URN ${school.urn}`,
                    ]
                      .filter(Boolean)
                      .join(" · ")}
                  </span>
                </li>
              ))}
            </ul>
          ) : null}

          <p className="footnote" style={{ marginTop: "1rem" }}>
            Outside {SEED_GEOGRAPHY_LABEL}? Request coverage for another local
            authority (exact DfE label). When the build deploys, those schools
            appear on the map and in search automatically — no pack to activate.
            Limited to one area build per day.
          </p>
          <div className="postcode-row">
            <input
              type="search"
              placeholder="Local authority (e.g. Surrey)"
              value={laQuery}
              onChange={(e) => setLaQuery(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  void submitLaPack();
                }
              }}
            />
            <button
              type="button"
              className="btn btn-ghost"
              disabled={busy}
              onClick={() => void submitLaPack()}
            >
              Request area coverage
            </button>
          </div>

          {message ? (
            <p
              className={
                tone === "err"
                  ? "postcode-error"
                  : tone === "warn"
                    ? "missing-school-warn"
                    : "missing-school-ok"
              }
            >
              {message}
            </p>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
