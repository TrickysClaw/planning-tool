"use client";
import { useEffect, useRef, useState, useCallback } from "react";
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
  "cdc-under-assessment": "#FB923C",
  "cdc-determined": "#A78BFA",
  "cdc-rejected": "#F43F5E",
  "cc-determined": "#14B8A6",
  "amenity-train": "#3B82F6",
  "amenity-bus": "#EAB308",
  "amenity-school": "#A855F7",
  "amenity-shopping": "#EC4899",
  "amenity-medical": "#EF4444",
  "amenity-park": "#22C55E",
  "amenity-dining": "#F97316",
};

type LayerCategory = "hda" | "da" | "cdc" | "cc" | "amenities";

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
  streetViewUrl,
  focusPoint,
}: {
  lat: number;
  lng: number;
  markers?: MapMarker[];
  polygon?: [number, number][];
  lgaBoundary?: [number, number][];
  zoneCode?: string;
  streetViewUrl?: string;
  focusPoint?: { lat: number; lng: number } | null;
}) {
  const mapRef = useRef<L.Map | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const layerGroupRef = useRef<L.LayerGroup | null>(null);
  const tileLayerRef = useRef<L.TileLayer | null>(null);
  const [activeLayers, setActiveLayers] = useState<Record<LayerCategory, boolean>>({
    hda: true, da: true, cdc: true, cc: true, amenities: true,
  });
  const [satellite, setSatellite] = useState(false);
  const [fullscreen, setFullscreen] = useState(false);
  const [legendOpen, setLegendOpen] = useState(false);
  const [isDark, setIsDark] = useState(true);

  // Ref-based tile swap — avoids React effect/closure issues
  const swapTilesRef = useRef<() => void>(() => {});
  swapTilesRef.current = () => {
    const map = mapRef.current;
    if (!map) return;
    if (tileLayerRef.current) {
      map.removeLayer(tileLayerRef.current);
      tileLayerRef.current = null;
    }
    const dark = document.documentElement.classList.contains("dark");
    setIsDark(dark);
    let url: string;
    let attr: string;
    if (satellite) {
      url = "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}";
      attr = "© Esri";
    } else if (dark) {
      url = "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png";
      attr = "© OpenStreetMap © CARTO";
    } else {
      url = "https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png";
      attr = "© OpenStreetMap © CARTO";
    }
    const tile = L.tileLayer(url, { attribution: attr }).addTo(map);
    tile.setZIndex(0);
    tileLayerRef.current = tile;
  };

  // Listen for theme changes via custom event (fired by ThemeToggle)
  useEffect(() => {
    const handler = () => swapTilesRef.current();
    window.addEventListener("themechange", handler);
    return () => window.removeEventListener("themechange", handler);
  }, []);

  const toggleLayer = useCallback((layer: LayerCategory) => {
    setActiveLayers((prev) => ({ ...prev, [layer]: !prev[layer] }));
  }, []);

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    const map = L.map(containerRef.current, {
      zoomControl: false,
      center: [lat, lng],
      zoom: 17,
    });

    L.control.zoom({ position: "topright" }).addTo(map);
    const initDark = document.documentElement.classList.contains("dark");
    setIsDark(initDark);
    const tileUrl = initDark
      ? "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
      : "https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png";
    const tile = L.tileLayer(tileUrl, {
      attribution: "© OpenStreetMap © CARTO",
    }).addTo(map);
    tileLayerRef.current = tile;

    layerGroupRef.current = L.layerGroup().addTo(map);
    mapRef.current = map;

    return () => {
      map.remove();
      mapRef.current = null;
      layerGroupRef.current = null;
      tileLayerRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Toggle satellite tiles
  useEffect(() => {
    if (mapRef.current) swapTilesRef.current();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [satellite]);

  // Invalidate map size on fullscreen toggle + hide page nav
  useEffect(() => {
    const map = mapRef.current;
    if (map) {
      setTimeout(() => map.invalidateSize(), 50);
      setTimeout(() => map.invalidateSize(), 350);
    }
    document.body.classList.toggle("map-fullscreen", fullscreen);
    return () => { document.body.classList.remove("map-fullscreen"); };
  }, [fullscreen]);

  // Escape key exits fullscreen
  useEffect(() => {
    if (!fullscreen) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") setFullscreen(false);
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [fullscreen]);

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

    // Search marker
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

    // Project markers — filtered by active layers
    let hasExtras = false;
    if (markers?.length) {
      markers.forEach((m) => {
        const colorKey = m.color || "";
        // Determine category
        const isHDA = colorKey.startsWith("hda-");
        const isDA = colorKey.startsWith("da-");
        const isCDC = colorKey.startsWith("cdc-");
        const isCC = colorKey.startsWith("cc-");
        const isAmenity = colorKey.startsWith("amenity-");

        // Skip if layer is hidden
        if (isHDA && !activeLayers.hda) return;
        if (isDA && !activeLayers.da) return;
        if (isCDC && !activeLayers.cdc) return;
        if (isCC && !activeLayers.cc) return;
        if (isAmenity && !activeLayers.amenities) return;

        hasExtras = true;
        const color = MARKER_COLORS[colorKey] || "#F59E0B";
        const size = isAmenity ? 10 : 14;
        const borderWidth = isAmenity ? 1.5 : 2;
        const shape = isAmenity
          ? `width:${size}px;height:${size}px;background:${color};border-radius:3px;border:${borderWidth}px solid rgba(255,255,255,0.6);box-shadow:0 0 6px ${color};opacity:0.85`
          : `width:${size}px;height:${size}px;background:${color};border-radius:50%;border:${borderWidth}px solid rgba(255,255,255,0.8);box-shadow:0 0 8px ${color}`;
        const icon = L.divIcon({
          html: `<div style="${shape}"></div>`,
          iconSize: [size, size],
          iconAnchor: [size / 2, size / 2],
          className: "",
        });

        const popupLines: string[] = [];
        popupLines.push(`<b style="font-size:13px">${m.label}</b>`);
        if (m.description) popupLines.push(`<div style="margin-top:4px">${m.description}</div>`);
        const details: string[] = [];
        if (m.status) details.push(`<span style="background:#f0fdf4;color:#166534;padding:1px 6px;border-radius:4px;font-size:10px">${m.status}</span>`);
        if (m.cost) details.push(`$${m.cost.toLocaleString()}`);
        if (m.dwellings) details.push(`${m.dwellings} dwellings`);
        if (m.storeys) details.push(`${m.storeys} storeys`);
        if (details.length) popupLines.push(`<div style="margin-top:4px;display:flex;flex-wrap:wrap;gap:6px;align-items:center">${details.join(" · ")}</div>`);
        const refs: string[] = [];
        if (m.pan) refs.push(m.pan);
        if (m.councilRef) refs.push(`Ref: ${m.councilRef}`);
        if (m.date) refs.push(new Date(m.date).toLocaleDateString("en-AU", { day: "numeric", month: "short", year: "numeric" }));
        if (refs.length) popupLines.push(`<div style="margin-top:4px;color:#666;font-size:10px">${refs.join(" · ")}</div>`);
        if (m.link) popupLines.push(`<a href="${m.link}" target="_blank" rel="noopener" style="display:inline-block;margin-top:6px;color:#059669;font-size:11px;text-decoration:none;font-weight:500">View details →</a>`);

        const marker = L.marker([m.lat, m.lng], { icon }).bindPopup(
          `<div style="color:#000;font-size:12px;max-width:280px;line-height:1.5">${popupLines.join("")}</div>`,
          { maxWidth: 300 }
        );
        lg.addLayer(marker);
        if (!isAmenity) {
          bounds.extend([m.lat, m.lng]);
        }
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
  }, [lat, lng, markers, polygon, lgaBoundary, zoneCode, activeLayers]);

  // Fly to focused point when a card item is clicked
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !focusPoint) return;
    map.flyTo([focusPoint.lat, focusPoint.lng], 18, { duration: 0.8 });
    // Open popup of the marker at that location
    map.eachLayer((layer: any) => {
      if (layer.getLatLng) {
        const ll = layer.getLatLng();
        if (Math.abs(ll.lat - focusPoint.lat) < 0.0001 && Math.abs(ll.lng - focusPoint.lng) < 0.0001) {
          layer.openPopup();
        }
      }
    });
  }, [focusPoint]);

  const LAYER_TOGGLES: { key: LayerCategory; label: string; color: string }[] = [
    { key: "hda", label: "HDA", color: "#06B6D4" },
    { key: "da", label: "DA", color: "#FBBF24" },
    { key: "cdc", label: "CDC", color: "#A78BFA" },
    { key: "cc", label: "CC", color: "#14B8A6" },
    { key: "amenities", label: "Amenities", color: "#22C55E" },
  ];

  const LEGEND_ITEMS = [
    { shape: "circle", size: 12, color: "#fff", border: "3px solid #10B981", label: "Your Property" },
    { shape: "circle", size: 8, color: "#06B6D4", label: "HDA Fast-tracked" },
    { shape: "circle", size: 8, color: "#FBBF24", label: "DA Under Assessment" },
    { shape: "circle", size: 8, color: "#38BDF8", label: "DA Determined" },
    { shape: "circle", size: 8, color: "#A78BFA", label: "CDC" },
    { shape: "circle", size: 8, color: "#14B8A6", label: "CC" },
    { shape: "square", size: 7, color: "#3B82F6", label: "Train" },
    { shape: "square", size: 7, color: "#22C55E", label: "Park" },
    { shape: "square", size: 7, color: "#EC4899", label: "Shops" },
    { shape: "dashed", size: 12, color: "#64748B", label: "LGA Boundary" },
  ];

  return (
    <div
      className={`glass-card overflow-hidden transition-all duration-300 flex flex-col ${fullscreen ? "fixed inset-0 z-[9999] rounded-none" : "h-full min-h-[55vh]"}`}
      style={fullscreen ? { isolation: "isolate", padding: 0, margin: 0, borderRadius: 0 } : { padding: 0 }}
    >
      {/* Fullscreen header */}
      {fullscreen && (
        <div className="relative z-10 px-4 py-2.5 flex items-center justify-between shrink-0" style={{ borderBottom: "1px solid var(--border)", background: "var(--card-bg)" }}>
          <div className="flex items-center gap-3">
            <span className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>Map View</span>
            <div className="flex items-center gap-1">
              {LAYER_TOGGLES.map(({ key, label, color }) => (
                <button
                  key={key}
                  onClick={() => toggleLayer(key)}
                  className="px-2 py-1 rounded text-[10px] font-medium transition-all border"
                  style={activeLayers[key]
                    ? { borderColor: "var(--border-strong)", color: "var(--text-primary)", background: isDark ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.05)" }
                    : { borderColor: "var(--border)", color: "var(--text-muted)", background: "transparent" }
                  }
                  title={`${activeLayers[key] ? "Hide" : "Show"} ${label} markers`}
                >
                  <span className="inline-block w-2 h-2 rounded-full mr-1" style={{ background: activeLayers[key] ? color : "var(--text-muted)" }} />
                  {label}
                </button>
              ))}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setSatellite(!satellite)}
              className="px-2 py-1 rounded text-[10px] font-medium border transition-all"
              style={satellite
                ? { borderColor: "var(--accent-border)", color: "var(--accent)", background: "var(--accent-subtle)" }
                : { borderColor: "var(--border)", color: "var(--text-muted)" }
              }
              title={satellite ? "Switch to map view" : "Switch to satellite"}
            >
              🛰
            </button>
            <button
              onClick={() => setLegendOpen(!legendOpen)}
              className="px-2 py-1 rounded text-[10px] font-medium border transition-all"
              style={legendOpen
                ? { borderColor: "var(--border-strong)", color: "var(--text-primary)", background: isDark ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.05)" }
                : { borderColor: "var(--border)", color: "var(--text-muted)" }
              }
              title="Toggle legend"
            >
              ℹ
            </button>
            {streetViewUrl && (
              <a
                href={streetViewUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="px-2 py-1 rounded text-[10px] font-medium border transition-all"
                style={{ borderColor: "var(--border)", color: "var(--text-muted)" }}
                title="Open in Google Street View"
              >
                🚶
              </a>
            )}
            <span className="text-[10px] ml-1" style={{ color: "var(--text-muted)" }}>Esc to exit</span>
            <button
              onClick={() => setFullscreen(false)}
              className="flex items-center justify-center w-8 h-8 rounded-lg text-base font-bold transition-all hover:scale-110"
              style={{ background: "var(--accent-subtle)", color: "var(--accent)", border: "1px solid var(--accent-border)" }}
              title="Exit fullscreen"
            >
              ✕
            </button>
          </div>
        </div>
      )}

      {/* Normal header bar */}
      {!fullscreen && (
        <div className="px-3 py-2 flex items-center gap-2" style={{ borderBottom: "1px solid var(--border)", background: isDark ? "rgba(0,0,0,0.2)" : "rgba(0,0,0,0.04)" }}>
          <div className="flex items-center gap-1">
            {LAYER_TOGGLES.map(({ key, label, color }) => (
              <button
                key={key}
                onClick={() => toggleLayer(key)}
                className="px-2 py-1 rounded text-[10px] font-medium transition-all border"
                style={activeLayers[key]
                  ? { borderColor: "var(--border-strong)", color: "var(--text-primary)", background: isDark ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.05)" }
                  : { borderColor: "var(--border)", color: "var(--text-muted)", background: "transparent" }
                }
                title={`${activeLayers[key] ? "Hide" : "Show"} ${label} markers`}
              >
                <span className="inline-block w-2 h-2 rounded-full mr-1" style={{ background: activeLayers[key] ? color : "var(--text-muted)" }} />
                {label}
              </button>
            ))}
          </div>
          <div className="ml-auto flex items-center gap-1.5">
            <button
              onClick={() => setSatellite(!satellite)}
              className="px-2 py-1 rounded text-[10px] font-medium border transition-all"
              style={satellite
                ? { borderColor: "var(--accent-border)", color: "var(--accent)", background: "var(--accent-subtle)" }
                : { borderColor: "var(--border)", color: "var(--text-muted)" }
              }
              title={satellite ? "Switch to map view" : "Switch to satellite"}
            >
              🛰
            </button>
            <button
              onClick={() => setLegendOpen(!legendOpen)}
              className="px-2 py-1 rounded text-[10px] font-medium border transition-all"
              style={legendOpen
                ? { borderColor: "var(--border-strong)", color: "var(--text-primary)", background: isDark ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.05)" }
                : { borderColor: "var(--border)", color: "var(--text-muted)" }
              }
              title="Toggle legend"
            >
              ℹ
            </button>
            {streetViewUrl && (
              <a
                href={streetViewUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="px-2 py-1 rounded text-[10px] font-medium border transition-all"
                style={{ borderColor: "var(--border)", color: "var(--text-muted)" }}
                title="Open in Google Street View"
              >
                🚶
              </a>
            )}
            <button
              onClick={() => setFullscreen(!fullscreen)}
              className="px-2 py-1 rounded text-[10px] font-medium border transition-all"
              style={{ borderColor: "var(--border)", color: "var(--text-muted)" }}
              title="Fullscreen map"
            >
              ⛶
            </button>
          </div>
        </div>
      )}

      {/* Collapsible legend */}
      {legendOpen && (
        <div className="px-3 py-2 flex flex-wrap gap-x-4 gap-y-1.5 text-[10px]" style={{ borderBottom: "1px solid var(--border)", background: isDark ? "rgba(0,0,0,0.3)" : "rgba(0,0,0,0.03)", color: "var(--text-muted)" }}>
          {LEGEND_ITEMS.map(({ shape, size, color, border, label }) => (
            <span key={label} className="flex items-center gap-1.5">
              {shape === "dashed" ? (
                <span style={{ width: size, height: size * 0.67, border: `1.5px dashed ${color}`, display: "inline-block" }} />
              ) : (
                <span style={{ width: size, height: size, borderRadius: shape === "circle" ? "50%" : "2px", background: color, border: border || "none", display: "inline-block" }} />
              )}
              {label}
            </span>
          ))}
        </div>
      )}

      {/* Map container */}
      <div className={`${fullscreen ? "flex-1 min-h-0" : "h-[55vh] xl:h-full xl:min-h-0 flex-1"}`}>
        <div ref={containerRef} className="w-full h-full" />
      </div>
    </div>
  );
}
