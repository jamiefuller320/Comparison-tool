"use client";

import { useEffect, useMemo, useRef } from "react";
import L from "leaflet";
import type { NearbySchool } from "@/lib/nearby";
import "leaflet/dist/leaflet.css";

const RING_STYLE = {
  color: "#0b4f6c",
  weight: 1.5,
  dashArray: "6 6",
  fillColor: "#0b4f6c",
  fillOpacity: 0.06,
};

function schoolIcon(selected: boolean, focused: boolean) {
  const fill = selected ? "#c45c26" : focused ? "#1f6b4a" : "#0b4f6c";
  return L.divIcon({
    className: "school-marker",
    html: `<span style="
      display:block;width:14px;height:14px;border-radius:50%;
      background:${fill};border:2px solid #fff;
      box-shadow:0 1px 4px rgba(20,35,58,.35);
    "></span>`,
    iconSize: [14, 14],
    iconAnchor: [7, 7],
  });
}

function homeIcon() {
  return L.divIcon({
    className: "home-marker",
    html: `<span style="
      display:block;width:18px;height:18px;border-radius:50%;
      background:#c45c26;border:3px solid #fff7ef;
      box-shadow:0 2px 8px rgba(196,92,38,.45);
    "></span>`,
    iconSize: [18, 18],
    iconAnchor: [9, 9],
  });
}

export function NearbyMap({
  home,
  schools,
  radiusMetres,
  selectedUrns,
  focusUrn,
  refreshToken,
  onSelect,
}: {
  home: { latitude: number; longitude: number; postcode: string };
  schools: NearbySchool[];
  radiusMetres: number;
  selectedUrns: string[];
  focusUrn?: string | null;
  /** Changes whenever range/stages/results change — forces a redraw + rescale. */
  refreshToken?: string;
  onSelect: (urn: string) => void;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const layersRef = useRef<L.LayerGroup | null>(null);
  const onSelectRef = useRef(onSelect);
  onSelectRef.current = onSelect;

  const selectedSet = useMemo(() => new Set(selectedUrns), [selectedUrns]);
  const schoolKey = schools.map((s) => s.urn).join(",");

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;
    const map = L.map(containerRef.current, {
      scrollWheelZoom: false,
      zoomControl: true,
    }).setView([home.latitude, home.longitude], 12);

    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution:
        '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
      maxZoom: 18,
    }).addTo(map);

    layersRef.current = L.layerGroup().addTo(map);
    mapRef.current = map;

    requestAnimationFrame(() => map.invalidateSize());

    return () => {
      map.remove();
      mapRef.current = null;
      layersRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    const layers = layersRef.current;
    if (!map || !layers) return;

    layers.clearLayers();

    const ring = L.circle([home.latitude, home.longitude], {
      radius: radiusMetres,
      ...RING_STYLE,
    }).addTo(layers);

    L.marker([home.latitude, home.longitude], {
      icon: homeIcon(),
      title: `Home · ${home.postcode}`,
      zIndexOffset: 500,
    })
      .bindPopup(`<strong>Home</strong><br/>${home.postcode}`)
      .addTo(layers);

    for (const school of schools) {
      if (school.latitude == null || school.longitude == null) continue;
      const marker = L.marker([school.latitude, school.longitude], {
        icon: schoolIcon(selectedSet.has(school.urn), focusUrn === school.urn),
        title: school.name,
      });
      marker.bindPopup(
        `<strong>${school.name}</strong><br/>` +
          `${school.rwmExpected != null ? `${school.rwmExpected}% RWM · ` : ""}` +
          `tap list to compare`,
      );
      marker.on("click", () => onSelectRef.current(school.urn));
      marker.addTo(layers);
    }

    map.invalidateSize();
    map.fitBounds(ring.getBounds(), {
      animate: true,
      padding: [28, 28],
      maxZoom: 15,
    });
  }, [
    home,
    schools,
    schoolKey,
    radiusMetres,
    selectedSet,
    focusUrn,
    refreshToken,
  ]);

  return (
    <div
      ref={containerRef}
      className="nearby-map"
      role="img"
      aria-label={`Map of schools within ${Math.round(radiusMetres / 1000)} kilometres`}
    />
  );
}
