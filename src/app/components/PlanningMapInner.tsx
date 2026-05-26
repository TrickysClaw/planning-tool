"use client";
import { useEffect, useRef } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import type { MapMarker } from "./PlanningMap";

const MARKER_COLORS: Record<string, string> = {
  search: "#10B981",
  "hda-declared": "#06B6D4",
  "hda-not-declared": "#F43F5E",
  "hda-deferred": "#8B5CF6",
  ssda: "#6366F1",
  "da-under-assessment": "#FBBF24",
  "da-determined": "#38BDF8",
  "da-rejected": "#F43F5E",
};

if (typeof document !== "undefined") {
  const id = "leaflet-pulse-style";
  if (!document.getElementById(id)) {
    const s = document.createElement("style");
    s.id = id;
    s.textContent = `@keyframes pulse-glow{0%,100%{transform:scale(1);opacity:.6}50%{transform:scale(1.8);opacity:0}}`;
    document.head.appendChild(s);
  }
}

function getZoneColor(zoneCode?: string): string {
  const base = zoneCode?.replace(/\s.*/, "") || "";
  if (base === "R2") return "#FCD34D";
  if (base === "R3") return "#FB923C";
  if (base === "R4") return "#EF4444";
  if (["B1", "B2", "B4", "MU1"].includes(base)) return "#A78BFA";
  if (base.startsWith("E") || base.startsWith("C")) return "#34D399";
  if (base.startsWith("IN")) return "#94A3B8";
  if (base.startsWith("RE")) return "#6EE7B7";
  return "#10B981";
}

export default function PlanningMapInner({
  lat,
  lng,
  markers,
  polygon,
  lgaBoundary,
  zoneCode,
}: {
  lat: number;
  lng: number;
  markers?: MapMarker[];
  polygon?: [number, number][];
  lgaBoundary?: [number, number][];
  zoneCode?: string;
}) {
  const mapRef = useRef<L.Map | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const layerGroupRef = useRef<L.LayerGroup | null>(null);

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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    const lg = layerGroupRef.current;
    if (!map || !lg) return;

    lg.clearLayers();
    const bounds = L.latLngBounds([[lat, lng]]);

    // LGA boundary — faint outline showing council area
    if (lgaBoundary && lgaBoundary.length > 2) {
      const lgaPoly = L.polygon(lgaBoundary, {
        color: "#64748B",
        weight: 2,
        fillColor: "#64748B",
        fillOpacity: 0.03,
        dashArray: "8 4",
        interactive: false,
      });
      lg.addLayer(lgaPoly);
    }

    // Lot polygon
    if (polygon && polygon.length > 2) {
      const polyColor = getZoneColor(zoneCode);
      const poly = L.polygon(polygon, {
        color: polyColor,
        weight: 4,
        fillColor: polyColor,
        fillOpacity: 0.3,
        dashArray: "6 3",
      });
      poly.bindPopup(`<b style="color:#000">Your Property Boundary</b>`);
      lg.addLayer(poly);
      poly.bringToFront();
      bounds.extend(poly.getBounds());
    }

    // Search marker — large pin with house icon, distinct from small dot markers
    const searchIcon = L.divIcon({
      html: `<div style="position:relative;display:flex;align-items:center;justify-content:center">
        <div style="position:absolute;top:-16px;left:-16px;width:56px;height:56px;background:rgba(16,185,129,0.1);border-radius:50%;animation:pulse-glow 2s ease-in-out infinite"></div>
        <div style="width:28px;height:28px;background:#fff;border-radius:50%;border:4px solid #10B981;box-shadow:0 0 16px rgba(16,185,129,0.5),0 2px 8px rgba(0,0,0,0.3);display:flex;align-items:center;justify-content:center">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#10B981" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path><polyline points="9 22 9 12 15 12 15 22"></polyline></svg>
        </div>
      </div>`,
      iconSize: [28, 28],
      iconAnchor: [14, 14],
      className: "",
    });
    const searchMarker = L.marker([lat, lng], { icon: searchIcon })
      .bindPopup(`<b style="color:#000">Searched Address</b>`);
    lg.addLayer(searchMarker);

    // Project markers
    let hasExtras = false;
    if (markers?.length) {
      markers.forEach((m) => {
        hasExtras = true;
        const color = MARKER_COLORS[m.color || ""] || "#F59E0B";
        const icon = L.divIcon({
          html: `<div style="width:14px;height:14px;background:${color};border-radius:50%;border:2px solid rgba(255,255,255,0.8);box-shadow:0 0 8px ${color}"></div>`,
          iconSize: [14, 14],
          iconAnchor: [7, 7],
          className: "",
        });

        const marker = L.marker([m.lat, m.lng], { icon }).bindPopup(
          `<div style="color:#000;font-size:12px;max-width:250px;line-height:1.5"><b>${m.label}</b></div>`
        );
        lg.addLayer(marker);
        bounds.extend([m.lat, m.lng]);
      });
    }

    // Zoom logic
    if (hasExtras) {
      map.fitBounds(bounds, { padding: [60, 60], maxZoom: 16 });
    } else if (polygon && polygon.length > 2) {
      map.fitBounds(bounds, { padding: [80, 80], maxZoom: 18 });
    } else {
      map.setView([lat, lng], 17);
    }

    setTimeout(() => searchMarker.openPopup(), 300);
  }, [lat, lng, markers, polygon, lgaBoundary, zoneCode]);

  return (
    <div className="glass-card !p-0 overflow-hidden mt-4">
      <div className="px-4 py-2 border-b border-white/[0.05] flex items-center gap-4">
        <span className="text-sm font-medium text-white">📍 Map</span>
        <div className="flex items-center gap-3 ml-auto text-[10px] text-slate-400 flex-wrap">
          <span className="flex items-center gap-1">
            <span style={{ width: 12, height: 12, borderRadius: "50%", background: "#fff", border: "3px solid #10B981", display: "inline-block" }} />
            Your Property
          </span>
          <span className="flex items-center gap-1">
            <span style={{ width: 8, height: 8, borderRadius: "50%", background: "#06B6D4", display: "inline-block" }} />
            Fast-tracked Project
          </span>
          <span className="flex items-center gap-1">
            <span style={{ width: 8, height: 8, borderRadius: "50%", background: "#F43F5E", display: "inline-block" }} />
            Rejected Project
          </span>
          <span className="flex items-center gap-1">
            <span style={{ width: 8, height: 8, borderRadius: "50%", background: "#6366F1", display: "inline-block" }} />
            Major Project
          </span>
          <span className="flex items-center gap-1">
            <span style={{ width: 8, height: 8, borderRadius: "50%", background: "#FBBF24", display: "inline-block" }} />
            DA Under Assessment
          </span>
          <span className="flex items-center gap-1">
            <span style={{ width: 8, height: 8, borderRadius: "50%", background: "#38BDF8", display: "inline-block" }} />
            DA Determined
          </span>
          <span className="flex items-center gap-1">
            <span style={{ width: 12, height: 8, border: "1.5px dashed #64748B", display: "inline-block" }} />
            LGA Boundary
          </span>
        </div>
      </div>
      <div ref={containerRef} style={{ height: 550 }} />
    </div>
  );
}
