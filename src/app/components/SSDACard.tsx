"use client";
import { useState, useEffect, useMemo } from "react";
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
  Determination: "bg-indigo-500/20 text-indigo-300",
  "Prepare EIS": "bg-amber-500/20 text-amber-300",
};

function statusColor(status: string): string {
  for (const [key, val] of Object.entries(STATUS_COLORS)) {
    if (status.includes(key)) return val;
  }
  return "bg-slate-500/20 text-slate-300";
}

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
  const [statusFilter, setStatusFilter] = useState("All");
  const [typeFilter, setTypeFilter] = useState("All");

  useEffect(() => {
    if (!lga) { setLoading(false); return; }
    setLoading(true);
    fetch(`/api/ssda?lga=${encodeURIComponent(lga)}`)
      .then((r) => r.json())
      .then((d) => {
        const raw: SSDAProject[] = d.projects || [];
        raw.sort((a, b) => statusPriority(a.status) - statusPriority(b.status));
        setProjects(raw);
        onProjects?.(raw);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [lga, onProjects]);

  const statuses = useMemo(() => ["All", ...Array.from(new Set(projects.map((p) => p.status).filter(Boolean)))], [projects]);
  const types = useMemo(() => ["All", ...Array.from(new Set(projects.map((p) => p.assessmentType).filter(Boolean)))], [projects]);

  const filtered = useMemo(() => {
    let result = projects;
    if (statusFilter !== "All") result = result.filter((p) => p.status.includes(statusFilter));
    if (typeFilter !== "All") result = result.filter((p) => p.assessmentType.includes(typeFilter));
    return result;
  }, [projects, statusFilter, typeFilter]);

  if (loading) {
    return (
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.6 }}
        className="glass-card col-span-1 md:col-span-2">
        <div className="flex items-center gap-2 mb-3">
          <Building2 size={20} style={{ color: "var(--info)" }} />
          <h3 className="font-semibold text-lg" style={{ color: "var(--text-primary)" }}>State Significant Developments</h3>
        </div>
        <div className="flex items-center gap-2 text-sm" style={{ color: "var(--text-muted)" }}>
          <div className="w-4 h-4 border-2 border-t-transparent rounded-full animate-spin" style={{ borderColor: "var(--info)", borderTopColor: "transparent" }} />
          Searching major projects in {lga}...
        </div>
      </motion.div>
    );
  }

  const maxVisible = 10;
  const visible = expanded ? filtered : filtered.slice(0, maxVisible);
  const remaining = filtered.length - maxVisible;

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.6 }}
      className="glass-card col-span-1 md:col-span-2">
      <div className="flex items-center gap-2 mb-2">
        <Building2 size={20} style={{ color: "var(--info)" }} />
        <h3 className="font-semibold text-lg" style={{ color: "var(--text-primary)" }}>State Significant Developments</h3>
        {projects.length > 0 && (
          <span className="ml-auto text-xs" style={{ color: "var(--text-muted)" }}>{projects.length} found</span>
        )}
      </div>
      <p className="text-xs mb-4" style={{ color: "var(--text-muted)" }}>Major projects in {lga}</p>

      {projects.length === 0 ? (
        <p className="text-sm" style={{ color: "var(--text-muted)" }}>No major projects found in {lga}</p>
      ) : (
        <>
          <div className="flex flex-wrap gap-2 mb-4">
            <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="form-select">
              {statuses.map((s) => <option key={s} value={s}>{s === "All" ? "All Statuses" : s}</option>)}
            </select>
            <select value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)} className="form-select">
              {types.map((t) => <option key={t} value={t}>{t === "All" ? "All Types" : t}</option>)}
            </select>
            {(statusFilter !== "All" || typeFilter !== "All") && (
              <span className="text-xs self-center" style={{ color: "var(--text-muted)" }}>{filtered.length} of {projects.length}</span>
            )}
          </div>
        <div className="space-y-3">
          {visible.map((p) => (
            <div key={p.caseId || p.title} className="clickable-item">
              <div className="flex flex-wrap items-start gap-2 mb-1.5">
                <span className="text-xs font-mono font-bold" style={{ color: "var(--text-muted)" }}>{p.caseId}</span>
                <span className={`px-2 py-0.5 rounded text-xs ${statusColor(p.status)}`}>{p.status}</span>
                {p.assessmentType && <span className="text-xs" style={{ color: "var(--text-muted)" }}>{p.assessmentType}</span>}
              </div>

              <p className="text-sm mb-1" style={{ color: "var(--text-primary)" }}>{p.title}</p>

              {p.address && (
                <div className="flex items-start gap-1.5 mb-1.5">
                  <MapPin size={12} style={{ color: "var(--text-muted)" }} className="mt-0.5 flex-shrink-0" />
                  <span className="text-xs" style={{ color: "var(--text-muted)" }}>{p.address}</span>
                </div>
              )}

              {p.detailUrl && (
                <a href={`https://www.planningportal.nsw.gov.au${p.detailUrl}`} target="_blank" rel="noopener noreferrer" className="link-external text-xs">
                  <ExternalLink size={10} />
                  View on Planning Portal
                </a>
              )}
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

      {projects.length > 0 && (
        <a href="https://www.planningportal.nsw.gov.au/major-projects/projects" target="_blank" rel="noopener noreferrer" className="link-external text-xs mt-3">
          <ExternalLink size={10} />
          View all on Planning Portal
        </a>
      )}
    </motion.div>
  );
}

