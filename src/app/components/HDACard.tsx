"use client";
import { useState, useEffect } from "react";
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
}

const TYPE_COLORS: Record<string, string> = {
  Residential: "bg-blue-500/20 text-blue-300",
  "Mixed-use": "bg-purple-500/20 text-purple-300",
  "Build-to-Rent": "bg-cyan-500/20 text-cyan-300",
  Commercial: "bg-amber-500/20 text-amber-300",
  Subdivision: "bg-orange-500/20 text-orange-300",
  "Seniors housing": "bg-pink-500/20 text-pink-300",
};

const REC_COLORS: Record<string, string> = {
  "Declare SSD": "bg-emerald-500/20 text-emerald-300",
  "Not Declare": "bg-red-500/20 text-red-300",
  Deferred: "bg-yellow-500/20 text-yellow-300",
  "Existing SSD pathway": "bg-blue-500/20 text-blue-300",
  Withdrawn: "bg-slate-500/20 text-slate-300",
};

function recColor(rec: string): string {
  for (const [key, val] of Object.entries(REC_COLORS)) {
    if (rec.includes(key)) return val;
  }
  return "bg-slate-500/20 text-slate-300";
}

export default function HDACard({
  address,
  lat,
  lng,
  onProjects,
}: {
  address: string;
  lat?: number;
  lng?: number;
  onProjects?: (projects: HDAProject[]) => void;
}) {
  const [projects, setProjects] = useState<HDAProject[]>([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState(false);

  useEffect(() => {
    if (!address) return;
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
  }, [address, lat, lng, onProjects]);

  if (loading) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5 }}
        className="glass-card col-span-1 md:col-span-2"
      >
        <div className="flex items-center gap-2 mb-3">
          <Building2 className="text-emerald-400" size={20} />
          <h3 className="font-semibold text-white text-lg">Nearby Housing Projects (HDA)</h3>
        </div>
        <div className="flex items-center gap-2 text-slate-400 text-sm">
          <div className="w-4 h-4 border-2 border-emerald-400 border-t-transparent rounded-full animate-spin" />
          Searching HDA projects...
        </div>
      </motion.div>
    );
  }

  const visible = expanded ? projects : projects.slice(0, 3);
  const remaining = projects.length - 3;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.5 }}
      className="glass-card col-span-1 md:col-span-2"
    >
      <div className="flex items-center gap-2 mb-2">
        <Building2 className="text-emerald-400" size={20} />
        <h3 className="font-semibold text-white text-lg">Nearby Housing Projects (HDA)</h3>
        {projects.length > 0 && (
          <span className="ml-auto text-xs text-slate-400">{projects.length} found</span>
        )}
      </div>
      <p className="text-xs text-slate-500 mb-4">
        Housing Delivery Authority EOIs — proposals reviewed for State Significant Development fast-tracking
      </p>

      {projects.length === 0 ? (
        <p className="text-sm text-slate-400">No HDA projects found near this address</p>
      ) : (
        <div className="space-y-3">
          {visible.map((p) => (
            <div
              key={p.eoi_number}
              className="p-3 rounded-lg bg-white/[0.02] border border-white/[0.05]"
            >
              <div className="flex flex-wrap items-start gap-2 mb-1.5">
                <span className="text-xs text-slate-500 font-mono">EOI {p.eoi_number}</span>
                <span className={`px-2 py-0.5 rounded text-xs ${TYPE_COLORS[p.type] || "bg-slate-500/20 text-slate-300"}`}>
                  {p.type || "Unknown"}
                </span>
                {p.dwellings != null && (
                  <span className="text-xs text-slate-400">🏠 {p.dwellings.toLocaleString()} dwellings</span>
                )}
                <span className={`px-2 py-0.5 rounded text-xs ${recColor(p.recommendation)}`}>
                  {p.recommendation || "—"}
                </span>
              </div>

              <div className="flex items-start gap-1.5 mb-1.5">
                <MapPin size={12} className="text-slate-500 mt-0.5 flex-shrink-0" />
                <span className="text-sm text-slate-300">{p.address}</span>
              </div>

              {p.description && (
                <p className="text-xs text-slate-400 mb-2 leading-relaxed">{p.description}</p>
              )}

              <div className="flex items-center gap-3 text-xs">
                <span className="text-slate-500">Briefed: {p.briefing_date}</span>
                {p.briefingUrl && (
                  <a
                    href={p.briefingUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1 text-emerald-400 hover:text-emerald-300 transition"
                  >
                    <ExternalLink size={10} />
                    View HDA Record
                  </a>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {remaining > 0 && (
        <button
          onClick={() => setExpanded(!expanded)}
          className="mt-3 flex items-center gap-1 text-xs text-emerald-400 hover:text-emerald-300 transition"
        >
          {expanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
          {expanded ? "Show less" : `Show ${remaining} more`}
        </button>
      )}
    </motion.div>
  );
}
