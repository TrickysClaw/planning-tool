"use client";
import { useEffect } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import type { MapMarker } from "./PlanningMap";

const MARKER_COLORS: Record<string, string> = {
  search: "#10B981",
  "hda-declared": "#F59E0B",
  "hda-not-declared": "#EF4444",
  "hda-deferred": "#A855F7",
  "ssda": "#3B82F6",
};

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
  useEffect(() => {
    const container = document.getElementById("planning-map");
    if (!container) return;
    if ((container as unknown as { _leaflet_id?: number })._leaflet_id) {
      (container as unknown as { _leaflet_id?: number })._leaflet_id = undefined;
      container.innerHTML = "";
    }

    const map = L.map(container, {
      zoomControl: false,
    }).setView([lat, lng], 14);

    // Add zoom control with custom position
    L.control.zoom({ position: "topright" }).addTo(map);

    L.tileLayer("https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png", {
      attribution: "© OpenStreetMap © CARTO",
    }).addTo(map);

    // Lot polygon
    if (polygon && polygon.length > 2) {
      L.polygon(polygon, {
        color: "#10B981",
        weight: 2,
        fillColor: "#10B981",
        fillOpacity: 0.2,
      }).addTo(map);
    }

    // Search location marker with glow
    const searchIcon = L.divIcon({
      html: `<div style="position:relative">
        <div style="position:absolute;top:-8px;left:-8px;width:32px;height:32px;background:rgba(16,185,129,0.15);border-radius:50%;animation:pulse-glow 2s ease-in-out infinite"></div>
        <div style="width:16px;height:16px;background:#10B981;border-radius:50%;border:3px solid #fff;box-shadow:0 0 12px #10B981,0 0 24px rgba(16,185,129,0.3)"></div>
      </div>`,
      iconSize: [16, 16],
      iconAnchor: [8, 8],
      className: "",
    });

    // Add pulse animation
    const style = document.createElement("style");
    style.textContent = `@keyframes pulse-glow { 0%,100% { transform:scale(1);opacity:0.6 } 50% { transform:scale(1.5);opacity:0 } }`;
    document.head.appendChild(style);

    L.marker([lat, lng], { icon: searchIcon })
      .addTo(map)
      .bindPopup(`<b style="color:#000">Searched Address</b>`);

    // HDA markers
    if (markers?.length) {
      const bounds = L.latLngBounds([[lat, lng]]);

      markers.forEach((m) => {
        const color = MARKER_COLORS[m.type] || "#F59E0B";
        const icon = L.divIcon({
          html: `<div style="width:12px;height:12px;background:${color};border-radius:50%;border:2px solid rgba(255,255,255,0.7);box-shadow:0 0 6px ${color}"></div>`,
          iconSize: [12, 12],
          iconAnchor: [6, 6],
          className: "",
        });

        const typeLabel = m.type.replace("hda-", "").replace("-", " ").replace(/^\w/, c => c.toUpperCase());
        const dwellingsHtml = m.dwellings ? `<br/>🏠 <b>${m.dwellings.toLocaleString()}</b> dwellings` : "";
        const recHtml = m.recommendation ? `<br/><span style="color:${color};font-weight:600">${typeLabel}</span>` : "";
        const linkHtml = m.briefingUrl ? `<br/><a href="${m.briefingUrl}" target="_blank" style="color:#10B981;font-size:11px">View HDA Briefing →</a>` : "";

        L.marker([m.lat, m.lng], { icon })
          .addTo(map)
          .bindPopup(
            `<div style="color:#000;font-size:12px;max-width:250px;line-height:1.5">
              <b>${m.label}</b>${dwellingsHtml}${recHtml}${linkHtml}
            </div>`
          );

        bounds.extend([m.lat, m.lng]);
      });

      map.fitBounds(bounds, { padding: [60, 60], maxZoom: 15 });
    }

    return () => {
      map.remove();
      style.remove();
    };
  }, [lat, lng, markers, polygon]);

  return (
    <div className="glass-card !p-0 overflow-hidden mt-4">
      <div className="px-4 py-2 border-b border-white/[0.05] flex items-center gap-4">
        <span className="text-sm font-medium text-white">Map</span>
        <div className="flex items-center gap-3 ml-auto text-[10px] text-slate-400">
          <span className="flex items-center gap-1">
            <span style={{ width: 8, height: 8, borderRadius: "50%", background: "#10B981", display: "inline-block" }} />
            Searched
          </span>
          <span className="flex items-center gap-1">
            <span style={{ width: 8, height: 8, borderRadius: "50%", background: "#F59E0B", display: "inline-block" }} />
            HDA Declared
          </span>
          <span className="flex items-center gap-1">
            <span style={{ width: 8, height: 8, borderRadius: "50%", background: "#EF4444", display: "inline-block" }} />
            HDA Not Declared
          </span>
          <span className="flex items-center gap-1">
            <span style={{ width: 8, height: 8, borderRadius: "50%", background: "#3B82F6", display: "inline-block" }} />
            SSDA Project
          </span>
        </div>
      </div>
      <div id="planning-map" style={{ height: 500 }} />
      <style jsx global>{`
        .leaflet-control-zoom a {
          background: rgba(7, 11, 20, 0.85) !important;
          color: #fff !important;
          border-color: rgba(255,255,255,0.1) !important;
        }
        .leaflet-control-zoom a:hover {
          background: rgba(16, 185, 129, 0.3) !important;
        }
      `}</style>
    </div>
  );
}
