"use client";

import {
  useDeferredValue,
  useEffect,
  useMemo,
  useState,
  useTransition,
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

const NearbyMap = dynamic(
  () => import("@/components/NearbyMap").then((m) => m.NearbyMap),
  {
    ssr: false,
    loading: () => <div className="nearby-map" aria-hidden />,
  },
);

const RADIUS_OPTIONS_KM = [1, 2, 3, 5, 8, 10] as const;

export function HomePostcodeExplorer({
  schools,
  selectedUrns,
  onToggle,
  max = 4,
}: {
  schools: SchoolRecord[];
  selectedUrns: string[];
  onToggle: (urn: string) => void;
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
  const [nearby, setNearby] = useState<NearbySchool[]>([]);
  const [roadsPending, startRoads] = useTransition();
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
      setNearby([]);
      return;
    }
    setLookingUp(true);
    setError(null);
    try {
      const geo = await geocodePostcode(normalised);
      if (!geo) {
        setError(`No match for ${normalised}. Check the postcode and try again.`);
        setHome(null);
        setNearby([]);
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

  useEffect(() => {
    if (!home) {
      setNearby([]);
      return;
    }
    const straight = findNearbySchools(home, schools, radiusKm * 1000, 35);
    setNearby(straight);

    const withCoords = straight.filter(
      (s) => s.latitude != null && s.longitude != null,
    );
    startRoads(() => {
      void (async () => {
        try {
          const roads = await fetchRoadDistances(
            { latitude: home.latitude, longitude: home.longitude },
            withCoords.map((s) => ({
              latitude: s.latitude as number,
              longitude: s.longitude as number,
            })),
          );
          setNearby((prev) =>
            prev.map((school) => {
              const idx = withCoords.findIndex((s) => s.urn === school.urn);
              if (idx < 0) return school;
              return {
                ...school,
                roadMetres: roads[idx]?.metres ?? null,
                roadMinutes: roads[idx]?.minutes ?? null,
              };
            }),
          );
        } catch {
          // Straight-line distances remain usable if routing fails.
        }
      })();
    });
  }, [home, schools, radiusKm]);

  const atMax = selectedUrns.length >= max;

  return (
    <>
      <section className="hero" id="top">
        <div className="shell hero-inner">
          <p className="hero-brand">
            School<em>side</em>
          </p>
          <h1>Compare English schools side by side when you are choosing.</h1>
          <p>
            Start with your home postcode to map nearby schools, then compare Key
            Stage 2 results — parental shortlists, not a governance pack.
          </p>

          <form
            className="postcode-form hero-postcode"
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
        </div>
      </section>

      {home ? (
        <section className="section postcode-section" id="nearby">
          <div className="shell">
            <div className="section-head">
              <h2>Schools near {home.postcode}</h2>
              <p>
                Range ring on the map, door-to-door road distance in the list.
                Tick schools to add them to your comparison shortlist.
              </p>
            </div>

            <div className="radius-row" role="group" aria-label="Search radius">
              <span>Range ring</span>
              {RADIUS_OPTIONS_KM.map((km) => (
                <button
                  key={km}
                  type="button"
                  className={
                    km === radiusKm ? "radius-chip active" : "radius-chip"
                  }
                  onClick={() => setRadiusKm(km)}
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
                home={home}
                schools={nearby}
                radiusMetres={radiusKm * 1000}
                selectedUrns={selectedUrns}
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
                  <span>Tick to compare · road distance where available</span>
                </div>
                {nearby.length === 0 ? (
                  <p className="footnote" style={{ padding: "1rem" }}>
                    No indexed schools in this ring. Try a wider range.
                  </p>
                ) : (
                  <ul>
                    {nearby.map((school) => {
                      const checked = selectedUrns.includes(school.urn);
                      const disabled = !checked && atMax;
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
                                {fmtDistance(
                                  school.roadMetres ?? school.straightLineMetres,
                                )}
                                {school.roadMetres != null
                                  ? " by road"
                                  : " straight-line"}
                                {school.roadMinutes != null
                                  ? ` · ${fmtDrive(school.roadMinutes)} drive`
                                  : ""}
                                {school.rwmExpected != null
                                  ? ` · ${fmtPct(school.rwmExpected)} RWM`
                                  : ""}
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
