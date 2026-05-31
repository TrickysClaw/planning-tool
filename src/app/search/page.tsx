"use client";
import { useState, useEffect, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  SlidersHorizontal,
  Search,
  Construction,
  Map,
  List,
  Loader2,
  MapPin,
  Maximize2,
  ExternalLink,
  X,
  ChevronDown,
} from "lucide-react";
import Link from "next/link";
import dynamic from "next/dynamic";
import ThemeToggle from "../components/ThemeToggle";
import { SUBURB_CENTROIDS } from "../../data/suburbCentroids";

const SearchMapView = dynamic(() => import("../components/SearchMapView"), { ssr: false });

/* ───────── Zone definitions ───────── */
const ZONE_GROUPS = [
  {
    label: "Residential",
    zones: [
      { code: "R1", name: "General Residential" },
      { code: "R2", name: "Low Density Residential" },
      { code: "R3", name: "Medium Density Residential" },
      { code: "R4", name: "High Density Residential" },
      { code: "R5", name: "Large Lot Residential" },
    ],
  },
  {
    label: "Mixed Use / Business",
    zones: [
      { code: "MU1", name: "Mixed Use" },
      { code: "B1", name: "Neighbourhood Centre" },
      { code: "B2", name: "Local Centre" },
      { code: "B4", name: "Mixed Use (legacy)" },
      { code: "B5", name: "Business Development" },
      { code: "B6", name: "Enterprise Corridor" },
      { code: "B7", name: "Business Park" },
    ],
  },
  {
    label: "Industrial",
    zones: [
      { code: "IN1", name: "General Industrial" },
      { code: "IN2", name: "Light Industrial" },
      { code: "E4", name: "General Industrial (new)" },
    ],
  },
  {
    label: "Environment / Rural",
    zones: [
      { code: "E1", name: "National Parks" },
      { code: "E2", name: "Environmental Conservation" },
      { code: "E3", name: "Environmental Management" },
      { code: "RU1", name: "Primary Production" },
      { code: "RU2", name: "Rural Landscape" },
      { code: "RU4", name: "Primary Production Small Lots" },
      { code: "RU5", name: "Village" },
    ],
  },
];

/* ───────── Lot Size Presets ───────── */
const LOT_SIZE_OPTIONS = [
  { label: "Any", min: 0, max: 999999 },
  { label: "200–450 m²", min: 200, max: 450 },
  { label: "450–700 m²", min: 450, max: 700 },
  { label: "700–1000 m²", min: 700, max: 1000 },
  { label: "1000–2000 m²", min: 1000, max: 2000 },
  { label: "2000–5000 m²", min: 2000, max: 5000 },
  { label: "5000+ m²", min: 5000, max: 999999 },
];

/* ───────── Suburbs for autocomplete ───────── */
const SUBURB_LIST = Object.keys(SUBURB_CENTROIDS).sort();

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

function aerialUrl(rings: number[][][], width = 160, height = 100): string {
  if (!rings?.[0]?.length) return "";
  let xmin = Infinity, ymin = Infinity, xmax = -Infinity, ymax = -Infinity;
  for (const [x, y] of rings[0]) {
    if (x < xmin) xmin = x;
    if (x > xmax) xmax = x;
    if (y < ymin) ymin = y;
    if (y > ymax) ymax = y;
  }
  const pad = 0.0002;
  xmin -= pad; ymin -= pad; xmax += pad; ymax += pad;
  return `https://maps.six.nsw.gov.au/arcgis/rest/services/public/NSW_Imagery/MapServer/export?bbox=${xmin},${ymin},${xmax},${ymax}&bboxSR=4326&size=${width},${height}&format=png&f=image`;
}

export default function SearchPage() {
  const router = useRouter();

  // Filter state
  const [suburb, setSuburb] = useState("");
  const [suburbCoords, setSuburbCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [selectedZones, setSelectedZones] = useState<string[]>([]);
  const [lotSizePreset, setLotSizePreset] = useState(0); // index into LOT_SIZE_OPTIONS
  const [lotMin, setLotMin] = useState(0);
  const [lotMax, setLotMax] = useState(999999);
  const [frontageMin, setFrontageMin] = useState(0);
  const [radiusKm, setRadiusKm] = useState(1.5);
  const [excludeHeritage, setExcludeHeritage] = useState(false);

  // UI state
  const [results, setResults] = useState<SearchResult[]>([]);
  const [resultCount, setResultCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);
  const [viewMode, setViewMode] = useState<"map" | "list">("map");
  const [suburbOpen, setSuburbOpen] = useState(false);
  const [suburbFilter, setSuburbFilter] = useState("");
  const [zoneOpen, setZoneOpen] = useState(false);
  const suburbRef = useRef<HTMLDivElement>(null);
  const zoneRef = useRef<HTMLDivElement>(null);

  // Close dropdowns on outside click
  useEffect(() => {
    function handler(e: MouseEvent) {
      if (suburbRef.current && !suburbRef.current.contains(e.target as Node)) setSuburbOpen(false);
      if (zoneRef.current && !zoneRef.current.contains(e.target as Node)) setZoneOpen(false);
    }
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  // Sync lot size from preset
  useEffect(() => {
    const p = LOT_SIZE_OPTIONS[lotSizePreset];
    setLotMin(p.min);
    setLotMax(p.max);
  }, [lotSizePreset]);

  const handleSuburbSelect = (name: string) => {
    setSuburb(name);
    setSuburbCoords(SUBURB_CENTROIDS[name] || null);
    setSuburbOpen(false);
    setSuburbFilter("");
  };

  const toggleZone = (code: string) => {
    setSelectedZones((prev) =>
      prev.includes(code) ? prev.filter((z) => z !== code) : [...prev, code]
    );
  };

  const handleSearch = useCallback(async () => {
    if (!suburbCoords) return;
    setLoading(true);
    setSearched(true);

    const params = new URLSearchParams({
      lat: String(suburbCoords.lat),
      lng: String(suburbCoords.lng),
      radius: String(radiusKm),
      zones: selectedZones.join(","),
      lotMin: String(lotMin),
      lotMax: String(lotMax),
      frontageMin: String(frontageMin),
      excludeHeritage: String(excludeHeritage),
    });

    try {
      const res = await fetch(`/api/search?${params}`);
      const data = await res.json();
      setResults(data.results || []);
      setResultCount(data.count || 0);
    } catch {
      setResults([]);
      setResultCount(0);
    } finally {
      setLoading(false);
    }
  }, [suburbCoords, radiusKm, selectedZones, lotMin, lotMax, frontageMin, excludeHeritage]);

  const handleResultClick = (r: SearchResult) => {
    router.push(`/address?lat=${r.lat}&lng=${r.lng}&q=${encodeURIComponent(`${r.zone} lot near ${suburb}`)}`);
  };

  const filteredSuburbs = SUBURB_LIST.filter((s) =>
    s.toLowerCase().includes(suburbFilter.toLowerCase())
  );

  return (
    <main className="min-h-screen flex flex-col">
      {/* Nav */}
      <div className="sticky top-0 z-40 backdrop-blur-xl border-b" style={{ background: "var(--bg-elevated)", borderColor: "var(--border)" }}>
        <div className="max-w-[1800px] mx-auto px-4 py-3 flex items-center gap-2 sm:gap-4">
          <Link href="/" className="font-semibold text-sm shrink-0 transition" style={{ color: "var(--accent)" }}>
            PlanView
          </Link>
          <div className="flex items-center gap-1 overflow-x-auto">
            <Link href="/" className="px-3 py-1.5 rounded-lg text-xs sm:text-sm transition whitespace-nowrap" style={{ color: "var(--text-muted)" }}>
              Home
            </Link>
            <span className="px-3 py-1.5 rounded-lg text-xs sm:text-sm font-medium whitespace-nowrap" style={{ background: "var(--accent-subtle)", color: "var(--accent)" }}>
              <SlidersHorizontal size={14} className="inline mr-1.5 -mt-0.5" />
              Site Search
              <span className="text-[10px] font-semibold px-1.5 py-0.5 ml-1 rounded-full" style={{ background: "var(--bg-card)", color: "var(--accent)" }}>Beta</span>
            </span>
            <Link href="/ssda" className="px-3 py-1.5 rounded-lg text-xs sm:text-sm transition whitespace-nowrap" style={{ color: "var(--text-muted)" }}>
              <Construction size={14} className="inline mr-1.5 -mt-0.5" />
              Major Projects
              <span className="text-[10px] font-semibold px-1.5 py-0.5 ml-1 rounded-full" style={{ background: "var(--accent-subtle)", color: "var(--accent)" }}>Beta</span>
            </Link>
          </div>
          <div className="ml-auto">
            <ThemeToggle />
          </div>
        </div>
      </div>

      {/* Body */}
      <div className="flex-1 flex flex-col lg:flex-row">
        {/* Filter Sidebar */}
        <aside className="lg:w-[340px] shrink-0 border-b lg:border-b-0 lg:border-r p-4 lg:overflow-y-auto lg:max-h-[calc(100vh-57px)]" style={{ borderColor: "var(--border)", background: "var(--bg-sunken)" }}>
          <h2 className="text-lg font-bold mb-1" style={{ color: "var(--text-primary)" }}>
            Property Search
          </h2>
          <p className="text-xs mb-5" style={{ color: "var(--text-muted)" }}>
            Find development-ready lots by criteria
          </p>

          {/* Location */}
          <div className="mb-4" ref={suburbRef}>
            <label className="block text-xs font-semibold mb-1.5" style={{ color: "var(--text-secondary)" }}>
              Location
            </label>
            <div className="relative">
              <button
                onClick={() => setSuburbOpen(!suburbOpen)}
                className="w-full text-left px-3 py-2.5 rounded-lg text-sm border transition"
                style={{ background: "var(--card-bg)", borderColor: "var(--border)", color: suburb ? "var(--text-primary)" : "var(--text-muted)" }}
              >
                {suburb || "Select suburb..."}
                <ChevronDown size={14} className="absolute right-3 top-3" style={{ color: "var(--text-muted)" }} />
              </button>
              <AnimatePresence>
                {suburbOpen && (
                  <motion.div
                    initial={{ opacity: 0, y: -4 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -4 }}
                    className="absolute z-50 top-full mt-1 left-0 right-0 rounded-lg border shadow-lg overflow-hidden"
                    style={{ background: "var(--card-bg)", borderColor: "var(--border)" }}
                  >
                    <input
                      autoFocus
                      value={suburbFilter}
                      onChange={(e) => setSuburbFilter(e.target.value)}
                      placeholder="Search suburbs..."
                      className="w-full px-3 py-2 text-sm border-b outline-none"
                      style={{ background: "var(--bg-sunken)", borderColor: "var(--border)", color: "var(--text-primary)" }}
                    />
                    <div className="max-h-48 overflow-y-auto">
                      {filteredSuburbs.slice(0, 30).map((s) => (
                        <button
                          key={s}
                          onClick={() => handleSuburbSelect(s)}
                          className="block w-full text-left px-3 py-2 text-sm hover:bg-[var(--accent-subtle)] transition"
                          style={{ color: "var(--text-primary)" }}
                        >
                          {s}
                        </button>
                      ))}
                      {filteredSuburbs.length === 0 && (
                        <p className="px-3 py-2 text-xs" style={{ color: "var(--text-muted)" }}>No suburbs found</p>
                      )}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>

          {/* Radius */}
          <div className="mb-4">
            <label className="block text-xs font-semibold mb-1.5" style={{ color: "var(--text-secondary)" }}>
              Search Radius: {radiusKm} km
            </label>
            <input
              type="range"
              min={0.5}
              max={5}
              step={0.5}
              value={radiusKm}
              onChange={(e) => setRadiusKm(parseFloat(e.target.value))}
              className="w-full accent-[var(--accent)]"
            />
            <div className="flex justify-between text-[10px] mt-0.5" style={{ color: "var(--text-muted)" }}>
              <span>0.5 km</span>
              <span>5 km</span>
            </div>
          </div>

          {/* Zoning */}
          <div className="mb-4 relative" ref={zoneRef}>
            <label className="block text-xs font-semibold mb-1.5" style={{ color: "var(--text-secondary)" }}>
              Zoning {selectedZones.length > 0 && <span className="ml-1 text-[10px] px-1.5 py-0.5 rounded-full" style={{ background: "var(--accent-subtle)", color: "var(--accent)" }}>{selectedZones.length}</span>}
            </label>
            <button
              onClick={() => setZoneOpen(!zoneOpen)}
              className="w-full text-left px-3 py-2.5 rounded-lg text-sm border transition relative"
              style={{ background: "var(--card-bg)", borderColor: "var(--border)", color: selectedZones.length ? "var(--text-primary)" : "var(--text-muted)" }}
            >
              {selectedZones.length ? selectedZones.join(", ") : "Select zones..."}
              <ChevronDown size={14} className="absolute right-3 top-3" style={{ color: "var(--text-muted)" }} />
            </button>
            <AnimatePresence>
              {zoneOpen && (
                <motion.div
                  initial={{ opacity: 0, y: -4 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -4 }}
                  className="absolute z-50 mt-1 w-[308px] rounded-lg border shadow-lg overflow-hidden"
                  style={{ background: "var(--card-bg)", borderColor: "var(--border)" }}
                >
                  <div className="max-h-64 overflow-y-auto p-2">
                    {ZONE_GROUPS.map((group) => (
                      <div key={group.label} className="mb-2">
                        <p className="text-[10px] font-bold uppercase px-2 py-1" style={{ color: "var(--text-muted)" }}>{group.label}</p>
                        {group.zones.map((z) => (
                          <label key={z.code} className="flex items-center gap-2 px-2 py-1.5 rounded hover:bg-[var(--accent-subtle)] cursor-pointer transition">
                            <input
                              type="checkbox"
                              checked={selectedZones.includes(z.code)}
                              onChange={() => toggleZone(z.code)}
                              className="accent-[var(--accent)] rounded"
                            />
                            <span className="text-xs font-medium" style={{ color: "var(--text-primary)" }}>{z.code}</span>
                            <span className="text-[10px]" style={{ color: "var(--text-muted)" }}>{z.name}</span>
                          </label>
                        ))}
                      </div>
                    ))}
                  </div>
                  {selectedZones.length > 0 && (
                    <div className="border-t px-3 py-2 flex justify-between" style={{ borderColor: "var(--border)" }}>
                      <button onClick={() => setSelectedZones([])} className="text-xs" style={{ color: "var(--text-muted)" }}>Clear all</button>
                      <button onClick={() => setZoneOpen(false)} className="text-xs font-medium" style={{ color: "var(--accent)" }}>Done</button>
                    </div>
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Lot Size */}
          <div className="mb-4">
            <label className="block text-xs font-semibold mb-1.5" style={{ color: "var(--text-secondary)" }}>
              Lot Size
            </label>
            <div className="grid grid-cols-2 gap-2">
              {LOT_SIZE_OPTIONS.map((opt, i) => (
                <button
                  key={opt.label}
                  onClick={() => setLotSizePreset(i)}
                  className={`px-2 py-1.5 rounded-lg text-xs border transition ${i === 0 ? "col-span-2" : ""}`}
                  style={lotSizePreset === i
                    ? { background: "var(--accent-subtle)", borderColor: "var(--accent-border)", color: "var(--accent)", fontWeight: 600 }
                    : { background: "var(--card-bg)", borderColor: "var(--border)", color: "var(--text-muted)" }
                  }
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          {/* Frontage */}
          <div className="mb-4">
            <label className="block text-xs font-semibold mb-1.5" style={{ color: "var(--text-secondary)" }}>
              Min Frontage: {frontageMin > 0 ? `${frontageMin}m` : "Any"}
            </label>
            <input
              type="range"
              min={0}
              max={30}
              step={1}
              value={frontageMin}
              onChange={(e) => setFrontageMin(parseInt(e.target.value))}
              className="w-full accent-[var(--accent)]"
            />
            <div className="flex justify-between text-[10px] mt-0.5" style={{ color: "var(--text-muted)" }}>
              <span>Any</span>
              <span>30m+</span>
            </div>
          </div>

          {/* Overlays */}
          <div className="mb-6">
            <label className="block text-xs font-semibold mb-1.5" style={{ color: "var(--text-secondary)" }}>
              Overlays
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={excludeHeritage}
                onChange={(e) => setExcludeHeritage(e.target.checked)}
                className="accent-[var(--accent)] rounded"
              />
              <span className="text-xs" style={{ color: "var(--text-primary)" }}>Exclude heritage-listed lots</span>
            </label>
          </div>

          {/* Search button */}
          <button
            onClick={handleSearch}
            disabled={!suburbCoords || loading}
            className="w-full py-3 rounded-xl text-sm font-semibold transition-all disabled:opacity-50"
            style={{ background: "var(--accent)", color: "#fff" }}
          >
            {loading ? (
              <span className="flex items-center justify-center gap-2">
                <Loader2 size={16} className="animate-spin" /> Searching...
              </span>
            ) : (
              <span className="flex items-center justify-center gap-2">
                <Search size={16} /> Search Sites
              </span>
            )}
          </button>

          {searched && !loading && (
            <p className="text-xs mt-3 text-center" style={{ color: "var(--text-muted)" }}>
              {resultCount} {resultCount === 1 ? "lot" : "lots"} found
            </p>
          )}
        </aside>

        {/* Results Area */}
        <div className="flex-1 flex flex-col min-h-[50vh] lg:min-h-0">
          {/* View toggle bar */}
          <div className="flex items-center gap-2 px-4 py-2 border-b shrink-0" style={{ borderColor: "var(--border)", background: "var(--bg-elevated)" }}>
            <button
              onClick={() => setViewMode("map")}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border transition"
              style={viewMode === "map"
                ? { background: "var(--accent-subtle)", borderColor: "var(--accent-border)", color: "var(--accent)" }
                : { background: "transparent", borderColor: "var(--border)", color: "var(--text-muted)" }
              }
            >
              <Map size={14} /> Map View
            </button>
            <button
              onClick={() => setViewMode("list")}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border transition"
              style={viewMode === "list"
                ? { background: "var(--accent-subtle)", borderColor: "var(--accent-border)", color: "var(--accent)" }
                : { background: "transparent", borderColor: "var(--border)", color: "var(--text-muted)" }
              }
            >
              <List size={14} /> List View
            </button>
            {searched && !loading && (
              <span className="ml-auto text-xs" style={{ color: "var(--text-muted)" }}>
                Showing {Math.min(results.length, 200)} of {resultCount} results
              </span>
            )}
          </div>

          {/* Content */}
          <div className="flex-1 min-h-0 relative">
            {!searched && !loading && (
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="text-center px-6">
                  <SlidersHorizontal size={48} className="mx-auto mb-4 opacity-20" style={{ color: "var(--text-muted)" }} />
                  <p className="text-sm font-medium" style={{ color: "var(--text-secondary)" }}>Select filters and search</p>
                  <p className="text-xs mt-1" style={{ color: "var(--text-muted)" }}>Choose a suburb and set your criteria to find development sites</p>
                </div>
              </div>
            )}

            {loading && (
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="text-center">
                  <Loader2 size={32} className="mx-auto animate-spin mb-3" style={{ color: "var(--accent)" }} />
                  <p className="text-sm" style={{ color: "var(--text-muted)" }}>Querying NSW planning data...</p>
                </div>
              </div>
            )}

            {searched && !loading && viewMode === "map" && (
              <SearchMapView
                results={results}
                center={suburbCoords}
                radiusKm={radiusKm}
                onResultClick={handleResultClick}
              />
            )}

            {searched && !loading && viewMode === "list" && (
              <div className="overflow-y-auto h-full p-4">
                {results.length === 0 ? (
                  <div className="text-center py-12">
                    <p className="text-sm" style={{ color: "var(--text-muted)" }}>No lots match your criteria. Try widening your filters.</p>
                  </div>
                ) : (
                  <div className="space-y-2 max-w-4xl">
                    {results.map((r, i) => (
                      <button
                        key={i}
                        onClick={() => handleResultClick(r)}
                        className="w-full text-left p-3 rounded-xl border transition hover:scale-[1.01]"
                        style={{ background: "var(--card-bg)", borderColor: "var(--border)" }}
                      >
                        <div className="flex items-center justify-between gap-3">
                          <div className="flex items-center gap-3 flex-1 min-w-0">
                            {/* Aerial thumbnail */}
                            <div className="w-20 h-14 rounded-lg overflow-hidden flex-shrink-0" style={{ background: "var(--surface)" }}>
                              {r.rings?.[0]?.length > 0 && (
                                <img
                                  src={aerialUrl(r.rings)}
                                  alt="Aerial view"
                                  className="w-full h-full object-cover"
                                  loading="lazy"
                                />
                              )}
                            </div>
                            <div className="min-w-0">
                              <div className="flex items-center gap-2">
                                <span className="text-xs font-bold px-1.5 py-0.5 rounded" style={{ background: "var(--accent-subtle)", color: "var(--accent)" }}>{r.zone}</span>
                                <span className="text-xs" style={{ color: "var(--text-muted)" }}>{r.zoneLabel}</span>
                              </div>
                              {r.lotId && <div className="text-xs mt-0.5" style={{ color: "var(--text-secondary)" }}>Lot {r.lotId}</div>}
                              <div className="flex items-center gap-3 mt-1 text-xs" style={{ color: "var(--text-secondary)" }}>
                                <span>{r.area.toLocaleString()} m²</span>
                                <span>•</span>
                                <span>{r.frontage}m frontage</span>
                                <span>•</span>
                                <span>{r.lat.toFixed(4)}, {r.lng.toFixed(4)}</span>
                              </div>
                            </div>
                          </div>
                          <ExternalLink size={14} className="flex-shrink-0" style={{ color: "var(--text-muted)" }} />
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </main>
  );
}
