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
import { StageMatchSelector } from "@/components/StageMatchSelector";
import { ProvisionSelector } from "@/components/ProvisionSelector";
import {
  formatPhases,
  phasesFromAgeRange,
  schoolMatchesPhases,
  schoolOffersSecondary,
  schoolStageIds,
  wantsChildminders,
  wantsEyMetrics,
  wantsKs4Metrics,
  type PhaseId,
  type StageMatchMode,
  DEFAULT_STAGE_MATCH,
} from "@/lib/phases";
import {
  formatSector,
  resolveSchoolSector,
  schoolMatchesSectors,
  type SectorId,
} from "@/lib/sectors";
import {
  schoolMatchesProvision,
  type ProvisionFilterId,
  DEFAULT_PROVISION,
} from "@/lib/provisionFilter";
import { isChildminder, isEyProvider } from "@/lib/eyMetrics";
import { requestTourStart } from "@/lib/tour";
import { recordFeedbackUsage } from "@/lib/productFeedback";
import {
  classifyKs4Missing,
  hasPublishedKs4,
  ks4MissingGapMeta,
} from "@/lib/dataGaps";
import {
  bandsForStages,
  catchmentRelationForSchool,
  catchmentRelationLabel,
  classifyCatchmentUnknown,
  featuresForUrns,
  homeCatchmentMatches,
  loadHampshireCatchments,
  type CatchmentCollection,
  type CatchmentFeature,
} from "@/lib/catchments";

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
  stageMatch = DEFAULT_STAGE_MATCH,
  onStageMatchChange,
  sectorFilter,
  onSectorFilterChange,
  provisionFilter = DEFAULT_PROVISION,
  onProvisionFilterChange,
  showComparableKs4Toggle = false,
  comparableKs4Only = true,
  onComparableKs4OnlyChange,
  max = 4,
}: {
  schools: SchoolRecord[];
  selectedUrns: string[];
  onToggle: (urn: string) => void;
  stageFilter: PhaseId[];
  onStageFilterChange: (next: PhaseId[]) => void;
  stageMatch?: StageMatchMode;
  onStageMatchChange?: (next: StageMatchMode) => void;
  sectorFilter: SectorId[];
  onSectorFilterChange: (next: SectorId[]) => void;
  provisionFilter?: ProvisionFilterId;
  onProvisionFilterChange?: (next: ProvisionFilterId) => void;
  showComparableKs4Toggle?: boolean;
  comparableKs4Only?: boolean;
  onComparableKs4OnlyChange?: (next: boolean) => void;
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
  const [showCatchments, setShowCatchments] = useState(false);
  const [catchments, setCatchments] = useState<CatchmentCollection | null>(
    null,
  );
  const [catchmentsLoading, setCatchmentsLoading] = useState(false);

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

  useEffect(() => {
    if (home?.postcode) recordFeedbackUsage({ hadPostcode: true });
  }, [home?.postcode]);

  useEffect(() => {
    if (!showCatchments) return;
    if (catchments) return;
    let cancelled = false;
    setCatchmentsLoading(true);
    void loadHampshireCatchments()
      .then((data) => {
        if (!cancelled) setCatchments(data);
      })
      .finally(() => {
        if (!cancelled) setCatchmentsLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [showCatchments, catchments]);

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

  // Parent passes stage + sector filtered schools; keep a defensive match so the
  // map and list stay aligned with the active chips.
  const nearbyStraight = useMemo(() => {
    if (!home) return [] as NearbySchool[];
    return findNearbySchools(
      home,
      schools,
      radiusKm * 1000,
      listLimitForRadius(radiusKm),
      (school) => {
        // Directory categories bypass school-type chips and age-range match.
        if (isEyProvider(school) && wantsEyMetrics(stageFilter)) {
          return provisionFilter !== "specialist";
        }
        if (isChildminder(school) && wantsChildminders(stageFilter)) {
          return provisionFilter !== "specialist";
        }
        if (!schoolMatchesPhases(school, stageFilter, stageMatch)) return false;
        if (!schoolMatchesSectors(school, sectorFilter)) return false;
        return schoolMatchesProvision(school, provisionFilter);
      },
    );
  }, [
    home,
    schools,
    radiusKm,
    stageFilter,
    stageMatch,
    sectorFilter,
    provisionFilter,
  ]);

  useEffect(() => {
    // Drop stale road times as soon as the sector/stage filter changes so the
    // nearby pane does not briefly show distances for the previous set.
    setRoadByUrn({});
  }, [sectorFilter, stageFilter, stageMatch, provisionFilter, comparableKs4Only]);

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

  const catchmentBands = useMemo(
    () => bandsForStages(stageFilter),
    [stageFilter],
  );

  const overlayCatchmentFeatures = useMemo((): CatchmentFeature[] => {
    if (!showCatchments || !catchments) return [];
    const nearbyUrns = nearby.map((s) => s.urn);
    const selectedInView = selectedUrns.filter((urn) =>
      nearbyUrns.includes(urn),
    );
    const focusUrns =
      selectedInView.length > 0
        ? selectedInView
        : nearbyUrns.slice(0, 12);
    return featuresForUrns(catchments, focusUrns, catchmentBands);
  }, [
    showCatchments,
    catchments,
    nearby,
    selectedUrns,
    catchmentBands,
  ]);

  const homeCatchmentNote = useMemo(() => {
    if (!showCatchments || !home || !catchments) return null;
    const matches = homeCatchmentMatches(
      home,
      catchments,
      nearby.map((s) => s.urn),
      catchmentBands,
    );
    if (matches.length === 0) {
      return "Outside catchments of schools shown for these stages";
    }
    const names = [...new Set(matches.map((m) => m.name || m.urn))].slice(0, 3);
    const more = matches.length > names.length ? "…" : "";
    return `In catchment: ${names.join(", ")}${more}`;
  }, [showCatchments, home, catchments, nearby, catchmentBands]);

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
      {/*
        Brand + H1 live in the server-rendered .seo-intro (page.tsx) so crawlers
        see them without JS. This block is the interactive hero controls only.
      */}
      <div className="hero-controls">
        <div className="shell hero-inner">
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
          {onStageMatchChange ? (
            <StageMatchSelector
              selected={stageMatch}
              stages={stageFilter}
              onChange={onStageMatchChange}
              tone="hero"
            />
          ) : null}
          <SectorSelector
            selected={sectorFilter}
            onChange={onSectorFilterChange}
            tone="hero"
            tourId="sector"
          />
          {onProvisionFilterChange ? (
            <ProvisionSelector
              selected={provisionFilter}
              onChange={onProvisionFilterChange}
              tone="hero"
              tourId="provision"
            />
          ) : null}
        </div>
      </div>

      {home ? (
        <section
          className="section postcode-section"
          id="nearby"
          data-tour="nearby"
        >
          <div className="shell">
            <div className="section-head">
              <h2>Near home · {home.postcode}</h2>
              <p>
                Showing{" "}
                {sectorFilter.includes("state") &&
                sectorFilter.includes("independent")
                  ? "state and independent"
                  : sectorFilter.includes("independent")
                    ? "independent"
                    : "state"}{" "}
                {provisionFilter === "specialist"
                  ? "specialist / AP "
                  : provisionFilter === "mainstream"
                    ? "mainstream "
                    : ""}
                schools for the stages you selected
                {stageMatch === "all" && schoolStageIds(stageFilter).length > 1
                  ? " (must cover every selected stage)"
                  : schoolStageIds(stageFilter).length > 1
                    ? " (any selected stage)"
                    : ""}
                . Range ring on the map, door-to-door road distance in the list —
                tick to shortlist.
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
              {showComparableKs4Toggle && onComparableKs4OnlyChange ? (
                <button
                  type="button"
                  className={
                    comparableKs4Only
                      ? "radius-chip active"
                      : "radius-chip"
                  }
                  aria-pressed={comparableKs4Only}
                  title="When on, secondaries without published Attainment 8 are hidden from the map and search (for example special or alternative provision). Turn off to see every matching secondary with a short reason chip."
                  onClick={() => onComparableKs4OnlyChange(!comparableKs4Only)}
                >
                  Comparable KS4 only
                </button>
              ) : null}
              <button
                type="button"
                className={
                  showCatchments ? "radius-chip active" : "radius-chip"
                }
                aria-pressed={showCatchments}
                title="Hampshire County Council catchment polygons for the stages you selected. Living in catchment does not guarantee a place; academies and faith schools may use different criteria."
                onClick={() => setShowCatchments((v) => !v)}
              >
                {catchmentsLoading ? "Catchments…" : "Catchments"}
              </button>
              {roadsPending ? (
                <span className="postcode-meta">Updating road times…</span>
              ) : null}
            </div>
            {showCatchments ? (
              <p className="footnote catchment-footnote">
                Hampshire catchments for the selected stages
                {homeCatchmentNote ? ` · ${homeCatchmentNote}` : ""}. Overlay is
                context only — confirm on the{" "}
                <a
                  href={
                    catchments?.source?.finder ||
                    "https://www.hants.gov.uk/educationandlearning/findaschool/schooldetails"
                  }
                  target="_blank"
                  rel="noreferrer"
                >
                  Hampshire school finder
                </a>
                .
              </p>
            ) : null}

            <div className="nearby-layout">
              <NearbyMap
                key={`map-${home.postcode}`}
                home={home}
                schools={nearby}
                radiusMetres={radiusKm * 1000}
                selectedUrns={selectedUrns}
                refreshToken={`${radiusKm}:${stageFilter.join(",")}:${sectorFilter.join(",")}:${comparableKs4Only}:${showCatchments}:${[...nearby].map((s) => s.urn).sort().join(",")}`}
                emphasizeKs4={wantsKs4Metrics(stageFilter)}
                comparableKs4Only={comparableKs4Only}
                catchmentFeatures={overlayCatchmentFeatures}
                homeCatchmentNote={homeCatchmentNote}
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
                    {showComparableKs4Toggle && comparableKs4Only
                      ? " · comparable KS4 only"
                      : null}
                  </span>
                </div>
                {nearby.length === 0 ? (
                  <p className="footnote" style={{ padding: "1rem" }}>
                    No indexed schools in this ring for the filters you chose.
                    Try a wider range, another stage
                    {showComparableKs4Toggle && comparableKs4Only
                      ? ", turn off “Comparable KS4 only” (special / alternative provision is hidden when it is on)"
                      : ""}
                    , or include independent schools.
                  </p>
                ) : (
                  <ul
                    key={`nearby-${radiusKm}-${stageFilter.join("-")}-${sectorFilter.join("-")}-${comparableKs4Only}`}
                  >
                    {nearby.map((school) => {
                      const checked = selectedUrns.includes(school.urn);
                      const disabled = !checked && atMax;
                      const sector = formatSector(resolveSchoolSector(school));
                      const showKs4Gap =
                        wantsKs4Metrics(stageFilter) &&
                        !comparableKs4Only &&
                        schoolOffersSecondary(school) &&
                        !hasPublishedKs4(school);
                      const ks4Gap = showKs4Gap
                        ? ks4MissingGapMeta(classifyKs4Missing(school))
                        : null;
                      const catchmentUnknown = showCatchments
                        ? classifyCatchmentUnknown(
                            home,
                            catchments,
                            school.urn,
                            catchmentBands,
                          )
                        : null;
                      const catchmentRelation = showCatchments
                        ? catchmentRelationForSchool(
                            home,
                            catchments,
                            school.urn,
                            catchmentBands,
                          )
                        : "unknown";
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
                                  ks4Gap
                                    ? `No comparable Att8 · ${ks4Gap.label}`
                                    : null,
                                  showCatchments
                                    ? catchmentRelationLabel(
                                        catchmentRelation,
                                        catchmentUnknown,
                                      )
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
