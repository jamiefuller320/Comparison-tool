"use client";

import { useMemo, useState } from "react";
import type { SchoolRecord } from "@/lib/types";
import { searchSchools } from "@/lib/search";
import { formatPhases, phasesFromAgeRange } from "@/lib/phases";
import { requestForceRefresh } from "@/lib/data";

export function MissingSchoolButton({
  schools,
  onIndexReload,
}: {
  schools: SchoolRecord[];
  onIndexReload: () => Promise<void>;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [tone, setTone] = useState<"ok" | "warn" | "err">("ok");

  const matches = useMemo(() => {
    if (!query.trim()) return [];
    return searchSchools(schools, query, 5);
  }, [schools, query]);

  async function submit() {
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
      // Always attempt to pull the latest published index after a request.
      await onIndexReload();
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
        <div className="missing-school-panel" role="dialog" aria-label="Report a missing school">
          <p>
            Search first — many infants and secondaries are listed once the right
            stages and range are selected. If it is truly absent, this queues a
            directory rebuild (limited to <strong>one per day</strong>).
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
                  void submit();
                }
              }}
            />
            <button
              type="button"
              className="btn btn-primary"
              disabled={busy}
              onClick={() => void submit()}
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
