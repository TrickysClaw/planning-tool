"use client";
import { useState, useCallback, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import SearchBar from "./components/SearchBar";
import ReportCard from "./components/ReportCard";

import ConnectivityCard from "./components/ConnectivityCard";
import PerceptionCard from "./components/PerceptionCard";
import HDACard from "./components/HDACard";
import NearbyDACard from "./components/NearbyDACard";
import NearbyCDCCard from "./components/NearbyCDCCard";
import PlanningMap from "./components/PlanningMap";
import type { MapMarker } from "./components/PlanningMap";
import { Loader2, BookOpen, X, Building2, Ruler, BarChart3, Maximize2, Shield, Flame, Droplets, Landmark, Mountain, FlaskConical, MapPinned, Search, Construction, Map, ClipboardList, ShieldAlert, Clock, ExternalLink } from "lucide-react";
import Link from "next/link";

/* eslint-disable @typescript-eslint/no-explicit-any */

interface SearchHistoryEntry {
  address: string;
  lat: number;
  lng: number;
  zone: string;
  timestamp: number;
}

function getSearchHistory(): SearchHistoryEntry[] {
  if (typeof window === "undefined") return [];
  try {
    return JSON.parse(localStorage.getItem("planning-search-history") || "[]");
  } catch { return []; }
}

function saveSearchHistory(entry: SearchHistoryEntry) {
  if (typeof window === "undefined") return;
  const history = getSearchHistory().filter(h => h.address !== entry.address);
  history.unshift(entry);
  localStorage.setItem("planning-search-history", JSON.stringify(history.slice(0, 10)));
}

const glossary = [
  {
    icon: <Building2 className="text-emerald-400" size={22} />,
    term: "Zoning",
    short: "What you can build on the land",
    detail: "Every parcel of land in NSW is assigned a zone under the Local Environmental Plan (LEP). The zone determines what types of development are permitted (with or without consent) or prohibited.",
    example: "R2 Low Density Residential → Houses, duplexes, home businesses.",
  },
  {
    icon: <Ruler className="text-emerald-400" size={22} />,
    term: "Height of Building (HOB)",
    short: "Maximum height your building can reach",
    detail: "The Height of Building control sets the maximum height (in metres) that any structure on the land can reach, measured from existing ground level to the highest point. A rough guide: each residential storey is about 3 metres.",
    example: "9m height limit ≈ 2-3 storeys. 15m ≈ 4-5 storeys. 45m+ ≈ high-rise tower.",
  },
  {
    icon: <BarChart3 className="text-emerald-400" size={22} />,
    term: "Floor Space Ratio (FSR)",
    short: "How much floor area you can build relative to lot size",
    detail: "FSR is the ratio of total gross floor area to total site area. An FSR of 0.5:1 means you can build floor area equal to half the lot size. FSR works together with height limits.",
    example: "600m² lot × 0.5:1 FSR = 300m² max floor area. 600m² lot × 2.5:1 FSR = 1,500m² max floor area.",
  },
  {
    icon: <Maximize2 className="text-emerald-400" size={22} />,
    term: "Minimum Lot Size",
    short: "Smallest block you can subdivide into",
    detail: "This control sets the minimum area a lot must have to be subdivided or developed. If you want to do a duplex or subdivision, the resulting lots must each meet the minimum lot size.",
    example: "Minimum lot size 450m² → You need at least 900m² to subdivide into two lots.",
  },
  {
    icon: <Landmark className="text-emerald-400" size={22} />,
    term: "Heritage",
    short: "Whether the property or area has heritage significance",
    detail: "Heritage listings protect places of historical, architectural, cultural or natural significance. A property can be individually listed (heritage item) or within a Heritage Conservation Area (HCA).",
    example: "Heritage item → Major constraints on external changes. HCA → New builds must match neighbourhood character.",
  },
  {
    icon: <Flame className="text-emerald-400" size={22} />,
    term: "Bushfire Prone Land",
    short: "Whether the land is at risk of bushfire",
    detail: "Land mapped as bushfire prone requires compliance with Planning for Bush Fire Protection 2019. Development must include Asset Protection Zones, specific construction standards, and access requirements.",
    example: "BAL-29 rating → Ember-resistant construction, ~10-15% cost premium. BAL-FZ → Extremely restricted.",
  },
  {
    icon: <Droplets className="text-emerald-400" size={22} />,
    term: "Flood Planning",
    short: "Whether the land is in a flood-affected area",
    detail: "Flood-affected land has restrictions under the NSW Flood Prone Land Policy. Habitable floor levels must be above the Flood Planning Level. Some areas prohibit certain types of development entirely.",
    example: "Flood Planning Area → Floor levels must be raised. Floodway → Extremely restricted development.",
  },
  {
    icon: <Mountain className="text-emerald-400" size={22} />,
    term: "Landslide Risk",
    short: "Whether the land is susceptible to landslide",
    detail: "Landslide risk mapping identifies areas where terrain, geology, and drainage make land movements more likely. Development typically requires geotechnical investigation.",
    example: "Landslide risk → Geotechnical report required. May need piled foundations, adding $50-100k+ to build cost.",
  },
  {
    icon: <FlaskConical className="text-emerald-400" size={22} />,
    term: "Acid Sulfate Soils",
    short: "Soil that produces acid when exposed to air",
    detail: "Acid sulfate soils contain iron sulfides that produce sulfuric acid when disturbed. Classes range from 1 (highest risk) to 5 (lowest). Development on Class 1-4 soils requires a management plan.",
    example: "Class 1 → Works at any depth need a management plan. Class 5 → Only adjacent works affected.",
  },
  {
    icon: <MapPinned className="text-emerald-400" size={22} />,
    term: "Key Sites",
    short: "Land identified for specific development outcomes",
    detail: "Key sites are designated in LEPs or SEPPs for particular outcomes — often with special controls, additional permitted uses, or modified development standards.",
    example: "Key Site → May allow additional height or mixed-use development not normally permitted in the zone.",
  },
  {
    icon: <Shield className="text-emerald-400" size={22} />,
    term: "LEP (Local Environmental Plan)",
    short: "The legal planning document for a council area",
    detail: "The LEP is the principal legal document that guides planning decisions. It contains the zoning map, development standards, heritage schedules, and other provisions.",
    example: "The Hills LEP 2019 governs development in Castle Hill, Norwest, Baulkham Hills etc.",
  },
];

const EXAMPLE_ADDRESSES = [
  { display: "1 Martin Place, Sydney NSW 2000", lat: -33.8678, lng: 151.2093 },
  { display: "45 Norwest Blvd, Bella Vista NSW 2153", lat: -33.7308, lng: 150.9538 },
  { display: "12 Castle Street, Castle Hill NSW 2154", lat: -33.7310, lng: 151.0050 },
  { display: "100 George Street, Parramatta NSW 2150", lat: -33.8151, lng: 151.0030 },
];

const FEATURES = [
  { icon: <Map size={28} />, title: "Zoning & Controls", desc: "Instantly see zoning, height limits, FSR, lot size, and heritage status for any property" },
  { icon: <ClipboardList size={28} />, title: "Nearby Development", desc: "Browse DAs and CDCs lodged near any address — see what others are building" },
  { icon: <ShieldAlert size={28} />, title: "Risk Assessment", desc: "Check bushfire, flood, landslide, and acid sulfate soil risks in one place" },
];

export default function Home() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [showGuide, setShowGuide] = useState(false);
  const [hdaMarkers, setHdaMarkers] = useState<MapMarker[]>([]);
  const [daMarkers, setDaMarkers] = useState<MapMarker[]>([]);
  const [lotPolygon, setLotPolygon] = useState<[number, number][] | undefined>(undefined);
  const [lgaBoundary, setLgaBoundary] = useState<[number, number][] | undefined>(undefined);
  const [zoneCode, setZoneCode] = useState<string>("");
  const [searchHistory, setSearchHistory] = useState<SearchHistoryEntry[]>([]);

  useEffect(() => {
    setSearchHistory(getSearchHistory());
  }, []);

  const handleHDAProjects = useCallback((projects: any[]) => {
    const markers: MapMarker[] = projects
      .filter((p: any) => p.coords)
      .map((p: any) => ({
        lat: p.coords.lat,
        lng: p.coords.lng,
        label: `EOI ${p.eoi_number}: ${p.address}${p.dwellings ? ` (${p.dwellings} dwl)` : ""}`,
        color: p.recommendation?.includes("Declare SSD")
          ? "hda-declared"
          : p.recommendation?.includes("Deferred")
          ? "hda-deferred"
          : "hda-not-declared",
      }));
    setHdaMarkers(markers);
  }, []);

  const handleDAResults = useCallback((das: any[]) => {
    const markers: MapMarker[] = das
      .filter((d: any) => d.lat && d.lng)
      .map((d: any) => {
        const status = (d.status || "").toLowerCase();
        const color = status.includes("assessment")
          ? "da-under-assessment"
          : status.includes("rejected")
          ? "da-rejected"
          : "da-determined";
        return { lat: d.lat, lng: d.lng, label: `${d.address} (${d.status})`, color };
      });
    setDaMarkers(markers);
  }, []);

  async function handleSelect(r: { display_name: string; lat: string; lon: string }) {
    const lat = parseFloat(r.lat);
    const lng = parseFloat(r.lon);
    setCoords({ lat, lng });
    setLoading(true);
    setData(null);
    setZoneCode("");

    const [planning, hazard, cadastre, lga] = await Promise.all([
      fetch(`/api/planning?lat=${lat}&lng=${lng}`).then(r => r.json()).catch(() => ({ results: [] })),
      fetch(`/api/hazard?lat=${lat}&lng=${lng}`).then(r => r.json()).catch(() => ({ bushfire: { features: [] }, flood: { features: [] } })),
      fetch(`/api/cadastre?lat=${lat}&lng=${lng}`).then(r => r.json()).catch(() => ({ features: [] })),
      fetch(`/api/lga?lat=${lat}&lng=${lng}`).then(r => r.json()).catch(() => ({ councilName: null, boundary: null })),
    ]);

    setLgaBoundary(lga?.boundary || undefined);

    let poly: [number, number][] | undefined;
    if (cadastre?.features?.[0]?.geometry?.rings?.[0]) {
      const ring = cadastre.features[0].geometry.rings[0] as number[][];
      poly = ring.map(([mx, my]: number[]) => {
        const pLng = (mx * 180) / 20037508.34;
        const pLat = (Math.atan(Math.exp((my * Math.PI) / 20037508.34)) * 360) / Math.PI - 90;
        return [pLat, pLng] as [number, number];
      });
    }
    setLotPolygon(poly);

    const zoningResult = (planning?.results || []).find((r: any) => r.layerName === "Land Zoning");
    const zone = zoningResult?.attributes?.SYM_CODE || "";
    setZoneCode(zone);

    setData({ address: r.display_name, planning, hazard, cadastre, councilName: lga?.councilName || "" });
    setLoading(false);

    const entry: SearchHistoryEntry = { address: r.display_name, lat, lng, zone, timestamp: Date.now() };
    saveSearchHistory(entry);
    setSearchHistory(getSearchHistory());
  }

  function handleExampleClick(addr: { display: string; lat: number; lng: number }) {
    handleSelect({ display_name: addr.display, lat: String(addr.lat), lon: String(addr.lng) });
  }

  function handleHistoryClick(entry: SearchHistoryEntry) {
    handleSelect({ display_name: entry.address, lat: String(entry.lat), lon: String(entry.lng) });
  }

  const streetViewUrl = coords
    ? `https://www.google.com/maps/@${coords.lat},${coords.lng},3a,75y,0h,90t/data=!3m6!1e1!3m4!1s!2e0!7i16384!8i8192`
    : null;

  return (
    <main className="min-h-screen px-4 py-12 md:py-20">
      {/* Navigation Tabs */}
      <div className="flex justify-center mb-8">
        <div className="inline-flex rounded-xl bg-white/[0.03] border border-white/[0.06] p-1 gap-1">
          <span className="flex items-center gap-2 px-4 py-2 rounded-lg bg-emerald-500/15 text-emerald-300 text-sm font-medium">
            <Search size={14} />
            Address Search
          </span>
          <Link href="/ssda" className="flex items-center gap-2 px-4 py-2 rounded-lg text-slate-400 hover:text-white hover:bg-white/[0.05] text-sm font-medium transition">
            <Construction size={14} />
            Major Projects
          </Link>
        </div>
      </div>

      <div className="text-center mb-8">
        <motion.h1 initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} className="text-4xl md:text-5xl font-bold text-white mb-3">
          NSW Planning Intelligence
        </motion.h1>
        <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.2 }} className="text-slate-400 text-lg">
          Search any address. Know what you can build.
        </motion.p>
      </div>

      <SearchBar onSelect={handleSelect} searchHistory={searchHistory} onHistoryClick={handleHistoryClick} />

      {/* Landing content */}
      {!data && !loading && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.3 }} className="mt-16 max-w-4xl mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-12">
            {FEATURES.map((f, i) => (
              <motion.div key={f.title} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 + i * 0.1 }} className="glass-card text-center">
                <div className="flex justify-center mb-3 text-emerald-400">{f.icon}</div>
                <h3 className="text-white font-semibold mb-2">{f.title}</h3>
                <p className="text-slate-400 text-sm">{f.desc}</p>
              </motion.div>
            ))}
          </div>

          <div className="mb-12">
            <h3 className="text-center text-slate-400 text-sm font-medium mb-4">Try these addresses</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-w-2xl mx-auto">
              {EXAMPLE_ADDRESSES.map((addr) => (
                <button key={addr.display} onClick={() => handleExampleClick(addr)} className="glass-card !p-3 text-left text-sm text-slate-300 hover:text-white hover:border-emerald-500/30 transition-all flex items-center gap-2">
                  <MapPinned size={14} className="text-emerald-400 shrink-0" />
                  {addr.display}
                </button>
              ))}
            </div>
          </div>

          {searchHistory.length > 0 && (
            <div>
              <h3 className="text-center text-slate-400 text-sm font-medium mb-4 flex items-center justify-center gap-2">
                <Clock size={14} /> Recent searches
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-w-2xl mx-auto">
                {searchHistory.slice(0, 4).map((entry) => (
                  <button key={entry.timestamp} onClick={() => handleHistoryClick(entry)} className="glass-card !p-3 text-left text-sm text-slate-300 hover:text-white hover:border-emerald-500/30 transition-all flex items-center gap-2">
                    <Clock size={14} className="text-slate-500 shrink-0" />
                    <span className="truncate">{entry.address}</span>
                    {entry.zone && <span className="shrink-0 text-xs text-emerald-400/60">{entry.zone}</span>}
                  </button>
                ))}
              </div>
            </div>
          )}
        </motion.div>
      )}

      {loading && (
        <div className="flex justify-center mt-12">
          <Loader2 className="animate-spin text-emerald-400" size={40} />
        </div>
      )}

      {data && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="mt-10 space-y-6">
          <ReportCard data={data} />

          {coords && (
            <div className="max-w-6xl mx-auto mt-4">
              <div className="flex justify-end mb-2">
                <a href={streetViewUrl || "#"} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 px-4 py-2 rounded-lg bg-white/[0.03] border border-white/[0.06] text-slate-300 hover:text-white hover:border-emerald-500/30 text-sm transition-all">
                  <ExternalLink size={14} />
                  View Street View
                </a>
              </div>
              <PlanningMap lat={coords.lat} lng={coords.lng} markers={[...hdaMarkers, ...daMarkers]} polygon={lotPolygon} lgaBoundary={lgaBoundary} zoneCode={zoneCode} />
            </div>
          )}

          {coords && (
            <div className="max-w-6xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
              <ConnectivityCard lat={coords.lat} lng={coords.lng} />
              <PerceptionCard address={data.address} />
              <HDACard address={data.address} lat={coords.lat} lng={coords.lng} onProjects={handleHDAProjects} />
              <NearbyDACard lat={coords.lat} lng={coords.lng} onDAs={handleDAResults} />
              <NearbyCDCCard lat={coords.lat} lng={coords.lng} />
            </div>
          )}
        </motion.div>
      )}

      {/* Planning Guide Button */}
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.4 }} className="flex justify-center mt-12">
        <button onClick={() => setShowGuide(true)} className="flex items-center gap-2 px-6 py-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 hover:bg-emerald-500/20 transition-all duration-200">
          <BookOpen size={18} />
          <span className="font-medium">What do these planning terms mean?</span>
        </button>
      </motion.div>

      {/* Planning Guide Modal */}
      <AnimatePresence>
        {showGuide && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 flex items-start justify-center bg-black/70 backdrop-blur-sm overflow-y-auto py-8 px-4" onClick={(e) => e.target === e.currentTarget && setShowGuide(false)}>
            <motion.div initial={{ opacity: 0, y: 40, scale: 0.95 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 40, scale: 0.95 }} transition={{ type: "spring", damping: 25, stiffness: 300 }} className="w-full max-w-3xl">
              <div className="glass-card !p-6 md:!p-8">
                <div className="flex items-center justify-between mb-6">
                  <div>
                    <h2 className="text-2xl font-bold text-white">Planning Terms Explained</h2>
                    <p className="text-slate-400 text-sm mt-1">Everything you need to understand your planning report</p>
                  </div>
                  <button onClick={() => setShowGuide(false)} className="p-2 rounded-lg hover:bg-white/5 text-slate-400 hover:text-white transition">
                    <X size={20} />
                  </button>
                </div>

                <div className="space-y-6">
                  {glossary.map((item, i) => (
                    <motion.div key={item.term} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }} className="p-4 rounded-xl bg-white/[0.02] border border-white/[0.05] hover:border-emerald-500/20 transition-colors">
                      <div className="flex items-center gap-3 mb-2">
                        {item.icon}
                        <h3 className="text-lg font-semibold text-white">{item.term}</h3>
                      </div>
                      <p className="text-emerald-400/80 text-sm font-medium mb-2">{item.short}</p>
                      <p className="text-slate-300 text-sm leading-relaxed mb-3">{item.detail}</p>
                      <div className="px-3 py-2 rounded-lg bg-emerald-500/5 border border-emerald-500/10">
                        <p className="text-xs text-slate-400">
                          <span className="text-emerald-400 font-medium">Example: </span>
                          {item.example}
                        </p>
                      </div>
                    </motion.div>
                  ))}
                </div>

                <div className="mt-6 p-4 rounded-xl bg-emerald-500/5 border border-emerald-500/10">
                  <p className="text-xs text-slate-400 leading-relaxed">
                    <span className="text-emerald-400 font-medium">Disclaimer: </span>
                    This tool provides indicative planning information only. Always verify with your local council and check the full LEP/DCP before making development decisions.
                  </p>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </main>
  );
}
