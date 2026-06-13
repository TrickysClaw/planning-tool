"use client";
import { useEffect, useRef, useState } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { STATIONS } from "@/data/stations";

// Feature hotspots tracing a diagonal arc from upper-left to lower-right
// Each sits on a visible blue train line segment
const FEATURE_POINTS = [
  {
    lat: -33.6498, lng: 150.8442,
    title: "Zoning & Controls",
    desc: "See exactly what you can build: zoning, floor space ratio, height limits, lot size, and heritage overlays in one click.",
    details: [
      "Instantly see the primary zoning (R2, R3, R4, B1, IN1, etc.) and what's permissible",
      "Floor Space Ratio & maximum building height pulled directly from council LEPs",
      "Heritage overlays, conservation areas, and item-specific restrictions",
      "Minimum lot sizes and subdivision potential at a glance",
      "Dual occupancy, secondary dwelling, and boarding house feasibility flags",
    ],
    icon: "🏗️",
  },
  {
    lat: -33.7004, lng: 150.8762,
    title: "Transport Score",
    desc: "Walk-time to the nearest train, metro, or light rail station plus frequency and peak-hour capacity.",
    details: [
      "Straight-line and walking distance to every station within 2 km",
      "Peak-hour frequency, how many services per hour during AM/PM rush",
      "Metro vs heavy rail vs light rail classification with transfer info",
      "Future stations from approved metro extensions (e.g., Metro West)",
      "Connectivity score weighted by distance, frequency, and line coverage",
    ],
    icon: "🚆",
  },
  {
    lat: -33.7686, lng: 150.9065,
    title: "Live DA Tracker",
    desc: "Every development application within 2 km, filterable by status, type, and estimated completion date.",
    details: [
      "Real-time feed from council DA portals, updated daily",
      "Filter by status: lodged, under assessment, approved, refused, withdrawn",
      "Estimated cost of works, number of dwellings, and building type",
      "Track what your neighbours are building and what council is approving",
      "Historical approval rates by development type in the area",
    ],
    icon: "📋",
  },
  {
    lat: -33.8178, lng: 151.0050,
    title: "State Projects",
    desc: "Major government developments like metro extensions, hospital upgrades, and infrastructure corridors that reshape suburbs.",
    details: [
      "State Significant Development Applications (SSDAs) from the NSW Major Projects portal",
      "Metro extensions, motorway interchanges, and rail corridor upgrades",
      "Hospital expansions, school builds, and community infrastructure",
      "Rezoning proposals and precinct plans that signal future growth",
      "Impact radius: how close the project is and whether it affects your property",
    ],
    icon: "🏛️",
  },
  {
    lat: -33.8718, lng: 151.0942,
    title: "Risk Layers",
    desc: "Flood, bushfire, coastal erosion, and contamination overlays sourced directly from council and state datasets.",
    details: [
      "Flood planning levels from 1-in-100-year ARI mapping from council flood studies",
      "Bushfire Attack Level (BAL) ratings and Asset Protection Zones",
      "Coastal erosion and inundation hazard lines (2050 & 2100 projections)",
      "Contaminated land (CLM/POEO) register entries within proximity",
      "Mine subsidence districts and acid sulfate soils classification",
    ],
    icon: "⚠️",
  },
  {
    lat: -33.8917, lng: 151.1981,
    title: "Suburb Profile",
    desc: "Median prices, growth trends, rental yields, school catchments, and community sentiment scores at a glance.",
    details: [
      "Median house and unit prices with 1yr, 3yr, and 5yr growth trajectories",
      "Gross rental yield and vacancy rates sourced from market data",
      "School catchment boundaries for public primary and secondary",
      "AI-powered perception score: safety, lifestyle, amenity, and investment sentiment",
      "Demographic snapshot: age, income, household composition, and density",
    ],
    icon: "📊",
  },
];

// Build rail line segments grouped by type
function buildRailSegments(): { coords: [number, number][]; type: string }[] {
  const segments: { coords: [number, number][]; type: string }[] = [];
  let current: [number, number][] = [];
  let currentType = "";

  for (let i = 0; i < STATIONS.length; i++) {
    const s = STATIONS[i];
    if (current.length === 0) {
      current.push([s.lat, s.lng]);
      currentType = s.type;
      continue;
    }
    const prev = STATIONS[i - 1];
    const dist = Math.sqrt((s.lat - prev.lat) ** 2 + (s.lng - prev.lng) ** 2);
    // ~0.036 degrees ≈ 4km — break line if gap is too large (different line)
    if (dist < 0.036 && s.type === prev.type) {
      current.push([s.lat, s.lng]);
    } else {
      if (current.length > 1) segments.push({ coords: current, type: currentType });
      current = [[s.lat, s.lng]];
      currentType = s.type;
    }
  }
  if (current.length > 1) segments.push({ coords: current, type: currentType });
  return segments;
}



export default function MapBackgroundInner() {
  const mapRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const tileLayerRef = useRef<L.TileLayer | null>(null);
  const mousePos = useRef<{ x: number; y: number } | null>(null);
  const lastMoveTime = useRef<number>(0);
  const animFrameRef = useRef<number>(0);
  const trailRef = useRef<{ x: number; y: number; time: number }[]>([]);
  const polylinesRef = useRef<L.Polyline[]>([]);
  const [dotPositions, setDotPositions] = useState<{ x: number; y: number }[]>([]);
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null);
  const [selectedIdx, setSelectedIdx] = useState<number | null>(null);
  const hoverTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const panelIdx = selectedIdx ?? hoveredIdx;

  function handleDotEnter(i: number) {
    if (selectedIdx !== null) return;
    if (hoverTimeoutRef.current) { clearTimeout(hoverTimeoutRef.current); hoverTimeoutRef.current = null; }
    setHoveredIdx(i);
  }
  function handleDotLeave() {
    if (selectedIdx !== null) return;
    hoverTimeoutRef.current = setTimeout(() => setHoveredIdx(null), 150);
  }

  // Compute nudged positions with collision avoidance
  function computeFinalPositions(positions: { x: number; y: number }[]): { x: number; y: number }[] {
    const cx = typeof window !== "undefined" ? window.innerWidth / 2 : 600;
    const cy = typeof window !== "undefined" ? window.innerHeight * 0.5 : 400;
    const zoneW = 360, zoneH = 140;
    const MIN_SPACING = 48;

    const final = positions.map(pos => {
      let x = pos.x, y = pos.y;
      if (Math.abs(x - cx) < zoneW && Math.abs(y - cy) < zoneH) {
        if (x < cx) x = cx - zoneW - 60;
        else x = cx + zoneW + 60;
      }
      return { x, y };
    });

    // Resolve collisions: push overlapping dots apart vertically
    for (let i = 0; i < final.length; i++) {
      for (let j = i + 1; j < final.length; j++) {
        const dx = Math.abs(final[i].x - final[j].x);
        const dy = Math.abs(final[i].y - final[j].y);
        if (dx < MIN_SPACING && dy < MIN_SPACING) {
          const overlap = MIN_SPACING - dy;
          final[i].y -= overlap / 2 + 4;
          final[j].y += overlap / 2 + 4;
        }
      }
    }

    return final;
  }

  useEffect(() => {
    if (!mapRef.current || mapInstanceRef.current) return;

    const isDark = document.documentElement.classList.contains("dark");

    const map = L.map(mapRef.current, {
      center: [-33.74, 151.0],
      zoom: 11,
      zoomControl: false,
      attributionControl: false,
      dragging: false,
      scrollWheelZoom: false,
      doubleClickZoom: false,
      touchZoom: false,
      keyboard: false,
    });

    const tileUrl = isDark
      ? "https://{s}.basemaps.cartocdn.com/dark_nolabels/{z}/{x}/{y}{r}.png"
      : "https://{s}.basemaps.cartocdn.com/light_nolabels/{z}/{x}/{y}{r}.png";

    const tile = L.tileLayer(tileUrl, {
      subdomains: "abcd",
    }).addTo(map);
    tileLayerRef.current = tile;

    mapInstanceRef.current = map;

    // Project feature points once the map is fully loaded
    function projectDots() {
      try {
        map.invalidateSize();
        const positions = FEATURE_POINTS.map(fp => {
          const pt = map.latLngToContainerPoint([fp.lat, fp.lng]);
          return { x: pt.x, y: pt.y };
        });
        setDotPositions(positions);
      } catch {
        // Container not yet positioned, retry shortly
        setTimeout(projectDots, 200);
      }
    }
    map.whenReady(() => setTimeout(projectDots, 150));

    // Update dot positions on resize
    function updateDots() {
      if (!mapInstanceRef.current) return;
      const m = mapInstanceRef.current;
      m.invalidateSize();
      const positions = FEATURE_POINTS.map(fp => {
        const pt = m.latLngToContainerPoint([fp.lat, fp.lng]);
        return { x: pt.x, y: pt.y };
      });
      setDotPositions(positions);
    }
    window.addEventListener("resize", updateDots);

    // Draw rail lines with different colors per type
    const segments = buildRailSegments();
    const lineColors: Record<string, { dark: string; light: string }> = {
      train: { dark: "rgba(96, 165, 250, 0.30)", light: "rgba(37, 99, 235, 0.22)" },       // blue
      metro: { dark: "rgba(167, 139, 250, 0.45)", light: "rgba(109, 40, 217, 0.30)" },     // purple
      light_rail: { dark: "rgba(52, 211, 153, 0.40)", light: "rgba(5, 150, 105, 0.28)" },  // emerald
    };
    const polylines: L.Polyline[] = [];
    for (const seg of segments) {
      const colors = lineColors[seg.type] || lineColors.train;
      const color = isDark ? colors.dark : colors.light;
      const dash = seg.type === "metro" ? "6 4" : seg.type === "light_rail" ? "3 5" : "4 6";
      const line = L.polyline(seg.coords as L.LatLngExpression[], {
        color,
        weight: 2,
        opacity: 1,
        dashArray: dash,
        dashOffset: "0",
      }).addTo(map);
      polylines.push(line);
    }
    polylinesRef.current = polylines;

    // Animate rail line dash offset (marching ants)
    let dashAnimFrame = 0;
    let dashOffset = 0;
    function animateDash() {
      dashOffset = (dashOffset + 0.15) % 20;
      for (const line of polylinesRef.current) {
        (line.getElement() as SVGElement | null)?.style.setProperty("stroke-dashoffset", String(-dashOffset));
      }
      dashAnimFrame = requestAnimationFrame(animateDash);
    }
    dashAnimFrame = requestAnimationFrame(animateDash);

    // Listen for theme changes and swap tiles
    const observer = new MutationObserver(() => {
      const map = mapInstanceRef.current;
      if (!map || !tileLayerRef.current) return;
      const nowDark = document.documentElement.classList.contains("dark");
      map.removeLayer(tileLayerRef.current);
      const newUrl = nowDark
        ? "https://{s}.basemaps.cartocdn.com/dark_nolabels/{z}/{x}/{y}{r}.png"
        : "https://{s}.basemaps.cartocdn.com/light_nolabels/{z}/{x}/{y}{r}.png";
      const newTile = L.tileLayer(newUrl, { subdomains: "abcd" }).addTo(map);
      tileLayerRef.current = newTile;
    });
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ["class"] });

    return () => {
      cancelAnimationFrame(dashAnimFrame);
      observer.disconnect();
      window.removeEventListener("resize", updateDots);
      map.remove();
      mapInstanceRef.current = null;
      tileLayerRef.current = null;
      polylinesRef.current = [];
    };
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    function resize() {
      if (!canvas) return;
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
      const ctx = canvas.getContext("2d");
      if (ctx) {
        const isDark = document.documentElement.classList.contains("dark");
        ctx.fillStyle = isDark ? "#0B0F19" : "#F0F2F5";
        ctx.fillRect(0, 0, canvas.width, canvas.height);
      }
    }
    resize();
    window.addEventListener("resize", resize);

    function handleMouseMove(e: MouseEvent) {
      mousePos.current = { x: e.clientX, y: e.clientY };
      lastMoveTime.current = performance.now();
      trailRef.current.push({ x: e.clientX, y: e.clientY, time: performance.now() });
    }
    function handleMouseLeave() {
      mousePos.current = null;
    }
    document.addEventListener("mousemove", handleMouseMove);
    document.addEventListener("mouseleave", handleMouseLeave);

    function animate() {
      if (!canvas) return;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;

      const now = performance.now();

      // Redraw full opaque overlay every frame (avoids ghost trail accumulation)
      const isDark = document.documentElement.classList.contains("dark");
      ctx.globalCompositeOperation = "source-over";
      ctx.fillStyle = isDark ? "#0B0F19" : "#F0F2F5";
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Prune trail points older than 2s
      const TRAIL_DURATION = 2000;
      trailRef.current = trailRef.current.filter(p => now - p.time < TRAIL_DURATION);

      // Draw trail holes (older = more faded)
      if (trailRef.current.length > 0) {
        ctx.save();
        ctx.globalCompositeOperation = "destination-out";
        for (const point of trailRef.current) {
          const age = now - point.time;
          const alpha = Math.max(0, 1 - age / TRAIL_DURATION);
          const radius = 190 - age * 0.03; // Slightly shrink older trails
          if (alpha <= 0 || radius <= 0) continue;
          const gradient = ctx.createRadialGradient(
            point.x, point.y, 0,
            point.x, point.y, Math.max(radius, 50)
          );
          gradient.addColorStop(0, `rgba(0,0,0,${alpha})`);
          gradient.addColorStop(0.7, `rgba(0,0,0,${alpha * 0.6})`);
          gradient.addColorStop(1, "rgba(0,0,0,0)");
          ctx.fillStyle = gradient;
          ctx.beginPath();
          ctx.arc(point.x, point.y, Math.max(radius, 50), 0, Math.PI * 2);
          ctx.fill();
        }
        ctx.restore();
      }

      // Current mouse position - full strength hole
      const idle = now - lastMoveTime.current;
      if (mousePos.current && idle < 2000) {
        const fadeAlpha = idle < 500 ? 1 : Math.max(0, 1 - (idle - 500) / 1500);
        ctx.save();
        ctx.globalCompositeOperation = "destination-out";
        const gradient = ctx.createRadialGradient(
          mousePos.current.x, mousePos.current.y, 0,
          mousePos.current.x, mousePos.current.y, 190
        );
        gradient.addColorStop(0, `rgba(0,0,0,${fadeAlpha})`);
        gradient.addColorStop(0.7, `rgba(0,0,0,${fadeAlpha})`);
        gradient.addColorStop(1, "rgba(0,0,0,0)");
        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.arc(mousePos.current.x, mousePos.current.y, 190, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }

      animFrameRef.current = requestAnimationFrame(animate);
    }
    animFrameRef.current = requestAnimationFrame(animate);

    return () => {
      cancelAnimationFrame(animFrameRef.current);
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseleave", handleMouseLeave);
      window.removeEventListener("resize", resize);
    };
  }, []);

  return (
    <>
      <div className="fixed inset-0 z-0 pointer-events-none">
        <style>{`
          .hotspot-circle {
            position: absolute;
            transform: translate(-50%, -50%);
            pointer-events: auto;
            cursor: pointer;
            z-index: 10;
          }
          .hotspot-dot {
            width: 12px;
            height: 12px;
            border-radius: 50%;
            background: var(--accent);
            opacity: 0.8;
            transition: transform 0.3s ease, opacity 0.3s ease, box-shadow 0.3s ease;
            box-shadow: 0 0 0 3px rgba(24, 24, 27, 0.15);
          }
          .dark .hotspot-dot {
            box-shadow: 0 0 0 3px rgba(228, 228, 231, 0.15);
          }
          .hotspot-dot.active {
            transform: scale(1.6);
            opacity: 1;
            box-shadow: 0 0 0 6px rgba(24, 24, 27, 0.15), 0 0 20px rgba(24, 24, 27, 0.08);
          }
          .dark .hotspot-dot.active {
            box-shadow: 0 0 0 6px rgba(228, 228, 231, 0.15), 0 0 20px rgba(228, 228, 231, 0.08);
          }
          .hotspot-ping {
            position: absolute;
            inset: -4px;
            border-radius: 50%;
            border: 1.5px solid var(--accent);
            opacity: 0;
            animation: hotspot-pulse 3s ease-out infinite;
          }
          .hotspot-circle:nth-child(2) .hotspot-ping { animation-delay: 0.5s; }
          .hotspot-circle:nth-child(3) .hotspot-ping { animation-delay: 1s; }
          .hotspot-circle:nth-child(4) .hotspot-ping { animation-delay: 1.5s; }
          .hotspot-circle:nth-child(5) .hotspot-ping { animation-delay: 2s; }
          .hotspot-circle:nth-child(6) .hotspot-ping { animation-delay: 2.5s; }
          @keyframes hotspot-pulse {
            0% { transform: scale(1); opacity: 0.6; }
            100% { transform: scale(2.5); opacity: 0; }
          }
          .feature-panel {
            position: fixed;
            top: 80px;
            right: 32px;
            bottom: 32px;
            width: 380px;
            max-width: calc(100vw - 64px);
            border-radius: 16px;
            background: var(--card-bg);
            border: 1px solid var(--card-border);
            box-shadow: var(--card-shadow), 0 24px 48px rgba(0,0,0,0.3);
            backdrop-filter: blur(20px);
            z-index: 40;
            pointer-events: auto;
            display: flex;
            flex-direction: column;
            overflow: hidden;
            opacity: 0;
            transform: translateX(20px);
            transition: opacity 0.35s ease, transform 0.35s ease;
            overscroll-behavior: contain;
          }
          @media (max-width: 640px) {
            .feature-panel {
              top: auto;
              bottom: 0;
              left: 0;
              right: 0;
              width: 100%;
              max-width: 100%;
              max-height: 60vh;
              border-radius: 16px 16px 0 0;
              transform: translateY(20px);
            }
            .feature-panel.visible {
              transform: translateY(0);
            }
          }
          .feature-panel.visible {
            opacity: 1;
            transform: translateX(0);
          }
          .feature-panel-header {
            padding: 24px 24px 16px;
            border-bottom: 1px solid var(--card-border);
            display: flex;
            align-items: center;
            gap: 12px;
          }
          .feature-panel-icon {
            font-size: 28px;
            line-height: 1;
          }
          .feature-panel-title {
            font-size: 18px;
            font-weight: 700;
            color: var(--text-primary);
            letter-spacing: -0.02em;
          }
          .feature-panel-desc {
            padding: 16px 24px;
            font-size: 13px;
            line-height: 1.6;
            color: var(--text-secondary);
          }
          .feature-panel-details {
            flex: 1;
            min-height: 0;
            overflow-y: auto;
            padding: 0 24px 24px;
            pointer-events: auto;
            overscroll-behavior: contain;
          }
          .feature-detail-item {
            display: flex;
            align-items: flex-start;
            gap: 10px;
            padding: 10px 0;
            border-bottom: 1px solid var(--card-border);
          }
          .feature-detail-item:last-child {
            border-bottom: none;
          }
          .feature-detail-bullet {
            width: 6px;
            height: 6px;
            border-radius: 50%;
            background: var(--accent);
            margin-top: 6px;
            flex-shrink: 0;
          }
          .feature-detail-text {
            font-size: 13px;
            line-height: 1.5;
            color: var(--text-primary);
          }
          .feature-panel-nav {
            padding: 16px 24px;
            border-top: 1px solid var(--card-border);
            display: flex;
            gap: 6px;
            align-items: center;
            justify-content: center;
          }
          .feature-nav-dot {
            width: 8px;
            height: 8px;
            border-radius: 50%;
            background: var(--text-secondary);
            opacity: 0.3;
            cursor: pointer;
            transition: opacity 0.2s, transform 0.2s, background 0.2s;
          }
          .feature-nav-dot:hover {
            opacity: 0.6;
            transform: scale(1.3);
          }
          .feature-nav-dot.active {
            opacity: 1;
            background: var(--accent);
            transform: scale(1.3);
          }
          .feature-panel-close {
            position: absolute;
            top: 16px;
            right: 16px;
            width: 28px;
            height: 28px;
            border-radius: 50%;
            border: 1px solid var(--card-border);
            background: var(--card-bg);
            color: var(--text-secondary);
            display: flex;
            align-items: center;
            justify-content: center;
            cursor: pointer;
            font-size: 14px;
            transition: background 0.2s, color 0.2s;
          }
          .feature-panel-close:hover {
            background: var(--accent);
            color: white;
          }
        `}</style>
        <div ref={mapRef} className="absolute inset-0" style={{ width: "100%", height: "100%" }} />
        {/* Feature hotspots — rendered below the canvas so they're hidden until mouse reveals them */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none hidden lg:block" style={{ zIndex: 1 }}>
          {(() => {
            const finalPositions = computeFinalPositions(dotPositions);
            return FEATURE_POINTS.map((fp, i) => {
              const pos = finalPositions[i];
              if (!pos) return null;
              return (
                <div
                  key={i}
                  className="hotspot-circle"
                  style={{ left: pos.x, top: pos.y, pointerEvents: "none" }}
                >
                  <div className={`hotspot-dot${panelIdx === i ? " active" : ""}`} />
                  <div className="hotspot-ping" />
                </div>
              );
            });
          })()}
        </div>
        <canvas ref={canvasRef} className="absolute inset-0" style={{ opacity: 0.60, zIndex: 2, pointerEvents: "none" }} />
      </div>

      {/* Invisible click targets for hotspots — above everything */}
      <div className="fixed inset-0 z-20 pointer-events-none overflow-hidden hidden lg:block">
        {(() => {
          const finalPositions = computeFinalPositions(dotPositions);
          return FEATURE_POINTS.map((fp, i) => {
            const pos = finalPositions[i];
            if (!pos) return null;
            return (
              <div
                key={i}
                style={{
                  position: "absolute",
                  left: pos.x,
                  top: pos.y,
                  transform: "translate(-50%, -50%)",
                  width: 44,
                  height: 44,
                  borderRadius: "50%",
                  pointerEvents: "auto",
                  cursor: "pointer",
                  zIndex: 10,
                }}
                onMouseEnter={() => handleDotEnter(i)}
                onMouseLeave={() => handleDotLeave()}
                onClick={() => setSelectedIdx(selectedIdx === i ? null : i)}
              />
            );
          });
        })()}
      </div>

      {/* Right-side feature detail panel */}
      <div
        className={`feature-panel${panelIdx !== null ? " visible" : ""}`}
        style={{ pointerEvents: panelIdx !== null ? "auto" : "none" }}
      >
        {panelIdx !== null && (
          <>
            <button className="feature-panel-close" onClick={() => { setSelectedIdx(null); setHoveredIdx(null); }}>✕</button>
            <div className="feature-panel-header">
              <span className="feature-panel-icon">{FEATURE_POINTS[panelIdx].icon}</span>
              <span className="feature-panel-title">{FEATURE_POINTS[panelIdx].title}</span>
            </div>
            <div className="feature-panel-desc">{FEATURE_POINTS[panelIdx].desc}</div>
            <div className="feature-panel-details">
              {FEATURE_POINTS[panelIdx].details.map((detail, j) => (
                <div key={j} className="feature-detail-item">
                  <div className="feature-detail-bullet" />
                  <span className="feature-detail-text">{detail}</span>
                </div>
              ))}
            </div>
            <div className="feature-panel-nav">
              {FEATURE_POINTS.map((_, i) => (
                <div
                  key={i}
                  className={`feature-nav-dot${panelIdx === i ? " active" : ""}`}
                  onClick={() => setSelectedIdx(i)}
                />
              ))}
            </div>
          </>
        )}
      </div>
    </>
  );
}
