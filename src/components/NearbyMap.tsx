"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import L from "leaflet";
import type { NearbySchool } from "@/lib/nearby";
import {
  classifyKs4Missing,
  hasPublishedKs4,
  ks4MissingGapMeta,
} from "@/lib/dataGaps";
import { schoolOffersSecondary } from "@/lib/phases";
import type { CatchmentFeature } from "@/lib/catchments";
import "leaflet/dist/leaflet.css";

const RING_STYLE = {
  color: "#0b4f6c",
  weight: 1.5,
  dashArray: "6 6",
  fillColor: "#0b4f6c",
  fillOpacity: 0.06,
};

const CATCHMENT_STYLE_SELECTED = {
  color: "#c45c26",
  weight: 2,
  fillColor: "#c45c26",
  fillOpacity: 0.14,
};

const CATCHMENT_STYLE_NEARBY = {
  color: "#0b4f6c",
  weight: 1.25,
  fillColor: "#0b4f6c",
  fillOpacity: 0.08,
};

/** Avoid Leaflet’s default pin/shadow assets (broken URLs look like triangles). */
const EMPTY_DEFAULT_ICON = L.divIcon({
  className: "leaflet-default-hidden",
  html: "",
  iconSize: [0, 0],
  iconAnchor: [0, 0],
});

function schoolIcon(
  selected: boolean,
  focused: boolean,
  muted = false,
) {
  const fill = selected
    ? "#c45c26"
    : focused
      ? "#1f6b4a"
      : muted
        ? "#8a9bb0"
        : "#0b4f6c";
  const opacity = muted && !selected ? "0.55" : "1";
  return L.divIcon({
    className: "school-marker",
    html: `<span style="
      display:block;width:14px;height:14px;border-radius:50%;
      background:${fill};border:2px solid #fff;opacity:${opacity};
      box-shadow:0 1px 4px rgba(20,35,58,.35);
    "></span>`,
    iconSize: [14, 14],
    iconAnchor: [7, 7],
  });
}

function homeIcon(unlocked: boolean) {
  return L.divIcon({
    className: unlocked ? "home-marker home-marker-unlocked" : "home-marker",
    html: `<span style="
      display:block;width:${unlocked ? 22 : 18}px;height:${unlocked ? 22 : 18}px;border-radius:50%;
      background:#c45c26;border:3px solid #fff7ef;
      box-shadow:0 2px 8px rgba(196,92,38,.45);
      cursor:${unlocked ? "grab" : "default"};
    "></span>`,
    iconSize: unlocked ? [22, 22] : [18, 18],
    iconAnchor: unlocked ? [11, 11] : [9, 9],
  });
}

export function NearbyMap({
  home,
  schools,
  radiusMetres,
  selectedUrns,
  focusUrn,
  refreshToken,
  emphasizeKs4 = false,
  comparableKs4Only = true,
  catchmentFeatures = [],
  homeCatchmentNote,
  relocating = false,
  relocateError = null,
  onSelect,
  onHomeRelocate,
}: {
  home: { latitude: number; longitude: number; postcode: string };
  schools: NearbySchool[];
  radiusMetres: number;
  selectedUrns: string[];
  focusUrn?: string | null;
  /** Changes whenever range/stages/results change — forces a redraw + rescale. */
  refreshToken?: string;
  emphasizeKs4?: boolean;
  comparableKs4Only?: boolean;
  catchmentFeatures?: CatchmentFeature[];
  homeCatchmentNote?: string | null;
  relocating?: boolean;
  relocateError?: string | null;
  onSelect: (urn: string) => void;
  /** Fired when the unlocked home pin is dropped — parent reverse-geocodes. */
  onHomeRelocate?: (next: { latitude: number; longitude: number }) => void;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const layersRef = useRef<L.LayerGroup | null>(null);
  const homeMarkerRef = useRef<L.Marker | null>(null);
  const ringRef = useRef<L.Circle | null>(null);
  const onSelectRef = useRef(onSelect);
  onSelectRef.current = onSelect;
  const onHomeRelocateRef = useRef(onHomeRelocate);
  onHomeRelocateRef.current = onHomeRelocate;
  /** Bumps after Leaflet map + layer group exist so marker redraw cannot race init. */
  const [mapReady, setMapReady] = useState(0);
  const [pinUnlocked, setPinUnlocked] = useState(false);
  /** Dropped pin while reverse-geocode runs — keeps short moves from snapping back. */
  const pendingPinRef = useRef<{ latitude: number; longitude: number } | null>(
    null,
  );

  const selectedSet = useMemo(() => new Set(selectedUrns), [selectedUrns]);
  // Order-independent so a stage-prefer reorder alone does not force a full fitBounds.
  const schoolKey = useMemo(
    () =>
      [...schools]
        .map((s) => s.urn)
        .sort()
        .join(","),
    [schools],
  );
  const catchmentKey = useMemo(
    () =>
      catchmentFeatures
        .map((f) => `${f.properties.urn}:${f.properties.band}`)
        .sort()
        .join("|"),
    [catchmentFeatures],
  );

  useEffect(() => {
    if (!containerRef.current) return;
    const map = L.map(containerRef.current, {
      dragging: true,
      scrollWheelZoom: true,
      doubleClickZoom: true,
      boxZoom: true,
      keyboard: true,
      touchZoom: true,
      zoomControl: true,
    }).setView([home.latitude, home.longitude], 12);

    // Carto Positron — fewer peak/POI glyphs than stock OSM tiles.
    L.tileLayer("https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png", {
      attribution:
        '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/attributions">CARTO</a>',
      maxZoom: 18,
      subdomains: "abcd",
    }).addTo(map);

    layersRef.current = L.layerGroup().addTo(map);
    mapRef.current = map;
    setMapReady((n) => n + 1);
    setPinUnlocked(false);
    pendingPinRef.current = null;

    requestAnimationFrame(() => map.invalidateSize());

    return () => {
      map.remove();
      mapRef.current = null;
      layersRef.current = null;
      homeMarkerRef.current = null;
      ringRef.current = null;
    };
    // Keep the map instance across pin nudges — remounting snapped short drags.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!mapReady) return;
    const map = mapRef.current;
    const layers = layersRef.current;
    if (!map || !layers) return;

    layers.clearLayers();
    homeMarkerRef.current = null;
    ringRef.current = null;

    for (const feature of catchmentFeatures) {
      if (!feature.geometry) continue;
      const urn = feature.properties.urn || "";
      const selected = urn ? selectedSet.has(urn) : false;
      const layer = L.geoJSON(feature as never, {
        style: selected ? CATCHMENT_STYLE_SELECTED : CATCHMENT_STYLE_NEARBY,
        pointToLayer: (_feature, latlng) =>
          L.marker(latlng, { icon: EMPTY_DEFAULT_ICON }),
      });
      const label = feature.properties.name || "School catchment";
      layer.bindPopup(
        `<strong>${label}</strong><br/>Hampshire catchment · not a place guarantee`,
      );
      layer.addTo(layers);
    }

    const pin = pendingPinRef.current ?? home;
    const ring = L.circle([pin.latitude, pin.longitude], {
      radius: radiusMetres,
      ...RING_STYLE,
    }).addTo(layers);
    ringRef.current = ring;

    const homePopup =
      `<strong>Home</strong><br/>${home.postcode}` +
      (homeCatchmentNote ? `<br/>${homeCatchmentNote}` : "") +
      (pinUnlocked
        ? "<br/><em>Drag this pin, then release to update the map</em>"
        : "");

    const marker = L.marker([pin.latitude, pin.longitude], {
      icon: homeIcon(pinUnlocked),
      title: pinUnlocked
        ? `Drag to move home · ${home.postcode}`
        : `Home · ${home.postcode}`,
      zIndexOffset: 500,
      draggable: pinUnlocked,
      autoPan: true,
    })
      .bindPopup(homePopup)
      .addTo(layers);

    if (pinUnlocked) {
      marker.on("dragend", () => {
        const { lat, lng } = marker.getLatLng();
        pendingPinRef.current = { latitude: lat, longitude: lng };
        onHomeRelocateRef.current?.({ latitude: lat, longitude: lng });
      });
      marker.openPopup();
    }

    homeMarkerRef.current = marker;

    for (const school of schools) {
      if (school.latitude == null || school.longitude == null) continue;
      const notComparable =
        emphasizeKs4 &&
        !comparableKs4Only &&
        schoolOffersSecondary(school) &&
        !hasPublishedKs4(school);
      const gapLabel = notComparable
        ? ks4MissingGapMeta(classifyKs4Missing(school)).label
        : null;
      const schoolMarker = L.marker([school.latitude, school.longitude], {
        icon: schoolIcon(
          selectedSet.has(school.urn),
          focusUrn === school.urn,
          Boolean(notComparable),
        ),
        title: school.name,
      });
      schoolMarker.bindPopup(
        `<strong>${school.name}</strong><br/>` +
          `${school.rwmExpected != null ? `${school.rwmExpected}% RWM · ` : ""}` +
          `${school.att8Average != null ? `Att8 ${school.att8Average} · ` : ""}` +
          `${gapLabel ? `No comparable Att8 · ${gapLabel}<br/>` : ""}` +
          `tap list to compare`,
      );
      schoolMarker.on("click", () => onSelectRef.current(school.urn));
      schoolMarker.addTo(layers);
    }

    map.invalidateSize();
    // Keep framing stable while the pin is unlocked for drag.
    if (!pinUnlocked && !pendingPinRef.current) {
      map.fitBounds(ring.getBounds(), {
        animate: true,
        padding: [28, 28],
        maxZoom: 15,
      });
    }
  }, [
    mapReady,
    home,
    schools,
    schoolKey,
    radiusMetres,
    selectedSet,
    focusUrn,
    refreshToken,
    emphasizeKs4,
    comparableKs4Only,
    catchmentFeatures,
    catchmentKey,
    homeCatchmentNote,
    pinUnlocked,
  ]);

  useEffect(() => {
    const marker = homeMarkerRef.current;
    const dragging = marker?.dragging;
    if (!dragging) return;
    if (pinUnlocked && !relocating) dragging.enable();
    else dragging.disable();
  }, [pinUnlocked, relocating, mapReady]);

  // Parent caught up with the dropped pin — clear pending and re-lock.
  useEffect(() => {
    if (relocating || relocateError || !pendingPinRef.current) return;
    pendingPinRef.current = null;
    setPinUnlocked(false);
    const map = mapRef.current;
    const ring = ringRef.current;
    if (map && ring) {
      map.fitBounds(ring.getBounds(), {
        animate: true,
        padding: [28, 28],
        maxZoom: 15,
      });
    }
  }, [home.latitude, home.longitude, home.postcode, relocating, relocateError]);

  // Failed reverse-geocode: put the pin back on the current home.
  useEffect(() => {
    if (relocating || !relocateError) return;
    pendingPinRef.current = null;
    homeMarkerRef.current?.setLatLng([home.latitude, home.longitude]);
    ringRef.current?.setLatLng([home.latitude, home.longitude]);
  }, [relocating, relocateError, home.latitude, home.longitude]);

  const canRelocate = Boolean(onHomeRelocate);

  return (
    <div
      className={
        pinUnlocked ? "nearby-map-frame is-pin-unlocked" : "nearby-map-frame"
      }
    >
      <div
        ref={containerRef}
        className="nearby-map"
        role="application"
        aria-label={`Map of schools within ${Math.round(radiusMetres / 1000)} kilometres. Scroll or pinch to zoom; unlock postcode to move home.`}
      />
      {canRelocate ? (
        <div className="nearby-map-chrome">
          <div className="nearby-map-chrome-row">
            {pinUnlocked ? (
              <>
                <p className="nearby-map-hint">
                  {relocating
                    ? "Finding the nearest postcode…"
                    : "Drag the orange home pin, then release to refresh the map"}
                </p>
                <button
                  type="button"
                  className="btn btn-ghost nearby-map-unlock"
                  disabled={relocating}
                  onClick={() => {
                    pendingPinRef.current = null;
                    setPinUnlocked(false);
                  }}
                >
                  Lock postcode
                </button>
              </>
            ) : (
              <button
                type="button"
                className="btn btn-ghost nearby-map-unlock"
                disabled={relocating}
                onClick={() => setPinUnlocked(true)}
              >
                Unlock postcode
              </button>
            )}
          </div>
          {relocateError ? (
            <p className="nearby-map-error" role="status">
              {relocateError}
            </p>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
