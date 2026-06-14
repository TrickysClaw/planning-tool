"use client";
import { useState, useEffect, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { motion } from "framer-motion";
import Link from "next/link";
import { ArrowLeftRight, Construction, SlidersHorizontal, Loader2 } from "lucide-react";
import ThemeToggle from "../components/ThemeToggle";
import SearchBar from "../components/SearchBar";
import LandInfoCard from "../components/LandInfoCard";
import PerceptionCard from "../components/PerceptionCard";
import HDACard from "../components/HDACard";
import NearbyActivityCard from "../components/NearbyActivityCard";
import CompareSlider from "../components/CompareSlider";
import CompareInsightsCard from "../components/CompareInsightsCard";
import { usePropertyData } from "@/lib/usePropertyData";

/* eslint-disable @typescript-eslint/no-explicit-any */

export default function ComparePageWrapper() {
  return (
    <Suspense fallback={
      <main className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-t-transparent rounded-full animate-spin mx-auto mb-3" style={{ borderColor: "var(--accent)", borderTopColor: "transparent" }} />
          <p className="text-sm" style={{ color: "var(--text-muted)" }}>Loading...</p>
        </div>
      </main>
    }>
      <ComparePage />
    </Suspense>
  );
}

function ComparePage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const propA = usePropertyData();
  const propB = usePropertyData();
  const [mobileView, setMobileView] = useState<"slider" | "a" | "b" | "compare">("slider");

  // Load from URL params
  useEffect(() => {
    const latA = searchParams.get("latA");
    const lngA = searchParams.get("lngA");
    const qA = searchParams.get("qA");
    const latB = searchParams.get("latB");
    const lngB = searchParams.get("lngB");
    const qB = searchParams.get("qB");

    if (latA && lngA && qA) {
      propA.fetchData(decodeURIComponent(qA), parseFloat(latA), parseFloat(lngA));
    }
    if (latB && lngB && qB) {
      propB.fetchData(decodeURIComponent(qB), parseFloat(latB), parseFloat(lngB));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function handleSelectA(r: { display_name: string; lat: string; lon: string }) {
    const lat = parseFloat(r.lat);
    const lng = parseFloat(r.lon);
    propA.fetchData(r.display_name, lat, lng);
    updateURL(r.display_name, lat, lng, "A");
  }

  function handleSelectB(r: { display_name: string; lat: string; lon: string }) {
    const lat = parseFloat(r.lat);
    const lng = parseFloat(r.lon);
    propB.fetchData(r.display_name, lat, lng);
    updateURL(r.display_name, lat, lng, "B");
  }

  function updateURL(address: string, lat: number, lng: number, side: "A" | "B") {
    const params = new URLSearchParams(searchParams.toString());
    params.set(`lat${side}`, lat.toString());
    params.set(`lng${side}`, lng.toString());
    params.set(`q${side}`, address);
    router.replace(`/compare?${params.toString()}`, { scroll: false });
  }

  function handleSwap() {
    const latA = searchParams.get("latA");
    const lngA = searchParams.get("lngA");
    const qA = searchParams.get("qA");
    const latB = searchParams.get("latB");
    const lngB = searchParams.get("lngB");
    const qB = searchParams.get("qB");
    if (latA && lngA && qA && latB && lngB && qB) {
      router.replace(`/compare?latA=${latB}&lngA=${lngB}&qA=${encodeURIComponent(qB)}&latB=${latA}&lngB=${lngA}&qB=${encodeURIComponent(qA)}`, { scroll: false });
      propA.fetchData(decodeURIComponent(qB), parseFloat(latB), parseFloat(lngB));
      propB.fetchData(decodeURIComponent(qA), parseFloat(latA), parseFloat(lngA));
    }
  }

  const bothLoaded = propA.data && propB.data;
  const eitherLoading = propA.loading || propB.loading;

  return (
    <main className="min-h-screen">
      {/* Top bar */}
      <div className="sticky top-0 z-40 backdrop-blur-xl border-b" style={{ background: "var(--bg-elevated)", borderColor: "var(--border)" }}>
        <div className="max-w-[1600px] mx-auto px-4 py-3">
          <div className="flex items-center justify-between gap-3">
            <Link href="/" className="font-semibold text-sm shrink-0 transition" style={{ color: "var(--accent)" }}>
              PlanView
            </Link>

            {/* Two search bars with vs divider */}
            <div className="flex-1 flex items-center gap-2 max-w-4xl">
              <div className="flex-1 min-w-0">
                <SearchBar compact onSelect={handleSelectA} placeholder="Property A..." />
              </div>
              <button
                onClick={handleSwap}
                className="p-1.5 rounded-lg transition hover:scale-110 shrink-0"
                style={{ color: "var(--text-muted)", background: "var(--bg-sunken)", border: "1px solid var(--border)" }}
                title="Swap properties"
              >
                <ArrowLeftRight size={14} />
              </button>
              <div className="flex-1 min-w-0">
                <SearchBar compact onSelect={handleSelectB} placeholder="Property B..." />
              </div>
            </div>

            <div className="flex items-center gap-1.5 shrink-0">
              <Link href="/search" className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm transition" style={{ color: "var(--text-muted)" }}>
                <SlidersHorizontal size={14} />
              </Link>
              <Link href="/ssda" className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm transition" style={{ color: "var(--text-muted)" }}>
                <Construction size={14} />
              </Link>
              <ThemeToggle />
            </div>
          </div>
        </div>
      </div>

      <div className="px-4 py-6">
        <div className="max-w-[1600px] mx-auto">
          {/* Empty state */}
          {!propA.data && !propB.data && !eitherLoading && (
            <div className="text-center py-24">
              <ArrowLeftRight size={48} className="mx-auto mb-4 opacity-20" style={{ color: "var(--text-muted)" }} />
              <h2 className="text-xl font-semibold mb-2" style={{ color: "var(--text-primary)" }}>Compare Properties</h2>
              <p className="text-sm" style={{ color: "var(--text-muted)" }}>
                Search for two NSW properties above to compare them side by side
              </p>
            </div>
          )}

          {/* Loading */}
          {eitherLoading && (
            <div className="flex items-center justify-center py-24 gap-3">
              <Loader2 size={20} className="animate-spin" style={{ color: "var(--accent)" }} />
              <p className="text-sm" style={{ color: "var(--text-muted)" }}>
                {propA.loading && propB.loading ? "Loading both properties..." : propA.loading ? "Loading Property A..." : "Loading Property B..."}
              </p>
            </div>
          )}

          {/* Compare view */}
          {bothLoaded && !eitherLoading && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
              {/* Mobile toggle */}
              <div className="flex md:hidden items-center justify-center gap-1 mb-4 p-1 rounded-xl" style={{ background: "var(--bg-sunken)", border: "1px solid var(--border)" }}>
                {(["a", "slider", "b", "compare"] as const).map((view) => (
                  <button
                    key={view}
                    onClick={() => setMobileView(view)}
                    className="px-3 py-1.5 rounded-lg text-xs font-medium transition"
                    style={{
                      background: mobileView === view ? "var(--accent-subtle)" : "transparent",
                      color: mobileView === view ? "var(--accent)" : "var(--text-muted)",
                    }}
                  >
                    {view === "a" ? "Prop A" : view === "b" ? "Prop B" : view === "slider" ? "Slider" : "AI Compare"}
                  </button>
                ))}
              </div>

              {/* Slider view (desktop always, mobile conditional) */}
              <div className={mobileView === "a" || mobileView === "b" ? "hidden md:block" : mobileView === "compare" ? "hidden md:block" : ""}>
                <CompareSlider
                  leftLabel={propA.data!.address.split(",")[0]}
                  rightLabel={propB.data!.address.split(",")[0]}
                  leftContent={
                    <PropertyPanel data={propA.data!} coords={propA.coords!} />
                  }
                  rightContent={
                    <PropertyPanel data={propB.data!} coords={propB.coords!} />
                  }
                />
              </div>

              {/* Mobile single property view */}
              {mobileView === "a" && (
                <div className="md:hidden border-l-4" style={{ borderColor: "#3B82F6" }}>
                  <PropertyPanel data={propA.data!} coords={propA.coords!} />
                </div>
              )}
              {mobileView === "b" && (
                <div className="md:hidden border-l-4" style={{ borderColor: "#F59E0B" }}>
                  <PropertyPanel data={propB.data!} coords={propB.coords!} />
                </div>
              )}

              {/* Comparative AI Insights */}
              <div className={`mt-6 ${mobileView !== "compare" ? "hidden md:block" : ""}`}>
                <CompareInsightsCard
                  addressA={propA.data!.address}
                  addressB={propB.data!.address}
                  siteDataA={propA.data!}
                  siteDataB={propB.data!}
                />
              </div>
            </motion.div>
          )}
        </div>
      </div>
    </main>
  );
}

/** Renders the core property info cards (no map, no AI) */
function PropertyPanel({ data, coords }: { data: any; coords: { lat: number; lng: number } }) {
  return (
    <div className="p-4 space-y-4">
      {/* Address header */}
      <div className="mb-2">
        <h3 className="text-sm font-semibold truncate" style={{ color: "var(--text-primary)" }}>
          {data.address.split(",")[0]}
        </h3>
        <p className="text-xs truncate" style={{ color: "var(--text-muted)" }}>
          {data.address.split(",").slice(1).join(",").trim()}
        </p>
      </div>

      <LandInfoCard data={data} />

      <PerceptionCard address={data.address} lat={coords.lat} lng={coords.lng} initialData={data.perception} />

      <HDACard address={data.address} lat={coords.lat} lng={coords.lng} initialData={data.hda} />

      <NearbyActivityCard lat={coords.lat} lng={coords.lng} initialDA={data.da} initialCDC={data.cdc} initialCC={data.cc} />
    </div>
  );
}
