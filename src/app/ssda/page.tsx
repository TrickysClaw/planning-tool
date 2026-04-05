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
  Exhibition: "bg-red-500/20 text-red-300 border-red-500/30",
  Assessment: "bg-blue-500/20 text-blue-300 border-blue-500/30",
  "Response to Submissions": "bg-blue-500/20 text-blue-300 border-blue-500/30",
  "Collate Submissions": "bg-blue-500/20 text-blue-300 border-blue-500/30",
  Determination: "bg-emerald-500/20 text-emerald-300 border-emerald-500/30",
  "Prepare EIS": "bg-amber-500/20 text-amber-300 border-amber-500/30",
  SEARs: "bg-purple-500/20 text-purple-300 border-purple-500/30",
  "Arrange Exhibition": "bg-orange-500/20 text-orange-300 border-orange-500/30",
  "Prepare Mod Report": "bg-amber-500/20 text-amber-300 border-amber-500/30",
  "Review Application": "bg-slate-500/20 text-slate-300 border-slate-500/30",
  Withdrawn: "bg-gray-500/20 text-gray-400 border-gray-500/30",
};

function statusColor(status: string): string {
  for (const [key, val] of Object.entries(STATUS_COLORS)) {
    if (status.includes(key)) return val;
  }
  return "bg-slate-500/20 text-slate-300 border-slate-500/30";
}

// Key Sydney LGAs for quick access
const POPULAR_LGAS = [
  "The Hills Shire",
  "City of Parramatta",
  "Blacktown",
  "City of Sydney",
  "North Sydney",
  "Northern Beaches",
  "Hornsby Shire",
  "Ku-ring-gai",
  "Penrith",
  "Liverpool City",
  "Camden",
  "Campbelltown",
  "Cumberland",
  "Bayside",
  "Inner West",
  "City of Ryde",
  "Sutherland Shire",
  "Randwick City",
  "Wollongong City",
  "Central Coast",
  "Newcastle City",
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
      .then((d) => {
        setProjects(d.projects || []);
        setLoading(false);
      })
      .catch(() => {
        setError("Failed to load projects");
        setLoading(false);
      });
  }, [selectedLga]);

  const filtered = projects.filter((p) => {
    if (statusFilter !== "All" && !p.status.includes(statusFilter)) return false;
    if (typeFilter !== "All" && !p.assessmentType.includes(typeFilter)) return false;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      return (
        p.title.toLowerCase().includes(q) ||
        p.caseId.toLowerCase().includes(q) ||
        p.address.toLowerCase().includes(q)
      );
    }
    return true;
  });

  const statuses = ["All", ...Array.from(new Set(projects.map((p) => p.status)))];
  const types = ["All", ...Array.from(new Set(projects.map((p) => p.assessmentType).filter(Boolean)))];

  const toggleExpand = (id: string) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  // Stats
  const exhibitionCount = projects.filter((p) => p.status.includes("Exhibition")).length;
  const assessmentCount = projects.filter((p) => p.status.includes("Assessment") || p.status.includes("Response")).length;
  const determinedCount = projects.filter((p) => p.status.includes("Determination")).length;

  return (
    <main className="min-h-screen px-4 py-12 md:py-20">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-8"
        >
          <a href="/" className="text-sm text-slate-500 hover:text-emerald-400 transition mb-4 inline-block">
            ← Back to Address Search
          </a>
          <h1 className="text-4xl md:text-5xl font-bold text-white mb-3">
            🏗️ SSDA Tracker
          </h1>
          <p className="text-slate-400 text-lg">
            Track State Significant Development Applications across NSW
          </p>
        </motion.div>

        {/* LGA Selection */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="glass-card mb-6"
        >
          <h3 className="text-white font-semibold mb-3 flex items-center gap-2">
            <Building2 size={18} className="text-emerald-400" />
            Select Local Government Area
          </h3>

          {/* Popular LGAs */}
          <div className="flex flex-wrap gap-2 mb-3">
            {POPULAR_LGAS.map((lga) => (
              <button
                key={lga}
                onClick={() => setSelectedLga(lga)}
                className={`px-3 py-1.5 rounded-lg text-sm transition-all duration-200 ${
                  selectedLga === lga
                    ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30"
                    : "bg-white/[0.03] text-slate-400 border border-white/[0.06] hover:border-emerald-500/20 hover:text-white"
                }`}
              >
                {lga}
              </button>
            ))}
          </div>

          {/* Show all toggle */}
          <button
            onClick={() => setShowAllLgas(!showAllLgas)}
            className="text-xs text-slate-500 hover:text-emerald-400 transition flex items-center gap-1"
          >
            {showAllLgas ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
            {showAllLgas ? "Show less" : "Show all NSW LGAs"}
          </button>

          <AnimatePresence>
            {showAllLgas && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                className="overflow-hidden"
              >
                <div className="flex flex-wrap gap-1.5 mt-3 pt-3 border-t border-white/[0.05]">
                  {ALL_LGAS.filter((l) => !POPULAR_LGAS.includes(l)).map((lga) => (
                    <button
                      key={lga}
                      onClick={() => { setSelectedLga(lga); setShowAllLgas(false); }}
                      className={`px-2 py-1 rounded text-xs transition-all ${
                        selectedLga === lga
                          ? "bg-emerald-500/20 text-emerald-300"
                          : "bg-white/[0.02] text-slate-500 hover:text-white hover:bg-white/[0.05]"
                      }`}
                    >
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
            <Loader2 className="animate-spin text-emerald-400" size={40} />
            <p className="text-slate-400 text-sm">Searching major projects in {selectedLga}...</p>
          </div>
        )}

        {/* Error */}
        {error && (
          <div className="glass-card text-red-400 text-center">{error}</div>
        )}

        {/* Results */}
        {!loading && selectedLga && projects.length > 0 && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
            {/* Stats Row */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
              <div className="glass-card !py-3 text-center">
                <div className="text-2xl font-bold text-white">{projects.length}</div>
                <div className="text-xs text-slate-500">Total Projects</div>
              </div>
              <div className="glass-card !py-3 text-center">
                <div className="text-2xl font-bold text-red-400">{exhibitionCount}</div>
                <div className="text-xs text-slate-500">On Exhibition</div>
              </div>
              <div className="glass-card !py-3 text-center">
                <div className="text-2xl font-bold text-blue-400">{assessmentCount}</div>
                <div className="text-xs text-slate-500">Under Assessment</div>
              </div>
              <div className="glass-card !py-3 text-center">
                <div className="text-2xl font-bold text-emerald-400">{determinedCount}</div>
                <div className="text-xs text-slate-500">Determined</div>
              </div>
            </div>

            {/* Filters */}
            <div className="glass-card !py-3 mb-4">
              <div className="flex flex-col md:flex-row gap-3">
                <div className="flex-1 relative">
                  <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                  <input
                    type="text"
                    placeholder="Search projects by name, case ID, or address..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 rounded-lg bg-white/[0.03] border border-white/[0.08] text-white text-sm placeholder-slate-500 focus:outline-none focus:border-emerald-500/30"
                  />
                </div>
                <div className="flex gap-2">
                  <div className="relative">
                    <Filter size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-500" />
                    <select
                      value={statusFilter}
                      onChange={(e) => setStatusFilter(e.target.value)}
                      className="pl-7 pr-8 py-2 rounded-lg bg-white/[0.03] border border-white/[0.08] text-slate-300 text-sm appearance-none cursor-pointer focus:outline-none focus:border-emerald-500/30"
                    >
                      {statuses.map((s) => (
                        <option key={s} value={s} className="bg-[#0d1320]">{s}</option>
                      ))}
                    </select>
                  </div>
                  <select
                    value={typeFilter}
                    onChange={(e) => setTypeFilter(e.target.value)}
                    className="px-3 py-2 rounded-lg bg-white/[0.03] border border-white/[0.08] text-slate-300 text-sm appearance-none cursor-pointer focus:outline-none focus:border-emerald-500/30"
                  >
                    {types.map((t) => (
                      <option key={t} value={t} className="bg-[#0d1320]">{t}</option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="text-xs text-slate-500 mt-2">
                Showing {filtered.length} of {projects.length} projects
              </div>
            </div>

            {/* Project List */}
            <div className="space-y-3">
              {filtered.map((p, i) => {
                const isExpanded = expanded.has(p.caseId || p.title);
                return (
                  <motion.div
                    key={p.caseId || `${p.title}-${i}`}
                    initial={{ opacity: 0, y: 15 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: Math.min(i * 0.03, 0.3) }}
                    className="glass-card !p-4 cursor-pointer hover:border-emerald-500/20 transition-colors"
                    onClick={() => toggleExpand(p.caseId || p.title)}
                  >
                    <div className="flex flex-wrap items-start gap-2 mb-2">
                      <span className="text-sm text-white font-mono font-bold">{p.caseId}</span>
                      <span className={`px-2 py-0.5 rounded text-xs border ${statusColor(p.status)}`}>
                        {p.status}
                      </span>
                      {p.assessmentType && (
                        <span className="px-2 py-0.5 rounded text-xs bg-white/[0.05] text-slate-400 border border-white/[0.08]">
                          {p.assessmentType}
                        </span>
                      )}
                      {isExpanded ? (
                        <ChevronUp size={14} className="ml-auto text-slate-500" />
                      ) : (
                        <ChevronDown size={14} className="ml-auto text-slate-500" />
                      )}
                    </div>

                    <h4 className="text-white text-sm font-medium mb-1">{p.title}</h4>

                    {p.address && (
                      <div className="flex items-start gap-1.5 mb-1">
                        <MapPin size={12} className="text-slate-500 mt-0.5 flex-shrink-0" />
                        <span className="text-xs text-slate-400">{p.address}</span>
                      </div>
                    )}

                    <AnimatePresence>
                      {isExpanded && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: "auto", opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          className="overflow-hidden"
                        >
                          <div className="mt-3 pt-3 border-t border-white/[0.05] flex flex-wrap gap-3">
                            <div>
                              <span className="text-xs text-slate-500">LGA</span>
                              <p className="text-sm text-white">{p.lga}</p>
                            </div>
                            {p.detailUrl && (
                              <a
                                href={`https://www.planningportal.nsw.gov.au${p.detailUrl}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                onClick={(e) => e.stopPropagation()}
                                className="flex items-center gap-1 text-sm text-blue-400 hover:text-blue-300 transition ml-auto"
                              >
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
              <div className="glass-card text-center text-slate-400 py-8">
                No projects match your filters
              </div>
            )}
          </motion.div>
        )}

        {/* Empty state */}
        {!loading && selectedLga && projects.length === 0 && !error && (
          <div className="glass-card text-center py-12">
            <Building2 size={40} className="text-slate-600 mx-auto mb-3" />
            <p className="text-slate-400">No state significant projects found in {selectedLga}</p>
          </div>
        )}

        {/* No selection state */}
        {!selectedLga && (
          <div className="glass-card text-center py-16">
            <Building2 size={48} className="text-slate-600 mx-auto mb-4" />
            <p className="text-white text-lg font-medium mb-2">Select an LGA to get started</p>
            <p className="text-slate-500 text-sm">
              Choose a Local Government Area above to see all state significant development applications
            </p>
          </div>
        )}

        {/* Footer */}
        <div className="mt-8 text-center">
          <p className="text-xs text-slate-600">
            Data sourced from{" "}
            <a
              href="https://www.planningportal.nsw.gov.au/major-projects/projects"
              target="_blank"
              rel="noopener noreferrer"
              className="text-emerald-500/50 hover:text-emerald-400 transition"
            >
              NSW Planning Portal — Major Projects
            </a>
            . © State Government of NSW.
          </p>
        </div>
      </div>
    </main>
  );
}
