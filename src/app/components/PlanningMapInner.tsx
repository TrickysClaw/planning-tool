"use client";
import { useEffect } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

export default function PlanningMapInner({ lat, lng }: { lat: number; lng: number }) {
  useEffect(() => {
    const container = document.getElementById("planning-map");
    if (!container) return;
    // Clear previous
    if ((container as any)._leaflet_id) {
      (container as any)._leaflet_id = null;
      container.innerHTML = "";
    }
    const map = L.map(container).setView([lat, lng], 16);
    L.tileLayer("https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png", {
      attribution: '© OpenStreetMap © CARTO',
    }).addTo(map);

    const icon = L.divIcon({
      html: `<div style="width:16px;height:16px;background:#10B981;border-radius:50%;border:3px solid #fff;box-shadow:0 0 10px #10B981"></div>`,
      iconSize: [16, 16],
      iconAnchor: [8, 8],
      className: "",
    });
    L.marker([lat, lng], { icon }).addTo(map);

    return () => { map.remove(); };
  }, [lat, lng]);

  return <div id="planning-map" className="glass-card !p-0 overflow-hidden" style={{ height: 400 }} />;
}
