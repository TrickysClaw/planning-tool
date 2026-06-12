"use client";
import { useState, useEffect, useMemo } from "react";
import { motion } from "framer-motion";
import { Building2, ChevronDown, ChevronUp, ExternalLink, MapPin } from "lucide-react";

interface HDAProject {
  eoi_number: string;
  briefing_date: string;
  address: string;
  suburb: string;
  type: string;
  dwellings: number | null;
  recommendation: string;
  description?: string;
  briefingUrl?: string;
  coords?: { lat: number; lng: number } | null;
  distance?: number;
}

const TYPE_COLORS: Record<string, { bg: string; text: string }> = {
  Residential: { bg: "rgba(59, 130, 246, 0.12)", text: "#2563EB" },
  "Mixed-use": { bg: "rgba(139, 92, 246, 0.12)", text: "#7C3AED" },
  "Build-to-Rent": { bg: "rgba(6, 182, 212, 0.12)", text: "#0891B2" },
  Commercial: { bg: "rgba(217, 119, 6, 0.12)", text: "#B45309" },
  Subdivision: { bg: "rgba(234, 88, 12, 0.12)", text: "#C2410C" },
  "Seniors housing": { bg: "rgba(219, 39, 119, 0.12)", text: "#BE185D" },
};

const REC_COLORS: Record<string, { bg: string; text: string }> = {
  "Declare SSD": { bg: "var(--success-bg)", text: "var(--success)" },
  "Not Declare": { bg: "var(--danger-bg)", text: "var(--danger)" },
  Deferred: { bg: "var(--warning-bg)", text: "var(--warning)" },
  "Existing SSD pathway": { bg: "var(--info-bg)", text: "var(--info)" },
  Withdrawn: { bg: "rgba(100, 116, 139, 0.1)", text: "#64748B" },
};

const REC_LABELS: Record<string, string> = {
  "Declare SSD": "✅ Approved for fast-track",
  "Not Declare": "❌ Rejected — goes back to council",
  Deferred: "⏳ Decision pending",
  "Existing SSD pathway": "🔄 Already in the system",
  Withdrawn: "🚫 Pulled out",
};

function recColor(rec: string): { bg: string; text: string } {
  for (const [key, val] of Object.entries(REC_COLORS)) {
    if (rec.includes(key)) return val;
  }
  return { bg: "rgba(100, 116, 139, 0.1)", text: "#64748B" };
}

export default function HDACard({
  address,
  lat,
  lng,
  onProjects,
  onItemClick,
  initialData,
}: {
  address: string;
  lat?: number;
  lng?: number;
  onProjects?: (projects: HDAProject[]) => void;
  onItemClick?: (item: { lat: number; lng: number }) => void;
  initialData?: any[];
}) {
  const [projects, setProjects] = useState<HDAProject[]>(initialData || []);
  const [loading, setLoading] = useState(!initialData);
  const [expanded, setExpanded] = useState(false);
  const [typeFilter, setTypeFilter] = useState("All");
  const [recFilter, setRecFilter] = useState("All");
  const [sortBy, setSortBy] = useState<"distance" | "dwellings" | "date">("distance");

  useEffect(() => {
    if (initialData || !address) return; // Skip fetch if data was pre-loaded
    setLoading(true);
    let url = `/api/hda?address=${encodeURIComponent(address)}`;
    if (lat && lng) url += `&lat=${lat}&lng=${lng}`;
    fetch(url)
      .then((r) => r.json())
      .then((d) => {
        const p = d.projects || [];
        setProjects(p);
        onProjects?.(p);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [address, lat, lng, onProjects, initialData]);

  const types = useMemo(() => ["All", ...Array.from(new Set(projects.map((p) => p.type).filter(Boolean)))], [projects]);
  const recs = useMemo(() => ["All", ...Array.from(new Set(projects.map((p) => p.recommendation).filter(Boolean)))], [projects]);

  const filtered = useMemo(() => {
    let result = projects;
    if (typeFilter !== "All") result = result.filter((p) => p.type === typeFilter);
    if (recFilter !== "All") result = result.filter((p) => p.recommendation === recFilter);
    result = [...result].sort((a, b) => {
      switch (sortBy) {
        case "dwellings": return (b.dwellings || 0) - (a.dwellings || 0);
        case "date": return new Date(b.briefing_date || 0).getTime() - new Date(a.briefing_date || 0).getTime();
        default: return (a.distance || 0) - (b.distance || 0);
      }
    });
    return result;
  }, [projects, typeFilter, recFilter, sortBy]);

  const visible = expanded ? filtered : filtered.slice(0, 3);
  const remaining = filtered.length - 3;

  if (loading) {
    return (
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 }}
        className="glass-card">
        <div className="flex items-center gap-2 mb-3">
          <Building2 size={20} style={{ color: "var(--accent)" }} />
          <h3 className="font-semibold text-lg" style={{ color: "var(--text-primary)" }}>Big Housing Projects Nearby</h3>
        </div>
        <div className="flex items-center gap-2 text-sm" style={{ color: "var(--text-muted)" }}>
          <div className="w-4 h-4 border-2 border-t-transparent rounded-full animate-spin" style={{ borderColor: "var(--accent)", borderTopColor: "transparent" }} />
          Checking for major developments nearby...
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 }}
      className="glass-card">
      <div className="flex items-center gap-2 mb-2">
        <Building2 size={20} style={{ color: "var(--accent)" }} />
        <h3 className="font-semibold text-lg" style={{ color: "var(--text-primary)" }}>Big Housing Projects Nearby</h3>
        {projects.length > 0 && (
          <span className="ml-auto text-xs" style={{ color: "var(--text-muted)" }}>{projects.length} found</span>
        )}
      </div>
      <p className="text-xs mb-4" style={{ color: "var(--text-muted)" }}>
        Large housing developments proposed near you — these skip council and get fast-tracked by the NSW government.
      </p>

      {projects.length === 0 ? (
        <p className="text-sm" style={{ color: "var(--text-muted)" }}>No HDA projects found near this address</p>
      ) : (
        <>
          <div className="flex flex-wrap gap-2 mb-4">
            <select value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)} className="form-select">
              {types.map((t) => <option key={t} value={t}>{t === "All" ? "All Types" : t}</option>)}
            </select>
            <select value={recFilter} onChange={(e) => setRecFilter(e.target.value)} className="form-select">
              {recs.map((r) => <option key={r} value={r}>{r === "All" ? "All Recommendations" : r}</option>)}
            </select>
            <select value={sortBy} onChange={(e) => setSortBy(e.target.value as any)} className="form-select">
              <option value="distance">Sort: Nearest</option>
              <option value="date">Sort: Most Recent</option>
              <option value="dwellings">Sort: Most Dwellings</option>
            </select>
            {(typeFilter !== "All" || recFilter !== "All") && (
              <span className="text-xs self-center" style={{ color: "var(--text-muted)" }}>{filtered.length} of {projects.length}</span>
            )}
          </div>
          <div className="space-y-3">
          {visible.map((p) => (
            <div key={p.eoi_number} className="clickable-item"
              onClick={() => p.coords?.lat && p.coords?.lng && onItemClick?.({ lat: p.coords.lat, lng: p.coords.lng })}
            >              <div className="flex flex-wrap items-start gap-2 mb-1.5">
                <span className="text-xs font-mono" style={{ color: "var(--text-muted)" }}>EOI {p.eoi_number}</span>
                <span className="px-2 py-0.5 rounded text-xs font-medium" style={{ background: (TYPE_COLORS[p.type] || { bg: "rgba(100,116,139,0.1)", text: "#64748B" }).bg, color: (TYPE_COLORS[p.type] || { bg: "rgba(100,116,139,0.1)", text: "#64748B" }).text }}>
                  {p.type || "Unknown"}
                </span>
                {p.dwellings != null && (
                  <span className="text-xs" style={{ color: "var(--text-muted)" }}>🏠 {p.dwellings.toLocaleString()} dwellings</span>
                )}
                <span className="px-2 py-0.5 rounded text-xs font-medium" style={{ background: recColor(p.recommendation).bg, color: recColor(p.recommendation).text }}>
                  {Object.entries(REC_LABELS).find(([k]) => p.recommendation?.includes(k))?.[1] || p.recommendation || "—"}
                </span>
              </div>

              <div className="flex items-start gap-1.5 mb-1.5">
                <MapPin size={12} style={{ color: "var(--text-muted)" }} className="mt-0.5 flex-shrink-0" />
                <span className="text-sm" style={{ color: "var(--text-secondary)" }}>{p.address}</span>
              </div>

              {p.description && (
                <p className="text-xs mb-2 leading-relaxed" style={{ color: "var(--text-muted)" }}>{p.description}</p>
              )}

              <div className="flex items-center gap-3 text-xs">
                <span style={{ color: "var(--text-muted)" }}>Briefed: {p.briefing_date}</span>
                {p.briefingUrl && (
                  <a href={p.briefingUrl} target="_blank" rel="noopener noreferrer" className="link-external">
                    <ExternalLink size={10} />
                    View HDA Record
                  </a>
                )}
              </div>
            </div>
          ))}
          </div>

          {remaining > 0 && (
            <button onClick={() => setExpanded(!expanded)} className="btn-text mt-3">
              {expanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
              {expanded ? "Show less" : `Show ${remaining} more`}
            </button>
          )}
        </>
      )}
    </motion.div>
  );
}
