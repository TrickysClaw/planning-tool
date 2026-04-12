"use client";
import { useEffect, useRef } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import type { MapMarker } from "./PlanningMap";

const MARKER_COLORS: Record<string, string> = {
  search: "#10B981",
  "hda-declared": "#F59E0B",
  "hda-not-declared": "#EF4444",
  "hda-deferred": "#A855F7",
  ssda: "#3B82F6",
  "da-under-assessment": "#F97316",
  "da-determined": "#10B981",
  "da-rejected": "#EF4444",
};

// Inject pulse animation once
if (typeof document !== "undefined") {
  const id = "leaflet-pulse-style";
  if (!document.getElementById(id)) {
    const s = document.createElement("style");
    s.id = id;
    s.textContent = `@keyframes pulse-glow{0%,100%{transform:scale(1);opacity:.6}50%{transform:scale(1.8);opacity:0}}`;
    document.head.appendChild(s);
  }
}

export default function PlanningMapInner({
  lat,
  lng,
  markers,
  polygon,
}: {
  lat: number;
  lng: number;
  markers?: MapMarker[];
  polygon?: [number, number][];
}) {
  const mapRef = useRef<L.Map | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const layerGroupRef = useRef<L.LayerGroup | null>(null);

  // Create map once
  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    const map = L.map(containerRef.current, {
      zoomControl: false,
      center: [lat, lng],
      zoom: 17,
    });

    L.control.zoom({ position: "topright" }).addTo(map);
    L.tileLayer("https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png", {
      attribution: "© OpenStreetMap © CARTO",
    }).addTo(map);

    layerGroupRef.current = L.layerGroup().addTo(map);
    mapRef.current = map;

    return () => {
      map.remove();
      mapRef.current = null;
      layerGroupRef.current = null;
    };
    // Only create once — don't depend on lat/lng
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Update markers/polygon/center when props change
  useEffect(() => {
    const map = mapRef.current;
    const lg = layerGroupRef.current;
    if (!map || !lg) return;

    lg.clearLayers();

    const bounds = L.latLngBounds([[lat, lng]]);

    // Lot polygon
    if (polygon && polygon.length > 2) {
      const poly = L.polygon(polygon, {
        color: "#10B981",
        weight: 3,
        fillColor: "#10B981",
        fillOpacity: 0.25,
        dashArray: "6 3",
      });
      poly.bindPopup(`<b style="color:#000">Your Property Boundary</b>`);
      lg.addLayer(poly);
      bounds.extend(poly.getBounds());
    }

    // Search marker
    const searchIcon = L.divIcon({
      html: `<div style="position:relative">
        <div style="position:absolute;top:-12px;left:-12px;width:40px;height:40px;background:rgba(16,185,129,0.12);border-radius:50%;animation:pulse-glow 2s ease-in-out infinite"></div>
        <div style="width:16px;height:16px;background:#10B981;border-radius:50%;border:3px solid #fff;box-shadow:0 0 12px #10B981,0 0 24px rgba(16,185,129,0.3)"></div>
      </div>`,
      iconSize: [16, 16],
      iconAnchor: [8, 8],
      className: "",
    });
    const searchMarker = L.marker([lat, lng], { icon: searchIcon })
      .bindPopup(`<b style="color:#000">Searched Address</b>`);
    lg.addLayer(searchMarker);

    // HDA markers
    let hasHda = false;
    if (markers?.length) {
      markers.forEach((m) => {
        hasHda = true;
        const color = MARKER_COLORS[m.type] || "#F59E0B";
        const icon = L.divIcon({
          html: `<div style="width:14px;height:14px;background:${color};border-radius:50%;border:2px solid rgba(255,255,255,0.8);box-shadow:0 0 8px ${color}"></div>`,
          iconSize: [14, 14],
          iconAnchor: [7, 7],
          className: "",
        });

        const typeLabel = m.type
          .replace("hda-", "")
          .replace("-", " ")
          .replace(/^\w/, (c) => c.toUpperCase());
        const dwl = m.dwellings
          ? `<br/>🏠 <b>${m.dwellings.toLocaleString()}</b> dwellings`
          : "";
        const rec = m.recommendation
          ? `<br/><span style="color:${color};font-weight:600">${typeLabel}</span>`
          : "";
        const link = m.briefingUrl
          ? `<br/><a href="${m.briefingUrl}" target="_blank" style="color:#10B981;font-size:11px">View HDA Briefing →</a>`
          : "";

        const marker = L.marker([m.lat, m.lng], { icon }).bindPopup(
          `<div style="color:#000;font-size:12px;max-width:250px;line-height:1.5">
            <b>${m.label}</b>${dwl}${rec}${link}
          </div>`
        );
        lg.addLayer(marker);
        bounds.extend([m.lat, m.lng]);
      });
    }

    // Zoom logic
    if (hasHda) {
      map.fitBounds(bounds, { padding: [60, 60], maxZoom: 16 });
    } else if (polygon && polygon.length > 2) {
      map.fitBounds(bounds, { padding: [80, 80], maxZoom: 18 });
    } else {
      map.setView([lat, lng], 17);
    }

    // Open search popup after a tick (avoids race)
    setTimeout(() => searchMarker.openPopup(), 300);
  }, [lat, lng, markers, polygon]);

  return (
    <div className="glass-card !p-0 overflow-hidden mt-4">
      <div className="px-4 py-2 border-b border-white/[0.05] flex items-center gap-4">
        <span className="text-sm font-medium text-white">📍 Map</span>
        <div className="flex items-center gap-3 ml-auto text-[10px] text-slate-400 flex-wrap">
          <span className="flex items-center gap-1">
            <span
              style={{
                width: 8,
                height: 8,
                borderRadius: "50%",
                background: "#10B981",
                display: "inline-block",
              }}
            />
            Your Property
          </span>
          <span className="flex items-center gap-1">
            <span
              style={{
                width: 8,
                height: 8,
                borderRadius: "50%",
                background: "#F59E0B",
                display: "inline-block",
              }}
            />
            Fast-tracked Project
          </span>
          <span className="flex items-center gap-1">
            <span
              style={{
                width: 8,
                height: 8,
                borderRadius: "50%",
                background: "#EF4444",
                display: "inline-block",
              }}
            />
            Rejected Project
          </span>
          <span className="flex items-center gap-1">
            <span
              style={{
                width: 8,
                height: 8,
                borderRadius: "50%",
                background: "#3B82F6",
                display: "inline-block",
              }}
            />
            Major Project
          </span>
          <span className="flex items-center gap-1">
            <span
              style={{
                width: 8,
                height: 8,
                borderRadius: "50%",
                background: "#F97316",
                display: "inline-block",
              }}
            />
            DA Under Assessment
          </span>
          <span className="flex items-center gap-1">
            <span
              style={{
                width: 8,
                height: 8,
                borderRadius: "50%",
                background: "#10B981",
                display: "inline-block",
              }}
            />
            DA Determined
          </span>
        </div>
      </div>
      <div ref={containerRef} style={{ height: 550 }} />
      <style jsx global>{`
        .leaflet-control-zoom a {
          background: rgba(7, 11, 20, 0.85) !important;
          color: #fff !important;
          border-color: rgba(255, 255, 255, 0.1) !important;
        }
        .leaflet-control-zoom a:hover {
          background: rgba(16, 185, 129, 0.3) !important;
        }
      `}</style>
    </div>
  );
}
