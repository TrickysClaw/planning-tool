"use client";
import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Building2,
  ChevronDown,
  ChevronUp,
  ExternalLink,
  MapPin,
  Loader2,
  Search,
  Filter,
} from "lucide-react";
import Link from "next/link";

interface SSDAProject {
  caseId: string;
  status: string;
  assessmentType: string;
  lga: string;
  title: string;
  address: string;
  detailUrl: string;
}

const STATUS_STYLES: Record<string, { bg: string; color: string; border: string }> = {
  Exhibition: { bg: "var(--danger-bg)", color: "var(--danger)", border: "var(--danger-border)" },
  Assessment: { bg: "var(--info-bg)", color: "var(--info)", border: "var(--info-border)" },
  "Response to Submissions": { bg: "var(--info-bg)", color: "var(--info)", border: "var(--info-border)" },
  "Collate Submissions": { bg: "var(--info-bg)", color: "var(--info)", border: "var(--info-border)" },
  Determination: { bg: "var(--success-bg)", color: "var(--success)", border: "var(--success-border)" },
  "Prepare EIS": { bg: "var(--warning-bg)", color: "var(--warning)", border: "var(--warning-border)" },
  SEARs: { bg: "rgba(139,92,246,0.1)", color: "#7C3AED", border: "rgba(139,92,246,0.2)" },
  "Arrange Exhibition": { bg: "var(--warning-bg)", color: "var(--warning)", border: "var(--warning-border)" },
  Withdrawn: { bg: "rgba(100,116,139,0.1)", color: "#64748B", border: "rgba(100,116,139,0.2)" },
};

function statusStyle(status: string): { bg: string; color: string; border: string } {
  for (const [key, val] of Object.entries(STATUS_STYLES)) {
    if (status.includes(key)) return val;
  }
  return { bg: "rgba(100,116,139,0.1)", color: "#64748B", border: "rgba(100,116,139,0.2)" };
}

const POPULAR_LGAS = [
  "The Hills Shire", "City of Parramatta", "Blacktown", "City of Sydney",
  "North Sydney", "Northern Beaches", "Hornsby Shire", "Ku-ring-gai",
  "Penrith", "Liverpool City", "Camden", "Campbelltown",
  "Cumberland", "Bayside", "Inner West", "City of Ryde",
  "Sutherland Shire", "Randwick City", "Wollongong City", "Central Coast", "Newcastle City",
];

const ALL_LGAS = [
  "Albury City","Armidale Regional","Ballina Shire","Balranald Shire","Bathurst Regional",
  "Bayside","Bega Valley Shire","Bellingen Shire","Berrigan Shire","Blacktown","Bland Shire",
  "Blayney Shire","Blue Mountains","Bogan Shire","Bourke Shire","Brewarrina Shire","Burwood",
  "Byron Shire","Cabonne","Camden","Campbelltown","Canterbury-Bankstown","Carrathool Shire",
  "Central Coast","Central Darling Shire","Cessnock City","City of Canada Bay","City of Parramatta",
  "City of Ryde","City of Sydney","Clarence Valley","Cobar Shire","Coffs Harbour City",
  "Coolamon Shire","Coonamble Shire","Cowra Shire","Cumberland","Dubbo Regional","Dungog Shire",
  "Edward River","Eurobodalla Shire","Fairfield City","Federation","Forbes Shire","Georges River",
  "Gilgandra Shire","Glen Innes Severn","Goulburn Mulwaree","Greater Hume Shire","Griffith City",
  "Gunnedah Shire","Gwydir Shire","Hawkesbury City","Hay Shire","Hilltops","Hornsby Shire",
  "Hunters Hill","Inner West","Inverell Shire","Junee Shire","Kempsey Shire","Kiama Municipal",
  "Ku-ring-gai","Kyogle","Lachlan Shire","Lake Macquarie City","Lane Cove","Leeton Shire",
  "Lismore City","Lithgow City","Liverpool City","Liverpool Plains Shire","Lockhart Shire",
  "Maitland City","Mid-Coast","Mid-Western Regional","Mosman Municipal","Murray River",
  "Murrumbidgee","Muswellbrook Shire","Nambucca Valley","Narrabri Shire","Narrandera Shire",
  "Narromine Shire","Newcastle City","North Sydney","Northern Beaches","Oberon","Orange City",
  "Parkes Shire","Penrith","Port Macquarie-Hastings","Port Stephens",
  "Queanbeyan-Palerang Regional","Randwick City","Richmond Valley","Shellharbour City",
  "Shoalhaven City","Singleton","Snowy Monaro Regional","Snowy Valleys","Strathfield",
  "Sutherland Shire","Tamworth Regional","Temora Shire","Tenterfield Shire","The Hills Shire",
  "Tweed Shire","Upper Hunter Shire","Upper Lachlan Shire","Uralla Shire","Wagga Wagga City",
  "Walcha","Walgett Shire","Warren Shire","Warrumbungle Shire","Waverley","Weddin Shire",
  "Wentworth Shire","Willoughby City","Wingecarribee Shire","Wollondilly Shire",
  "Wollongong City","Woollahra Municipal","Yass Valley",
];

export default function SSDAPage() {
  const [selectedLga, setSelectedLga] = useState("");
  const [projects, setProjects] = useState<SSDAProject[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");
  const [typeFilter, setTypeFilter] = useState("All");
  const [showAllLgas, setShowAllLgas] = useState(false);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (!selectedLga) return;
    setLoading(true);
    setError("");
    setProjects([]);
    fetch(`/api/ssda?lga=${encodeURIComponent(selectedLga)}`)
      .then((r) => r.json())
      .then((d) => { setProjects(d.projects || []); setLoading(false); })
      .catch(() => { setError("Failed to load projects"); setLoading(false); });
  }, [selectedLga]);

  const filtered = projects.filter((p) => {
    if (statusFilter !== "All" && !p.status.includes(statusFilter)) return false;
    if (typeFilter !== "All" && !p.assessmentType.includes(typeFilter)) return false;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      return p.title.toLowerCase().includes(q) || p.caseId.toLowerCase().includes(q) || p.address.toLowerCase().includes(q);
    }
    return true;
  });

  const statuses = ["All", ...Array.from(new Set(projects.map((p) => p.status)))];
  const types = ["All", ...Array.from(new Set(projects.map((p) => p.assessmentType).filter(Boolean)))];

  const toggleExpand = (id: string) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const exhibitionCount = projects.filter((p) => p.status.includes("Exhibition")).length;
  const assessmentCount = projects.filter((p) => p.status.includes("Assessment") || p.status.includes("Response")).length;
  const determinedCount = projects.filter((p) => p.status.includes("Determination")).length;

  return (
    <main className="min-h-screen px-4 py-12 md:py-20">
      <div className="max-w-6xl mx-auto">
        {/* Navigation Tabs */}
        <div className="flex justify-center mb-8">
          <div className="inline-flex rounded-xl p-1 gap-1" style={{ background: "var(--bg-sunken)", border: "1px solid var(--border)" }}>
            <Link href="/" className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition" style={{ color: "var(--text-muted)" }}>
              <Search size={14} />
              Home
            </Link>
            <span className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium" style={{ background: "var(--accent-subtle)", color: "var(--accent)" }}>
              <Building2 size={14} />
              Major Projects
              <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full" style={{ background: "var(--bg-card)", color: "var(--accent)" }}>Beta</span>
            </span>
          </div>
        </div>

        {/* Header */}
        <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} className="text-center mb-8">
          <h1 className="text-4xl md:text-5xl font-bold mb-3" style={{ color: "var(--text-primary)" }}>Major Projects Tracker</h1>
          <p className="text-lg" style={{ color: "var(--text-muted)" }}>
            Big developments happening across NSW — hospitals, housing estates, metro stations, and more
          </p>
          <p className="text-sm mt-2" style={{ color: "var(--text-muted)", opacity: 0.7 }}>
            Government-approved major projects that bypass normal council processes.
          </p>
        </motion.div>

        {/* LGA Selection */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="glass-card mb-6">
          <h3 className="font-semibold mb-3 flex items-center gap-2" style={{ color: "var(--text-primary)" }}>
            <Building2 size={18} style={{ color: "var(--accent)" }} />
            Select Local Government Area
          </h3>

          <div className="flex flex-wrap gap-2 mb-3">
            {POPULAR_LGAS.map((lga) => (
              <button key={lga} onClick={() => setSelectedLga(lga)}
                className="px-3 py-1.5 rounded-lg text-sm transition-all duration-200"
                style={selectedLga === lga
                  ? { background: "var(--accent-subtle)", color: "var(--accent)", border: "1px solid var(--accent-border)" }
                  : { background: "var(--bg-sunken)", color: "var(--text-muted)", border: "1px solid var(--border)" }
                }>
                {lga}
              </button>
            ))}
          </div>

          <button onClick={() => setShowAllLgas(!showAllLgas)} className="text-xs transition flex items-center gap-1" style={{ color: "var(--text-muted)" }}>
            {showAllLgas ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
            {showAllLgas ? "Show less" : "Show all NSW LGAs"}
          </button>

          <AnimatePresence>
            {showAllLgas && (
              <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
                <div className="flex flex-wrap gap-1.5 mt-3 pt-3" style={{ borderTop: "1px solid var(--border)" }}>
                  {ALL_LGAS.filter((l) => !POPULAR_LGAS.includes(l)).map((lga) => (
                    <button key={lga} onClick={() => { setSelectedLga(lga); setShowAllLgas(false); }}
                      className="px-2 py-1 rounded text-xs transition-all"
                      style={selectedLga === lga
                        ? { background: "var(--accent-subtle)", color: "var(--accent)" }
                        : { background: "var(--bg-sunken)", color: "var(--text-muted)" }
                      }>
                      {lga}
                    </button>
                  ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>

        {/* Loading */}
        {loading && (
          <div className="flex flex-col items-center justify-center py-16 gap-3">
            <Loader2 className="animate-spin" size={40} style={{ color: "var(--accent)" }} />
            <p className="text-sm" style={{ color: "var(--text-muted)" }}>Searching major projects in {selectedLga}...</p>
          </div>
        )}

        {error && <div className="glass-card text-red-400 text-center">{error}</div>}

        {/* Results */}
        {!loading && selectedLga && projects.length > 0 && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
            {/* Stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
              <div className="glass-card !py-3 text-center">
                <div className="text-2xl font-bold" style={{ color: "var(--text-primary)" }}>{projects.length}</div>
                <div className="text-xs" style={{ color: "var(--text-muted)" }}>Total Projects</div>
              </div>
              <div className="glass-card !py-3 text-center">
                <div className="text-2xl font-bold" style={{ color: "var(--danger)" }}>{exhibitionCount}</div>
                <div className="text-xs" style={{ color: "var(--text-muted)" }}>On Exhibition</div>
              </div>
              <div className="glass-card !py-3 text-center">
                <div className="text-2xl font-bold" style={{ color: "var(--info)" }}>{assessmentCount}</div>
                <div className="text-xs" style={{ color: "var(--text-muted)" }}>Under Assessment</div>
              </div>
              <div className="glass-card !py-3 text-center">
                <div className="text-2xl font-bold" style={{ color: "var(--success)" }}>{determinedCount}</div>
                <div className="text-xs" style={{ color: "var(--text-muted)" }}>Determined</div>
              </div>
            </div>

            {/* Filters */}
            <div className="glass-card !py-3 mb-4">
              <div className="flex flex-col md:flex-row gap-3">
                <div className="flex-1 relative">
                  <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: "var(--text-muted)" }} />
                  <input type="text" placeholder="Search projects by name, case ID, or address..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 rounded-lg text-sm focus:outline-none" style={{ background: "var(--input-bg)", border: "1px solid var(--input-border)", color: "var(--text-primary)" }} />
                </div>
                <div className="flex gap-2">
                  <div className="relative">
                    <Filter size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2" style={{ color: "var(--text-muted)" }} />
                    <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}
                      className="pl-7 pr-8 py-2 rounded-lg text-sm appearance-none cursor-pointer focus:outline-none" style={{ background: "var(--input-bg)", border: "1px solid var(--input-border)", color: "var(--text-secondary)" }}>
                      {statuses.map((s) => <option key={s} value={s}>{s}</option>)}
                    </select>
                  </div>
                  <select value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)}
                    className="px-3 py-2 rounded-lg text-sm appearance-none cursor-pointer focus:outline-none" style={{ background: "var(--input-bg)", border: "1px solid var(--input-border)", color: "var(--text-secondary)" }}>
                    {types.map((t) => <option key={t} value={t}>{t}</option>)}
                  </select>
                </div>
              </div>
              <div className="text-xs mt-2" style={{ color: "var(--text-muted)" }}>Showing {filtered.length} of {projects.length} projects</div>
            </div>

            {/* Project List */}
            <div className="space-y-3">
              {filtered.map((p, i) => {
                const isExpanded = expanded.has(p.caseId || p.title);
                return (
                  <motion.div key={p.caseId || `${p.title}-${i}`} initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: Math.min(i * 0.03, 0.3) }}
                    className="glass-card !p-4 cursor-pointer transition-colors" onClick={() => toggleExpand(p.caseId || p.title)}>
                    <div className="flex flex-wrap items-start gap-2 mb-2">
                      <span className="text-sm font-mono font-bold" style={{ color: "var(--text-primary)" }}>{p.caseId}</span>
                      <span className="px-2 py-0.5 rounded text-xs border font-medium" style={{ background: statusStyle(p.status).bg, color: statusStyle(p.status).color, borderColor: statusStyle(p.status).border }}>{p.status}</span>
                      {p.assessmentType && <span className="px-2 py-0.5 rounded text-xs" style={{ background: "var(--bg-sunken)", color: "var(--text-muted)", border: "1px solid var(--border)" }}>{p.assessmentType}</span>}
                      {isExpanded ? <ChevronUp size={14} className="ml-auto" style={{ color: "var(--text-muted)" }} /> : <ChevronDown size={14} className="ml-auto" style={{ color: "var(--text-muted)" }} />}
                    </div>
                    <h4 className="text-sm font-medium mb-1" style={{ color: "var(--text-primary)" }}>{p.title}</h4>
                    {p.address && (
                      <div className="flex items-start gap-1.5 mb-1">
                        <MapPin size={12} style={{ color: "var(--text-muted)" }} className="mt-0.5 flex-shrink-0" />
                        <span className="text-xs" style={{ color: "var(--text-muted)" }}>{p.address}</span>
                      </div>
                    )}
                    <AnimatePresence>
                      {isExpanded && (
                        <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
                          <div className="mt-3 pt-3 flex flex-wrap gap-3" style={{ borderTop: "1px solid var(--border)" }}>
                            <div>
                              <span className="text-xs" style={{ color: "var(--text-muted)" }}>LGA</span>
                              <p className="text-sm" style={{ color: "var(--text-primary)" }}>{p.lga}</p>
                            </div>
                            {p.detailUrl && (
                              <a href={`https://www.planningportal.nsw.gov.au${p.detailUrl}`} target="_blank" rel="noopener noreferrer" onClick={(e) => e.stopPropagation()}
                                className="flex items-center gap-1 text-sm transition ml-auto" style={{ color: "var(--info)" }}>
                                <ExternalLink size={12} />
                                View on Planning Portal
                              </a>
                            )}
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </motion.div>
                );
              })}
            </div>

            {filtered.length === 0 && (
              <div className="glass-card text-center py-8" style={{ color: "var(--text-muted)" }}>No projects match your filters</div>
            )}
          </motion.div>
        )}

        {/* Empty states */}
        {!loading && selectedLga && projects.length === 0 && !error && (
          <div className="glass-card text-center py-12">
            <Building2 size={40} className="mx-auto mb-3" style={{ color: "var(--text-muted)" }} />
            <p style={{ color: "var(--text-muted)" }}>No state significant projects found in {selectedLga}</p>
          </div>
        )}

        {!selectedLga && (
          <div className="glass-card text-center py-16">
            <Building2 size={48} className="mx-auto mb-4" style={{ color: "var(--text-muted)" }} />
            <p className="text-lg font-medium mb-2" style={{ color: "var(--text-primary)" }}>Select an LGA to get started</p>
            <p className="text-sm" style={{ color: "var(--text-muted)" }}>Choose a Local Government Area above to see all state significant development applications</p>
          </div>
        )}

        <div className="mt-8 text-center">
          <p className="text-xs" style={{ color: "var(--text-muted)" }}>
            Data sourced from{" "}
            <a href="https://www.planningportal.nsw.gov.au/major-projects/projects" target="_blank" rel="noopener noreferrer" style={{ color: "var(--accent)" }} className="transition">
              NSW Planning Portal — Major Projects
            </a>
            . © State Government of NSW.
          </p>
        </div>
      </div>
    </main>
  );
}
