"use client";

import type { LaPackManifest, LaPackManifestEntry } from "@/lib/laPacks";
import { SEED_GEOGRAPHY_LABEL, listReadyPacks } from "@/lib/laPacks";

/** Activate / clear an on-demand LA pack layered onto the Hampshire seed. */
export function LaPackPicker({
  manifest,
  activeSlug,
  busy,
  error,
  hint,
  onActivate,
  onClear,
}: {
  manifest: LaPackManifest | null;
  activeSlug: string | null;
  busy?: boolean;
  error?: string | null;
  hint?: string | null;
  onActivate: (pack: LaPackManifestEntry) => void;
  onClear: () => void;
}) {
  const ready = listReadyPacks(manifest);

  return (
    <div className="la-pack-picker" data-tour="la-pack">
      <p className="footnote" style={{ marginBottom: "0.55rem" }}>
        <strong>Area packs:</strong> {SEED_GEOGRAPHY_LABEL} stays the default.
        Activate a ready on-demand pack to add that local authority’s schools to
        search and the map. Pack schools are often primary/secondary — Early
        years alone will not show them.
      </p>
      {ready.length === 0 ? (
        <p className="footnote" style={{ margin: 0 }}>
          No area packs are ready yet. Request one below (exact DfE local
          authority label). After the build deploys, it will appear here.
        </p>
      ) : (
        <div className="la-pack-picker-row">
          <label className="la-pack-picker-label">
            <span className="sr-only">Active area pack</span>
            <select
              value={activeSlug || ""}
              disabled={busy}
              onChange={(e) => {
                const slug = e.target.value;
                if (!slug) {
                  onClear();
                  return;
                }
                const pack = ready.find((p) => p.slug === slug);
                if (pack) onActivate(pack);
              }}
            >
              <option value="">{SEED_GEOGRAPHY_LABEL} only</option>
              {ready.map((pack) => (
                <option key={pack.slug} value={pack.slug}>
                  {pack.localAuthority}
                  {pack.schoolCount != null
                    ? ` (${pack.schoolCount.toLocaleString("en-GB")} schools)`
                    : ""}
                </option>
              ))}
            </select>
          </label>
          {activeSlug ? (
            <button
              type="button"
              className="btn btn-ghost"
              disabled={busy}
              onClick={onClear}
            >
              Clear pack
            </button>
          ) : null}
        </div>
      )}
      {busy ? (
        <p className="footnote" style={{ margin: "0.45rem 0 0" }}>
          Loading area pack…
        </p>
      ) : null}
      {hint && !error ? (
        <p className="missing-school-ok" style={{ marginTop: "0.55rem" }}>
          {hint}
        </p>
      ) : null}
      {error ? <p className="postcode-error">{error}</p> : null}
    </div>
  );
}
