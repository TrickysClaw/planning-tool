"use client";
import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Building2, ChevronDown, ChevronUp, ExternalLink, MapPin } from "lucide-react";

interface SSDAProject {
  caseId: string;
  status: string;
  assessmentType: string;
  lga: string;
  title: string;
  address: string;
  detailUrl: string;
  coords?: { lat: number; lng: number } | null;
}

const STATUS_COLORS: Record<string, string> = {
  Exhibition: "bg-red-500/20 text-red-300",
  Assessment: "bg-blue-500/20 text-blue-300",
  "Response to Submissions": "bg-blue-500/20 text-blue-300",
  Determination: "bg-emerald-500/20 text-emerald-300",
  "Prepare EIS": "bg-amber-500/20 text-amber-300",
};

function statusColor(status: string): string {
  for (const [key, val] of Object.entries(STATUS_COLORS)) {
    if (status.includes(key)) return val;
  }
  return "bg-slate-500/20 text-slate-300";
}

// Priority order for sorting
function statusPriority(status: string): number {
  if (status.includes("Exhibition")) return 0;
  if (status.includes("Assessment")) return 1;
  if (status.includes("Response")) return 2;
  if (status.includes("Prepare")) return 3;
  if (status.includes("Determination")) return 4;
  return 5;
}

export default function SSDACard({
  lga,
  onProjects,
}: {
  lga: string;
  onProjects?: (projects: SSDAProject[]) => void;
}) {
  const [projects, setProjects] = useState<SSDAProject[]>([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState(false);

  useEffect(() => {
    if (!lga) { setLoading(false); return; }
    setLoading(true);
    fetch(`/api/ssda?lga=${encodeURIComponent(lga)}`)
      .then((r) => r.json())
      .then(async (d) => {
        const raw: SSDAProject[] = d.projects || [];
        // Sort by status priority
        raw.sort((a, b) => statusPriority(a.status) - statusPriority(b.status));
        setProjects(raw);
        onProjects?.(raw);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [lga, onProjects]);

  if (loading) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.6 }}
        className="glass-card col-span-1 md:col-span-2"
      >
        <div className="flex items-center gap-2 mb-3">
          <Building2 className="text-blue-400" size={20} />
          <h3 className="font-semibold text-white text-lg">🏗️ State Significant Developments</h3>
        </div>
        <div className="flex items-center gap-2 text-slate-400 text-sm">
          <div className="w-4 h-4 border-2 border-blue-400 border-t-transparent rounded-full animate-spin" />
          Searching major projects in {lga}...
        </div>
      </motion.div>
    );
  }

  const maxVisible = 10;
  const visible = expanded ? projects : projects.slice(0, maxVisible);
  const remaining = projects.length - maxVisible;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.6 }}
      className="glass-card col-span-1 md:col-span-2"
    >
      <div className="flex items-center gap-2 mb-2">
        <Building2 className="text-blue-400" size={20} />
        <h3 className="font-semibold text-white text-lg">🏗️ State Significant Developments</h3>
        {projects.length > 0 && (
          <span className="ml-auto text-xs text-slate-400">{projects.length} found</span>
        )}
      </div>
      <p className="text-xs text-slate-500 mb-4">
        Major projects in {lga}
      </p>

      {projects.length === 0 ? (
        <p className="text-sm text-slate-400">No major projects found in {lga}</p>
      ) : (
        <div className="space-y-3">
          {visible.map((p) => (
            <div
              key={p.caseId || p.title}
              className="p-3 rounded-lg bg-white/[0.02] border border-white/[0.05]"
            >
              <div className="flex flex-wrap items-start gap-2 mb-1.5">
                <span className="text-xs text-slate-500 font-mono font-bold">{p.caseId}</span>
                <span className={`px-2 py-0.5 rounded text-xs ${statusColor(p.status)}`}>
                  {p.status}
                </span>
                {p.assessmentType && (
                  <span className="text-xs text-slate-500">{p.assessmentType}</span>
                )}
              </div>

              <p className="text-sm text-white mb-1">{p.title}</p>

              {p.address && (
                <div className="flex items-start gap-1.5 mb-1.5">
                  <MapPin size={12} className="text-slate-500 mt-0.5 flex-shrink-0" />
                  <span className="text-xs text-slate-400">{p.address}</span>
                </div>
              )}

              {p.detailUrl && (
                <a
                  href={`https://www.planningportal.nsw.gov.au${p.detailUrl}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1 text-xs text-blue-400 hover:text-blue-300 transition"
                >
                  <ExternalLink size={10} />
                  View on Planning Portal
                </a>
              )}
            </div>
          ))}
        </div>
      )}

      {remaining > 0 && (
        <button
          onClick={() => setExpanded(!expanded)}
          className="mt-3 flex items-center gap-1 text-xs text-blue-400 hover:text-blue-300 transition"
        >
          {expanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
          {expanded ? "Show less" : `Show ${remaining} more`}
        </button>
      )}

      {projects.length > 0 && (
        <a
          href={`https://www.planningportal.nsw.gov.au/major-projects/projects`}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-3 flex items-center gap-1 text-xs text-slate-400 hover:text-slate-300 transition"
        >
          <ExternalLink size={10} />
          View all on Planning Portal
        </a>
      )}
    </motion.div>
  );
}
