"use client";
import { useEffect, useRef, useState } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

interface SearchResult {
  lat: number;
  lng: number;
  zone: string;
  zoneLabel: string;
  area: number;
  frontage: number;
  lotId: string;
  rings: number[][][];
}

function aerialUrl(rings: number[][][], width = 200, height = 130): string {
  if (!rings?.[0]?.length) return "";
  let xmin = Infinity, ymin = Infinity, xmax = -Infinity, ymax = -Infinity;
  for (const [x, y] of rings[0]) {
    if (x < xmin) xmin = x;
    if (x > xmax) xmax = x;
    if (y < ymin) ymin = y;
    if (y > ymax) ymax = y;
  }
  // Pad bbox slightly
  const pad = 0.0002;
  xmin -= pad; ymin -= pad; xmax += pad; ymax += pad;
  return `https://maps.six.nsw.gov.au/arcgis/rest/services/public/NSW_Imagery/MapServer/export?bbox=${xmin},${ymin},${xmax},${ymax}&bboxSR=4326&size=${width},${height}&format=png&f=image`;
}

const ZONE_COLORS: Record<string, string> = {
  R1: "#22C55E",
  R2: "#FCD34D",
  R3: "#FB923C",
  R4: "#EF4444",
  R5: "#A3E635",
  MU1: "#A78BFA",
  B1: "#818CF8",
  B2: "#6366F1",
  B4: "#A78BFA",
  B5: "#7C3AED",
  B6: "#5B21B6",
  B7: "#4C1D95",
  IN1: "#94A3B8",
  IN2: "#64748B",
  E4: "#475569",
  RU1: "#86EFAC",
  RU2: "#6EE7B7",
  RU4: "#34D399",
  RU5: "#10B981",
};

export default function SearchMapView({
  results,
  center,
  radiusKm,
  onResultClick,
}: {
  results: SearchResult[];
  center: { lat: number; lng: number } | null;
  radiusKm: number;
  onResultClick: (r: SearchResult) => void;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const layerRef = useRef<L.LayerGroup | null>(null);
  const [isDark, setIsDark] = useState(true);

  // Initialize map
  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    const dark = document.documentElement.classList.contains("dark");
    setIsDark(dark);

    const map = L.map(containerRef.current, {
      zoomControl: true,
      center: center ? [center.lat, center.lng] : [-33.87, 151.21],
      zoom: 14,
    });

    const tileUrl = dark
      ? "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
      : "https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png";

    L.tileLayer(tileUrl, { attribution: "© OpenStreetMap © CARTO" }).addTo(map);
    layerRef.current = L.layerGroup().addTo(map);
    mapRef.current = map;

    return () => {
      map.remove();
      mapRef.current = null;
      layerRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Listen for theme changes
  useEffect(() => {
    const handler = () => {
      const map = mapRef.current;
      if (!map) return;
      const dark = document.documentElement.classList.contains("dark");
      setIsDark(dark);
      // Swap tiles
      map.eachLayer((l) => { if (l instanceof L.TileLayer) map.removeLayer(l); });
      const url = dark
        ? "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
        : "https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png";
      L.tileLayer(url, { attribution: "© OpenStreetMap © CARTO" }).addTo(map);
    };
    window.addEventListener("themechange", handler);
    return () => window.removeEventListener("themechange", handler);
  }, []);

  // Update markers/polygons when results change
  useEffect(() => {
    const map = mapRef.current;
    const lg = layerRef.current;
    if (!map || !lg) return;

    lg.clearLayers();

    if (!results.length && center) {
      map.setView([center.lat, center.lng], 14);
      return;
    }

    const bounds = L.latLngBounds([]);

    // Draw search radius circle
    if (center) {
      const circle = L.circle([center.lat, center.lng], {
        radius: radiusKm * 1000,
        color: "var(--accent, #6366F1)",
        weight: 1.5,
        fillOpacity: 0.03,
        dashArray: "6 4",
        interactive: false,
      });
      lg.addLayer(circle);
      bounds.extend(circle.getBounds());
    }

    // Draw lot polygons
    results.forEach((r) => {
      if (!r.rings?.length) return;

      const color = ZONE_COLORS[r.zone] || "#6366F1";
      const latlngs = r.rings[0].map(([x, y]) => [y, x] as [number, number]);

      const poly = L.polygon(latlngs, {
        color,
        weight: 2,
        fillColor: color,
        fillOpacity: 0.35,
        className: "search-result-poly",
      });

      // Tooltip on hover with aerial thumbnail
      const lotLabel = r.lotId ? `Lot ${r.lotId}` : "";
      const imgUrl = aerialUrl(r.rings, 220, 120);
      poly.bindTooltip(
        `<div style="font-size:12px;line-height:1.5;min-width:200px">
          ${imgUrl ? `<img src="${imgUrl}" style="width:100%;height:120px;object-fit:cover;border-radius:6px;margin-bottom:6px" loading="lazy" />` : ""}
          <div style="font-weight:700;margin-bottom:2px">${r.zone} — ${r.zoneLabel}</div>
          ${lotLabel ? `<div>${lotLabel}</div>` : ""}
          <div>${r.area.toLocaleString()} m² · ~${r.frontage}m frontage</div>
        </div>`,
        { sticky: true, direction: "top", opacity: 0.95, className: "aerial-tooltip" }
      );

      poly.bindPopup(
        `<div style="color:#000;font-size:12px;line-height:1.6;min-width:160px">
          <div style="font-weight:700;font-size:13px;margin-bottom:4px">${r.zone} — ${r.zoneLabel}</div>
          <div><b>Area:</b> ${r.area.toLocaleString()} m²</div>
          <div><b>Frontage:</b> ~${r.frontage}m</div>
          <div style="margin-top:8px"><a href="/address?lat=${r.lat}&lng=${r.lng}&q=${encodeURIComponent(r.zone + " lot")}" style="color:#4F46E5;font-weight:600;text-decoration:none">View full details →</a></div>
        </div>`,
        { maxWidth: 250 }
      );

      poly.on("click", () => onResultClick(r));
      lg.addLayer(poly);
      bounds.extend(poly.getBounds());
    });

    if (bounds.isValid()) {
      map.fitBounds(bounds, { padding: [40, 40], maxZoom: 17 });
    }
  }, [results, center, radiusKm, onResultClick]);

  return (
    <div className="w-full h-full relative">
      <div ref={containerRef} className="w-full h-full" />
    </div>
  );
}
