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
};

export default function PlanningMapInner({
  lat,
  lng,
  markers,
}: {
  lat: number;
  lng: number;
  markers?: MapMarker[];
}) {
  useEffect(() => {
    const container = document.getElementById("planning-map");
    if (!container) return;
    if ((container as unknown as { _leaflet_id?: number })._leaflet_id) {
      (container as unknown as { _leaflet_id?: number })._leaflet_id = undefined;
      container.innerHTML = "";
    }

    const map = L.map(container).setView([lat, lng], 14);
    L.tileLayer("https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png", {
      attribution: "© OpenStreetMap © CARTO",
    }).addTo(map);

    // Search location marker
    const searchIcon = L.divIcon({
      html: `<div style="width:16px;height:16px;background:#10B981;border-radius:50%;border:3px solid #fff;box-shadow:0 0 10px #10B981"></div>`,
      iconSize: [16, 16],
      iconAnchor: [8, 8],
      className: "",
    });
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

        L.marker([m.lat, m.lng], { icon })
          .addTo(map)
          .bindPopup(
            `<div style="color:#000;font-size:12px;max-width:220px">
              <b>${m.label}</b><br/>
              <span style="color:#666">${m.type.replace("hda-", "HDA: ").replace("-", " ")}</span>
            </div>`
          );

        bounds.extend([m.lat, m.lng]);
      });

      // Fit map to show all markers with padding
      map.fitBounds(bounds, { padding: [40, 40], maxZoom: 15 });
    }

    return () => {
      map.remove();
    };
  }, [lat, lng, markers]);

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
        </div>
      </div>
      <div id="planning-map" style={{ height: 400 }} />
    </div>
  );
}
