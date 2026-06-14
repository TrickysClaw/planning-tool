"use client";
import { useState, useCallback, useEffect, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import SearchBar from "../components/SearchBar";
import AISummaryCard from "../components/AISummaryCard";
import LandInfoCard from "../components/LandInfoCard";
// ConnectivityCard disabled - coming soon
import PerceptionCard from "../components/PerceptionCard";
import HDACard from "../components/HDACard";
import NearbyActivityCard from "../components/NearbyActivityCard";
import SSDACard from "../components/SSDACard";
import PlanningMap from "../components/PlanningMap";
import type { MapMarker } from "../components/PlanningMap";
import { BookOpen, X, Building2, Ruler, BarChart3, Maximize2, Shield, Flame, Droplets, Landmark, Mountain, FlaskConical, MapPinned, History } from "lucide-react";
import ThemeToggle from "../components/ThemeToggle";
import Link from "next/link";
import { buildPropertySnapshot } from "@/lib/types";
import HistorySidebar from "../components/HistorySidebar";

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
    icon: <Building2 style={{ color: "var(--text-muted)" }} size={22} />,
    term: "Zoning",
    short: "What you can build on the land",
    detail: "Every parcel of land in NSW is assigned a zone under the Local Environmental Plan (LEP). The zone determines what types of development are permitted (with or without consent) or prohibited.",
    example: "R2 Low Density Residential → Houses, duplexes, home businesses.",
  },
  {
    icon: <Ruler style={{ color: "var(--text-muted)" }} size={22} />,
    term: "Height of Building (HOB)",
    short: "Maximum height your building can reach",
    detail: "The Height of Building control sets the maximum height (in metres) that any structure on the land can reach, measured from existing ground level to the highest point. A rough guide: each residential storey is about 3 metres.",
    example: "9m height limit ≈ 2-3 storeys. 15m ≈ 4-5 storeys. 45m+ ≈ high-rise tower.",
  },
  {
    icon: <BarChart3 style={{ color: "var(--text-muted)" }} size={22} />,
    term: "Floor Space Ratio (FSR)",
    short: "How much floor area you can build relative to lot size",
    detail: "FSR is the ratio of total gross floor area to total site area. An FSR of 0.5:1 means you can build floor area equal to half the lot size. FSR works together with height limits.",
    example: "600m² lot �- 0.5:1 FSR = 300m² max floor area. 600m² lot �- 2.5:1 FSR = 1,500m² max floor area.",
  },
  {
    icon: <Maximize2 style={{ color: "var(--text-muted)" }} size={22} />,
    term: "Minimum Lot Size",
    short: "Smallest block you can subdivide into",
    detail: "This control sets the minimum area a lot must have to be subdivided or developed. If you want to do a duplex or subdivision, the resulting lots must each meet the minimum lot size.",
    example: "Minimum lot size 450m² → You need at least 900m² to subdivide into two lots.",
  },
  {
    icon: <Landmark style={{ color: "var(--text-muted)" }} size={22} />,
    term: "Heritage",
    short: "Whether the property or area has heritage significance",
    detail: "Heritage listings protect places of historical, architectural, cultural or natural significance. A property can be individually listed (heritage item) or within a Heritage Conservation Area (HCA).",
    example: "Heritage item → Major constraints on external changes. HCA → New builds must match neighbourhood character.",
  },
  {
    icon: <Flame style={{ color: "var(--text-muted)" }} size={22} />,
    term: "Bushfire Prone Land",
    short: "Whether the land is at risk of bushfire",
    detail: "Land mapped as bushfire prone requires compliance with Planning for Bush Fire Protection 2019. Development must include Asset Protection Zones, specific construction standards, and access requirements.",
    example: "BAL-29 rating → Ember-resistant construction, ~10-15% cost premium. BAL-FZ → Extremely restricted.",
  },
  {
    icon: <Droplets style={{ color: "var(--text-muted)" }} size={22} />,
    term: "Flood Planning",
    short: "Whether the land is in a flood-affected area",
    detail: "Flood-affected land has restrictions under the NSW Flood Prone Land Policy. Habitable floor levels must be above the Flood Planning Level. Some areas prohibit certain types of development entirely.",
    example: "Flood Planning Area → Floor levels must be raised. Floodway → Extremely restricted development.",
  },
  {
    icon: <Mountain style={{ color: "var(--text-muted)" }} size={22} />,
    term: "Landslide Risk",
    short: "Whether the land is susceptible to landslide",
    detail: "Landslide risk mapping identifies areas where terrain, geology, and drainage make land movements more likely. Development typically requires geotechnical investigation.",
    example: "Landslide risk → Geotechnical report required. May need piled foundations, adding $50-100k+ to build cost.",
  },
  {
    icon: <FlaskConical style={{ color: "var(--text-muted)" }} size={22} />,
    term: "Acid Sulfate Soils",
    short: "Soil that produces acid when exposed to air",
    detail: "Acid sulfate soils contain iron sulfides that produce sulfuric acid when disturbed. Classes range from 1 (highest risk) to 5 (lowest). Development on Class 1-4 soils requires a management plan.",
    example: "Class 1 → Works at any depth need a management plan. Class 5 → Only adjacent works affected.",
  },
  {
    icon: <MapPinned style={{ color: "var(--text-muted)" }} size={22} />,
    term: "Key Sites",
    short: "Land identified for specific development outcomes",
    detail: "Key sites are designated in LEPs or SEPPs for particular outcomes, often with special controls, additional permitted uses, or modified development standards.",
    example: "Key Site → May allow additional height or mixed-use development not normally permitted in the zone.",
  },
  {
    icon: <Shield style={{ color: "var(--text-muted)" }} size={22} />,
    term: "LEP (Local Environmental Plan)",
    short: "The legal planning document for a council area",
    detail: "The LEP is the principal legal document that guides planning decisions. It contains the zoning map, development standards, heritage schedules, and other provisions.",
    example: "The Hills LEP 2019 governs development in Castle Hill, Norwest, Baulkham Hills etc.",
  },
];

export default function AddressPageWrapper() {
  return (
    <Suspense fallback={
      <main className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-t-transparent rounded-full animate-spin mx-auto mb-3" style={{ borderColor: "var(--accent)", borderTopColor: "transparent" }} />
          <p className="text-sm" style={{ color: "var(--text-muted)" }}>Loading...</p>
        </div>
      </main>
    }>
      <AddressPage />
    </Suspense>
  );
}

const loadingSteps = [
  "Locating property boundaries...",
  "Checking zoning & planning controls...",
  "Scanning for hazards: bushfire, flood, landslide...",
  "Looking up nearby development activity...",
  "Pulling suburb crime statistics...",
  "Fetching census demographics & income data...",
  "Analysing market conditions...",
  "Generating insights...",
];

function LoadingIndicator() {
  const [stepIdx, setStepIdx] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setStepIdx((prev) => (prev < loadingSteps.length - 1 ? prev + 1 : prev));
    }, 1800);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="max-w-[1600px] mx-auto mt-6 flex flex-col items-center justify-center py-24">
      <div className="relative mb-6">
        <div className="w-16 h-16 border-4 border-t-transparent rounded-full animate-spin" style={{ borderColor: "var(--accent)", borderTopColor: "transparent" }} />
        <div className="absolute inset-0 w-16 h-16 border-4 border-b-transparent rounded-full animate-spin" style={{ borderColor: "var(--border)", borderBottomColor: "transparent", animationDirection: "reverse", animationDuration: "1.5s" }} />
      </div>
      <p className="text-lg font-medium mb-2" style={{ color: "var(--text-primary)" }}>Analysing property</p>
      <p className="text-sm transition-opacity duration-300" style={{ color: "var(--text-muted)" }} key={stepIdx}>
        {loadingSteps[stepIdx]}
      </p>
      {/* Progress dots */}
      <div className="flex gap-1.5 mt-4">
        {loadingSteps.map((_, i) => (
          <div
            key={i}
            className="w-1.5 h-1.5 rounded-full transition-all duration-300"
            style={{
              background: i <= stepIdx ? "var(--accent)" : "var(--border)",
              opacity: i <= stepIdx ? 1 : 0.4,
            }}
          />
        ))}
      </div>
    </div>
  );
}

function AddressPage() {
  const searchParams = useSearchParams();
  const router = useRouter();

  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [showGuide, setShowGuide] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [hdaMarkers, setHdaMarkers] = useState<MapMarker[]>([]);
  const [daMarkers, setDaMarkers] = useState<MapMarker[]>([]);
  const [cdcMarkers, setCdcMarkers] = useState<MapMarker[]>([]);
  const [ccMarkers, setCcMarkers] = useState<MapMarker[]>([]);
  const [amenityMarkers, setAmenityMarkers] = useState<MapMarker[]>([]);
  const [ssdaMarkers, setSsdaMarkers] = useState<MapMarker[]>([]);
  const [lotPolygon, setLotPolygon] = useState<[number, number][] | undefined>(undefined);
  const [lgaBoundary, setLgaBoundary] = useState<[number, number][] | undefined>(undefined);
  const [zoneCode, setZoneCode] = useState<string>("");
  const [focusPoint, setFocusPoint] = useState<{ lat: number; lng: number } | null>(null);
  const [searchHistory, setSearchHistory] = useState<SearchHistoryEntry[]>([]);

  useEffect(() => {
    setSearchHistory(getSearchHistory());
  }, []);

  // Load data from URL params on mount
  useEffect(() => {
    const lat = searchParams.get("lat");
    const lng = searchParams.get("lng");
    const q = searchParams.get("q");
    if (lat && lng && q) {
      fetchData(q, parseFloat(lat), parseFloat(lng));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleHDAProjects = useCallback((projects: any[]) => {
    const markers: MapMarker[] = projects
      .filter((p: any) => p.coords)
      .map((p: any) => ({
        lat: p.coords.lat,
        lng: p.coords.lng,
        label: p.address || `EOI ${p.eoi_number}`,
        color: p.recommendation?.includes("Declare SSD")
          ? "hda-declared"
          : p.recommendation?.includes("Deferred")
          ? "hda-deferred"
          : "hda-not-declared",
        description: p.type ? `${p.type} development` : undefined,
        dwellings: p.dwellings || undefined,
        cost: p.capital_investment || undefined,
        status: p.outcome || p.recommendation || undefined,
        date: p.briefing_date || undefined,
        pan: `EOI ${p.eoi_number}`,
        link: `https://www.planning.nsw.gov.au/policy-and-legislation/housing/housing-delivery-authority`,
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
        return {
          lat: d.lat,
          lng: d.lng,
          label: d.address,
          color,
          description: d.description || (d.type?.length ? d.type.join(", ") : undefined),
          cost: d.costOfDevelopment || undefined,
          dwellings: d.dwellings || undefined,
          storeys: d.storeys || undefined,
          status: d.status || undefined,
          date: d.lodgementDate || undefined,
          pan: d.pan || undefined,
          councilRef: d.councilRef || undefined,
          link: d.pan ? `https://www.planningportal.nsw.gov.au/map?search=${encodeURIComponent(d.pan)}` : undefined,
        };
      });
    setDaMarkers(markers);
  }, []);

  const handleCDCResults = useCallback((cdcs: any[]) => {
    const markers: MapMarker[] = cdcs
      .filter((c: any) => c.lat && c.lng)
      .map((c: any) => {
        const status = (c.status || "").toLowerCase();
        const color = status.includes("assessment")
          ? "cdc-under-assessment"
          : status.includes("rejected")
          ? "cdc-rejected"
          : "cdc-determined";
        return {
          lat: c.lat,
          lng: c.lng,
          label: c.address,
          color,
          description: c.description || (c.applicationType ? c.applicationType : undefined),
          cost: c.costOfDevelopment || undefined,
          dwellings: c.dwellings || undefined,
          storeys: c.storeys || undefined,
          status: c.status || undefined,
          date: c.lodgementDate || undefined,
          pan: c.pan || undefined,
          councilRef: c.councilRef || undefined,
          link: c.pan ? `https://www.planningportal.nsw.gov.au/map?search=${encodeURIComponent(c.pan)}` : undefined,
        };
      });
    setCdcMarkers(markers);
  }, []);

  const handleCCResults = useCallback((ccs: any[]) => {
    const markers: MapMarker[] = ccs
      .filter((c: any) => c.lat && c.lng)
      .map((c: any) => ({
        lat: c.lat,
        lng: c.lng,
        label: c.address,
        color: "cc-determined" as any,
        description: c.description || (c.type?.length ? c.type.join(", ") : undefined),
        cost: c.costOfDevelopment || undefined,
        storeys: c.storeys || undefined,
        status: c.status || undefined,
        date: c.lodgementDate || undefined,
        pan: c.pan || undefined,
      }));
    setCcMarkers(markers);
  }, []);

  const handleItemClick = useCallback((point: { lat: number; lng: number }) => {
    setFocusPoint(point);
    // Only scroll if the map isn't already visible in viewport
    const mapEl = document.getElementById("map");
    if (mapEl) {
      const rect = mapEl.getBoundingClientRect();
      const inView = rect.top < window.innerHeight && rect.bottom > 0;
      if (!inView) {
        mapEl.scrollIntoView({ behavior: "smooth", block: "center" });
      }
    }
  }, []);

  const handleAmenities = useCallback((amenities: { type: string; name: string; distance: number; lat: number; lng: number }[]) => {
    const markers: MapMarker[] = amenities.map((a) => ({
      lat: a.lat,
      lng: a.lng,
      label: a.name,
      color: `amenity-${a.type}`,
      description: `${a.distance}m away`,
    }));
    setAmenityMarkers(markers);
  }, []);

  const handleSSDAProjects = useCallback((projects: any[]) => {
    const markers: MapMarker[] = projects
      .filter((p: any) => p.coords?.lat && p.coords?.lng)
      .map((p: any) => ({
        lat: p.coords.lat,
        lng: p.coords.lng,
        label: p.address || p.title,
        color: "ssda" as any,
        description: p.title,
        status: p.status || undefined,
        link: p.detailUrl || undefined,
      }));
    setSsdaMarkers(markers);
  }, []);

  async function fetchData(address: string, lat: number, lng: number) {
    setCoords({ lat, lng });
    setLoading(true);
    setData(null);
    setZoneCode("");

    // Fetch ALL data in parallel - server-side timeouts prevent any single API from hanging
    const [planning, hazard, cadastre, lga, hda, connectivity, perception, daData, cdcData, ccData] = await Promise.all([
      fetch(`/api/planning?lat=${lat}&lng=${lng}`).then(r => r.json()).catch(() => ({ results: [] })),
      fetch(`/api/hazard?lat=${lat}&lng=${lng}`).then(r => r.json()).catch(() => ({ bushfire: { features: [] }, flood: { features: [] } })),
      fetch(`/api/cadastre?lat=${lat}&lng=${lng}`).then(r => r.json()).catch(() => ({ features: [] })),
      fetch(`/api/lga?lat=${lat}&lng=${lng}`).then(r => r.json()).catch(() => ({ councilName: null, boundary: null })),
      fetch(`/api/hda?address=${encodeURIComponent(address)}&lat=${lat}&lng=${lng}`).then(r => r.json()).catch(() => ({ projects: [] })),
      Promise.resolve(null), // connectivity disabled for now
      fetch(`/api/perception?suburb=${encodeURIComponent(address)}&lat=${lat}&lng=${lng}`).then(r => r.json()).catch(() => null),
      fetch(`/api/da?lat=${lat}&lng=${lng}`).then(r => r.json()).catch(() => ({ applications: [] })),
      fetch(`/api/cdc?lat=${lat}&lng=${lng}`).then(r => r.json()).catch(() => ({ certificates: [] })),
      fetch(`/api/cc?lat=${lat}&lng=${lng}`).then(r => r.json()).catch(() => ({ certificates: [] })),
    ]);

    setLgaBoundary(lga?.boundary || undefined);

    let poly: [number, number][] | undefined;
    if (cadastre?.features?.[0]?.geometry?.rings?.[0]) {
      const ring = cadastre.features[0].geometry.rings[0] as number[][];
      poly = ring.map(([lng, lat]: number[]) => [lat, lng] as [number, number]);
    }
    setLotPolygon(poly);

    const zoningResult = (planning?.results || []).find((r: any) => r.layerName === "Land Zoning");
    const zone = zoningResult?.attributes?.SYM_CODE || "";
    setZoneCode(zone);

    // Process map markers
    const hdaProjects = hda?.projects || [];
    handleHDAProjects(hdaProjects);
    if ((connectivity as any)?.summary) {
      const allAmenities = Object.values((connectivity as any).summary).flat() as { type: string; name: string; distance: number; lat: number; lng: number }[];
      handleAmenities(allAmenities.filter((a: any) => a.lat && a.lng));
    }
    handleDAResults(daData?.results || []);
    handleCDCResults(cdcData?.results || []);
    handleCCResults(ccData?.results || []);

    setData({
      address, planning, hazard, cadastre,
      councilName: lga?.councilName || "",
      hda: hdaProjects,
      connectivity,
      perception,
      da: daData,
      cdc: cdcData,
      cc: ccData,
    });
    setLoading(false);

    // Save curated snapshot to Supabase (fire-and-forget)
    const snapshot = buildPropertySnapshot(address, lat, lng, {
      planning, hazard, cadastre,
      councilName: lga?.councilName || "",
      perception,
      da: daData,
      cdc: cdcData,
      cc: ccData,
      hda: hdaProjects,
    });
    fetch("/api/searches", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(snapshot),
    }).catch(() => {}); // silent fail — non-critical

    const entry: SearchHistoryEntry = { address, lat, lng, zone, timestamp: Date.now() };
    saveSearchHistory(entry);
    setSearchHistory(getSearchHistory());
  }

  function handleSelect(r: { display_name: string; lat: string; lon: string }) {
    const lat = parseFloat(r.lat);
    const lng = parseFloat(r.lon);
    // Update URL and fetch
    router.replace(`/address?lat=${lat}&lng=${lng}&q=${encodeURIComponent(r.display_name)}`, { scroll: false });
    fetchData(r.display_name, lat, lng);
  }

  function handleHistoryClick(entry: SearchHistoryEntry) {
    router.replace(`/address?lat=${entry.lat}&lng=${entry.lng}&q=${encodeURIComponent(entry.address)}`, { scroll: false });
    fetchData(entry.address, entry.lat, entry.lng);
  }

  const streetViewUrl = coords
    ? `https://www.google.com/maps/@${coords.lat},${coords.lng},3a,75y,0h,90t/data=!3m6!1e1!3m4!1s!2e0!7i16384!8i8192`
    : null;

  return (
    <main className="min-h-screen">
      {/* History Sidebar */}
      <HistorySidebar open={showHistory} onClose={() => setShowHistory(false)} onSelect={(entry) => { handleHistoryClick({ address: entry.address, lat: entry.lat, lng: entry.lng, zone: "", timestamp: 0 }); }} />

      {/* Compact top bar with search */}
      <div className="sticky top-0 z-40 backdrop-blur-xl border-b" style={{ background: "var(--bg-elevated)", borderColor: "var(--border)" }}>
        <div className="max-w-[1600px] mx-auto px-4 py-3 flex items-center justify-center gap-4">
          <button onClick={() => setShowHistory(true)} className="p-2 rounded-lg transition hover:scale-110 shrink-0" style={{ color: "var(--text-muted)" }} title="Search History">
            <History size={18} />
          </button>
          <Link href="/" className="font-semibold text-sm shrink-0 transition" style={{ color: "var(--accent)" }}>
            Landlytic
          </Link>
          <div className="flex-1 max-w-2xl">
            <SearchBar compact onSelect={handleSelect} searchHistory={searchHistory} onHistoryClick={handleHistoryClick} />
          </div>

          <ThemeToggle />
        </div>
      </div>

      <div className="px-4 py-6">
      {loading && <LoadingIndicator />}

      {data && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="max-w-[1600px] mx-auto">
          {/* Address heading */}
          <div className="mb-4 pb-2 border-b" style={{ borderColor: "var(--border)" }}>
            <p className="text-xs opacity-60" style={{ color: "var(--text-primary)" }}>{data.address}</p>
          </div>

          {/* AI Summary */}
          <section id="summary">
            <AISummaryCard address={data.address} siteData={data} />
          </section>

          {/* Site details strip */}
          <section id="land" className="mt-4">
            <LandInfoCard data={data} />
          </section>

          {coords && (
            <div className="mt-6 flex flex-col xl:flex-row gap-6">
              {/* Left column: cards */}
              <div className="flex-1 min-w-0 space-y-4">
                {/* Perception */}
                <section id="context">
                  <PerceptionCard address={data.address} lat={coords?.lat} lng={coords?.lng} initialData={data.perception} />
                </section>

                {/* HDA */}
                <HDACard address={data.address} lat={coords.lat} lng={coords.lng} onProjects={handleHDAProjects} onItemClick={handleItemClick} initialData={data.hda} />

                {/* DA + CDC tabbed */}
                <section id="activity">
                  <NearbyActivityCard lat={coords.lat} lng={coords.lng} onDAs={handleDAResults} onCDCs={handleCDCResults} onCCs={handleCCResults} onItemClick={handleItemClick} initialDA={data.da} initialCDC={data.cdc} initialCC={data.cc} />
                </section>

                {/* SSDA Major Projects */}
                {data.councilName && (
                  <section id="ssda">
                    <SSDACard lga={data.councilName} onProjects={handleSSDAProjects} />
                  </section>
                )}
              </div>

              {/* Right column: sticky map */}
              <div className="xl:w-[480px] shrink-0" id="map">
                <div className="xl:sticky xl:top-20">
                  <PlanningMap lat={coords.lat} lng={coords.lng} markers={[...hdaMarkers, ...daMarkers, ...cdcMarkers, ...ccMarkers, ...amenityMarkers, ...ssdaMarkers]} polygon={lotPolygon} lgaBoundary={lgaBoundary} zoneCode={zoneCode} streetViewUrl={streetViewUrl || undefined} focusPoint={focusPoint} />
                </div>
              </div>
            </div>
          )}
        </motion.div>
      )}

      {/* Planning Guide Button */}
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.4 }} className="flex justify-center mt-12">
        <button onClick={() => setShowGuide(true)} className="flex items-center gap-2 px-6 py-3 rounded-xl transition-all duration-200" style={{ background: "var(--accent-subtle)", border: "1px solid var(--accent-border)", color: "var(--accent)" }}>
          <BookOpen size={18} />
          <span className="font-medium">What do these planning terms mean?</span>
        </button>
      </motion.div>
      </div>

      {/* Planning Guide Modal */}
      <AnimatePresence>
        {showGuide && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 flex items-start justify-center backdrop-blur-sm overflow-y-auto py-8 px-4" style={{ background: "var(--bg-overlay)" }} onClick={(e) => e.target === e.currentTarget && setShowGuide(false)}>
            <motion.div initial={{ opacity: 0, y: 40, scale: 0.95 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 40, scale: 0.95 }} transition={{ type: "spring", damping: 25, stiffness: 300 }} className="w-full max-w-3xl">
              <div className="glass-card !p-6 md:!p-8">
                <div className="flex items-center justify-between mb-6">
                  <div>
                    <h2 className="text-2xl font-bold" style={{ color: "var(--text-primary)" }}>Planning Terms Explained</h2>
                    <p className="text-sm mt-1" style={{ color: "var(--text-muted)" }}>Everything you need to understand your planning report</p>
                  </div>
                  <button onClick={() => setShowGuide(false)} className="p-2 rounded-lg transition" style={{ color: "var(--text-muted)" }}>
                    <X size={20} />
                  </button>
                </div>

                <div className="space-y-6">
                  {glossary.map((item, i) => (
                    <motion.div key={item.term} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }} className="p-4 rounded-xl transition-colors" style={{ background: "var(--bg-sunken)", border: "1px solid var(--border)" }}>
                      <div className="flex items-center gap-3 mb-2">
                        {item.icon}
                        <h3 className="text-lg font-semibold" style={{ color: "var(--text-primary)" }}>{item.term}</h3>
                      </div>
                      <p className="text-sm font-medium mb-2" style={{ color: "var(--accent)" }}>{item.short}</p>
                      <p className="text-sm leading-relaxed mb-3" style={{ color: "var(--text-secondary)" }}>{item.detail}</p>
                      <div className="px-3 py-2 rounded-lg" style={{ background: "var(--accent-subtle)", border: "1px solid var(--accent-border)" }}>
                        <p className="text-xs" style={{ color: "var(--text-muted)" }}>
                          <span className="font-medium" style={{ color: "var(--accent)" }}>Example: </span>
                          {item.example}
                        </p>
                      </div>
                    </motion.div>
                  ))}
                </div>

                <div className="mt-6 p-4 rounded-xl" style={{ background: "var(--accent-subtle)", border: "1px solid var(--accent-border)" }}>
                  <p className="text-xs leading-relaxed" style={{ color: "var(--text-muted)" }}>
                    <span className="font-medium" style={{ color: "var(--accent)" }}>Disclaimer: </span>
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

