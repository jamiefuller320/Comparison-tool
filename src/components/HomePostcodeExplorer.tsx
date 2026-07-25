"use client";

import {
  useDeferredValue,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import dynamic from "next/dynamic";
import type { SchoolRecord } from "@/lib/types";
import { geocodePostcode, parseUkPostcode } from "@/lib/postcode";
import {
  fetchRoadDistances,
  findNearbySchools,
  fmtDistance,
  fmtDrive,
  type NearbySchool,
} from "@/lib/nearby";
import { fmtPct } from "@/lib/format";
import { PhaseSelector } from "@/components/PhaseSelector";
import { SectorSelector } from "@/components/SectorSelector";
import { EySettingSelector } from "@/components/EySettingSelector";
import {
  formatPhases,
  phasesFromAgeRange,
  schoolMatchesPhases,
  type PhaseId,
} from "@/lib/phases";
import {
  formatSector,
  resolveSchoolSector,
  schoolMatchesSectors,
  type SectorId,
} from "@/lib/sectors";
import { isEyDirectorySetting } from "@/lib/eyMetrics";
import type { EySettingId } from "@/lib/eySettings";
import { requestTourStart } from "@/lib/tour";

const NearbyMap = dynamic(
  () => import("@/components/NearbyMap").then((m) => m.NearbyMap),
  {
    ssr: false,
    loading: () => <div className="nearby-map" aria-hidden />,
  },
);

const RADIUS_OPTIONS_KM = [1, 2, 3, 5, 8, 10, 15] as const;

/** Allow denser rings to surface more schools as the range widens. */
function listLimitForRadius(radiusKm: number): number {
  return Math.min(120, Math.max(40, Math.round(radiusKm * 14)));
}

export function HomePostcodeExplorer({
  schools,
  selectedUrns,
  onToggle,
  stageFilter,
  onStageFilterChange,
  sectorFilter,
  onSectorFilterChange,
  eySettings,
  onEySettingsChange,
  max = 4,
}: {
  schools: SchoolRecord[];
  selectedUrns: string[];
  onToggle: (urn: string) => void;
  stageFilter: PhaseId[];
  onStageFilterChange: (next: PhaseId[]) => void;
  sectorFilter: SectorId[];
  onSectorFilterChange: (next: SectorId[]) => void;
  eySettings: EySettingId[];
  onEySettingsChange: (next: EySettingId[]) => void;
  max?: number;
}) {
  const [rawPostcode, setRawPostcode] = useState("");
  const [home, setHome] = useState<{
    postcode: string;
    latitude: number;
    longitude: number;
    adminDistrict?: string | null;
  } | null>(null);
  const [radiusKm, setRadiusKm] = useState<number>(3);
  const [error, setError] = useState<string | null>(null);
  const [lookingUp, setLookingUp] = useState(false);
  const [roadByUrn, setRoadByUrn] = useState<
    Record<string, { metres: number | null; minutes: number | null }>
  >({});
  const [roadsPending, setRoadsPending] = useState(false);
  const roadRequestId = useRef(0);
  const deferredRaw = useDeferredValue(rawPostcode);

  const parsedPreview = useMemo(
    () => parseUkPostcode(deferredRaw),
    [deferredRaw],
  );

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const fromUrl = params.get("postcode") || params.get("home");
    if (fromUrl) {
      setRawPostcode(fromUrl);
      void lookup(fromUrl);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const url = new URL(window.location.href);
    if (home?.postcode) url.searchParams.set("postcode", home.postcode);
    else url.searchParams.delete("postcode");
    window.history.replaceState({}, "", url.toString());
  }, [home]);

  async function lookup(explicit?: string) {
    const candidate = explicit ?? rawPostcode;
    const normalised = parseUkPostcode(candidate);
    if (!normalised) {
      setError("Enter a full UK postcode (for example SO40 2HR or so402hr).");
      setHome(null);
      return;
    }
    setLookingUp(true);
    setError(null);
    try {
      const geo = await geocodePostcode(normalised);
      if (!geo) {
        setError(`No match for ${normalised}. Check the postcode and try again.`);
        setHome(null);
        return;
      }
      setRawPostcode(geo.postcode);
      setHome({
        postcode: geo.postcode,
        latitude: geo.latitude,
        longitude: geo.longitude,
        adminDistrict: geo.adminDistrict,
      });
    } catch {
      setError("Postcode lookup is unavailable right now. Try again in a moment.");
    } finally {
      setLookingUp(false);
    }
  }

  // Schools are already sector/stage filtered by the parent; keep a defensive
  // match here so the map and list always track the active School type chips.
  const nearbyStraight = useMemo(() => {
    if (!home) return [] as NearbySchool[];
    return findNearbySchools(
      home,
      schools,
      radiusKm * 1000,
      listLimitForRadius(radiusKm),
      (school) => {
        if (!schoolMatchesPhases(school, stageFilter)) return false;
        // Day care + consented childminders bypass school-type chips in EY.
        if (
          isEyDirectorySetting(school) &&
          stageFilter.includes("early-years")
        ) {
          return true;
        }
        return schoolMatchesSectors(school, sectorFilter);
      },
    );
  }, [home, schools, radiusKm, stageFilter, sectorFilter]);

  useEffect(() => {
    // Drop stale road times as soon as the sector/stage filter changes so the
    // nearby pane does not briefly show distances for the previous set.
    setRoadByUrn({});
  }, [sectorFilter, stageFilter]);

  const nearby = useMemo(
    () =>
      nearbyStraight.map((school) => {
        const road = roadByUrn[school.urn];
        if (!road) return school;
        return {
          ...school,
          roadMetres: road.metres,
          roadMinutes: road.minutes,
        };
      }),
    [nearbyStraight, roadByUrn],
  );

  useEffect(() => {
    if (!home || nearbyStraight.length === 0) {
      setRoadByUrn({});
      setRoadsPending(false);
      return;
    }

    const requestId = ++roadRequestId.current;
    setRoadsPending(true);
    const withCoords = nearbyStraight.filter(
      (s) => s.latitude != null && s.longitude != null,
    );

    void (async () => {
      try {
        const roads = await fetchRoadDistances(
          { latitude: home.latitude, longitude: home.longitude },
          withCoords.map((s) => ({
            latitude: s.latitude as number,
            longitude: s.longitude as number,
          })),
        );
        if (requestId !== roadRequestId.current) return;
        const next: Record<
          string,
          { metres: number | null; minutes: number | null }
        > = {};
        withCoords.forEach((school, idx) => {
          next[school.urn] = {
            metres: roads[idx]?.metres ?? null,
            minutes: roads[idx]?.minutes ?? null,
          };
        });
        setRoadByUrn(next);
      } catch {
        if (requestId !== roadRequestId.current) return;
        setRoadByUrn({});
      } finally {
        if (requestId === roadRequestId.current) setRoadsPending(false);
      }
    })();
  }, [home, nearbyStraight]);

  const atMax = selectedUrns.length >= max;

  function handleRadiusChange(km: number) {
    setRadiusKm(km);
    // Drop stale road times immediately so the list reflects the new ring
    // without waiting for the next OSRM response.
    setRoadByUrn({});
  }

  return (
    <>
      <section className="hero" id="top" data-tour="hero">
        <div className="shell hero-inner">
          <p className="hero-brand">
            School<em>side</em>
          </p>
          <h1>Compare English schools side by side when you are choosing.</h1>
          <p>
            Start with your home postcode to map nearby schools and Hampshire
            early years day care, then compare published outcomes — parental
            shortlists, not a governance pack.
          </p>
          <p className="hero-tour-launch">
            <button
              type="button"
              className="btn btn-ghost"
              onClick={() => requestTourStart()}
            >
              How to use — quick tour
            </button>
          </p>

          <form
            className="postcode-form hero-postcode"
            data-tour="postcode"
            onSubmit={(e) => {
              e.preventDefault();
              void lookup();
            }}
          >
            <label className="sr-only" htmlFor="home-postcode">
              Home postcode
            </label>
            <div className="postcode-row">
              <input
                id="home-postcode"
                name="postcode"
                autoComplete="postal-code"
                spellCheck={false}
                placeholder="Home postcode — SO40 2HR, so402hr, SO40-2HR"
                value={rawPostcode}
                onChange={(e) => {
                  setRawPostcode(e.target.value);
                  setError(null);
                }}
                onBlur={() => {
                  const normalised = parseUkPostcode(rawPostcode);
                  if (normalised) setRawPostcode(normalised);
                }}
              />
              <button
                type="submit"
                className="btn btn-primary"
                disabled={lookingUp}
              >
                {lookingUp ? "Finding…" : "Find nearby"}
              </button>
            </div>
            <div className="postcode-meta hero-postcode-meta">
              {parsedPreview ? (
                <span>
                  Reading as <strong>{parsedPreview}</strong>
                </span>
              ) : rawPostcode.trim() ? (
                <span>Keep typing a full postcode…</span>
              ) : (
                <span>Accepts spaces, hyphens or compact forms.</span>
              )}
              {home?.adminDistrict ? (
                <span>
                  {" "}
                  · Located in <strong>{home.adminDistrict}</strong>
                </span>
              ) : null}
            </div>
            {error ? <p className="postcode-error">{error}</p> : null}
          </form>

          <PhaseSelector
            selected={stageFilter}
            onChange={onStageFilterChange}
            tone="hero"
            tourId="stages"
          />
          {stageFilter.includes("early-years") ? (
            <EySettingSelector
              selected={eySettings}
              onChange={onEySettingsChange}
              tone="hero"
              tourId="ey-settings"
            />
          ) : null}
          <SectorSelector
            selected={sectorFilter}
            onChange={onSectorFilterChange}
            tone="hero"
            tourId="sector"
          />
        </div>
      </section>

      {home ? (
        <section
          className="section postcode-section"
          id="nearby"
          data-tour="nearby"
        >
          <div className="shell">
            <div className="section-head">
              <h2>Schools near {home.postcode}</h2>
              <p>
                Showing{" "}
                {sectorFilter.includes("state") &&
                sectorFilter.includes("independent")
                  ? "state and independent"
                  : sectorFilter.includes("independent")
                    ? "independent"
                    : "state"}{" "}
                schools for the stages you selected. Range ring on the map,
                door-to-door road distance in the list — tick to compare.
              </p>
            </div>

            <div
              className="radius-row"
              role="group"
              aria-label="Search radius"
              data-tour="radius"
            >
              <span>Range ring</span>
              {RADIUS_OPTIONS_KM.map((km) => (
                <button
                  key={km}
                  type="button"
                  className={
                    km === radiusKm ? "radius-chip active" : "radius-chip"
                  }
                  aria-pressed={km === radiusKm}
                  onClick={() => handleRadiusChange(km)}
                >
                  {km} km
                </button>
              ))}
              {roadsPending ? (
                <span className="postcode-meta">Updating road times…</span>
              ) : null}
            </div>

            <div className="nearby-layout">
              <NearbyMap
                key={`map-${home.postcode}-${radiusKm}-${stageFilter.join("-")}-${sectorFilter.join("-")}`}
                home={home}
                schools={nearby}
                radiusMetres={radiusKm * 1000}
                selectedUrns={selectedUrns}
                refreshToken={`${radiusKm}:${stageFilter.join(",")}:${sectorFilter.join(",")}:${nearby.map((s) => s.urn).join(",")}`}
                onSelect={(urn) => {
                  if (selectedUrns.includes(urn) || !atMax) onToggle(urn);
                }}
              />

              <div className="nearby-list" aria-live="polite">
                <div className="nearby-list-head">
                  <strong>
                    {nearby.length} school{nearby.length === 1 ? "" : "s"} within{" "}
                    {radiusKm} km
                  </strong>
                  <span>
                    List updates with the range ring · tick to compare
                  </span>
                </div>
                {nearby.length === 0 ? (
                  <p className="footnote" style={{ padding: "1rem" }}>
                    No indexed schools in this ring. Try a wider range, another
                    stage, or include independent schools.
                  </p>
                ) : (
                  <ul
                    key={`nearby-${radiusKm}-${stageFilter.join("-")}-${sectorFilter.join("-")}`}
                  >
                    {nearby.map((school) => {
                      const checked = selectedUrns.includes(school.urn);
                      const disabled = !checked && atMax;
                      const sector = formatSector(resolveSchoolSector(school));
                      return (
                        <li key={school.urn}>
                          <label
                            className={
                              checked
                                ? "nearby-item selected"
                                : disabled
                                  ? "nearby-item disabled"
                                  : "nearby-item"
                            }
                          >
                            <input
                              type="checkbox"
                              checked={checked}
                              disabled={disabled}
                              onChange={() => onToggle(school.urn)}
                            />
                            <span className="nearby-item-body">
                              <strong>{school.name}</strong>
                              <span className="nearby-item-meta">
                                {[
                                  sector,
                                  formatPhases(
                                    phasesFromAgeRange(school.ageRange),
                                  ),
                                  `${fmtDistance(
                                    school.roadMetres ??
                                      school.straightLineMetres,
                                  )}${
                                    school.roadMetres != null
                                      ? " by road"
                                      : " straight-line"
                                  }`,
                                  school.roadMinutes != null
                                    ? `${fmtDrive(school.roadMinutes)} drive`
                                    : null,
                                  school.rwmExpected != null
                                    ? `${fmtPct(school.rwmExpected)} RWM`
                                    : school.att8Average != null
                                      ? `Att8 ${school.att8Average}`
                                      : school.ofstedOverall
                                        ? `Ofsted ${school.ofstedOverall}`
                                        : sector === "Independent"
                                          ? "No published KS2 figures"
                                          : null,
                                ]
                                  .filter(Boolean)
                                  .join(" · ")}
                              </span>
                            </span>
                          </label>
                        </li>
                      );
                    })}
                  </ul>
                )}
              </div>
            </div>
          </div>
        </section>
      ) : (
        <div id="nearby" />
      )}
    </>
  );
}
