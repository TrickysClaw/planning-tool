"use client";
import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Building2, ChevronDown, ChevronUp } from "lucide-react";

interface HDAProject {
  eoi_number: string;
  briefing_date: string;
  address: string;
  suburb: string;
  type: string;
  dwellings: number | null;
  recommendation: string;
}

const TYPE_COLORS: Record<string, string> = {
  Residential: "bg-blue-500/20 text-blue-300",
  "Mixed-use": "bg-purple-500/20 text-purple-300",
  "Build-to-Rent": "bg-cyan-500/20 text-cyan-300",
  Commercial: "bg-amber-500/20 text-amber-300",
};

const REC_COLORS: Record<string, string> = {
  "Declare SSD": "bg-emerald-500/20 text-emerald-300",
  "Not Declare": "bg-red-500/20 text-red-300",
  Deferred: "bg-yellow-500/20 text-yellow-300",
};

export default function HDACard({ address }: { address: string }) {
  const [projects, setProjects] = useState<HDAProject[]>([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState(false);

  useEffect(() => {
    if (!address) return;
    setLoading(true);
    fetch(`/api/hda?address=${encodeURIComponent(address)}`)
      .then((r) => r.json())
      .then((d) => {
        setProjects(d.projects || []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [address]);

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
      <div className="flex items-center gap-2 mb-4">
        <Building2 className="text-emerald-400" size={20} />
        <h3 className="font-semibold text-white text-lg">Nearby Housing Projects (HDA)</h3>
        {projects.length > 0 && (
          <span className="ml-auto text-xs text-slate-400">{projects.length} found</span>
        )}
      </div>

      {projects.length === 0 ? (
        <p className="text-sm text-slate-400">No HDA projects found near this address</p>
      ) : (
        <div className="space-y-2">
          {visible.map((p) => (
            <div
              key={p.eoi_number}
              className="flex flex-wrap items-center gap-2 p-2 rounded-lg bg-white/[0.02] border border-white/[0.05] text-sm"
            >
              <span className="text-xs text-slate-500 w-16 flex-shrink-0">{p.eoi_number}</span>
              <span className="text-slate-300 truncate flex-1 min-w-0" title={p.address}>
                {p.address.length > 50 ? p.address.slice(0, 50) + "…" : p.address}
              </span>
              <span className={`px-2 py-0.5 rounded text-xs ${TYPE_COLORS[p.type] || "bg-slate-500/20 text-slate-300"}`}>
                {p.type || "Unknown"}
              </span>
              {p.dwellings != null && (
                <span className="text-xs text-slate-400">{p.dwellings} dwl</span>
              )}
              <span className={`px-2 py-0.5 rounded text-xs ${REC_COLORS[p.recommendation] || "bg-slate-500/20 text-slate-300"}`}>
                {p.recommendation || "—"}
              </span>
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
