"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { History, X, MapPin, Clock, ChevronRight, RotateCw, ArrowLeftRight, Check } from "lucide-react";

interface SearchEntry {
  id: string;
  address: string;
  lat: number;
  lng: number;
  searched_at: string;
  search_count: number;
  snapshot: {
    zone: string;
    zoneName: string;
    councilName: string | null;
  };
}

interface HistorySidebarProps {
  open: boolean;
  onClose: () => void;
  onSelect: (entry: { address: string; lat: number; lng: number }) => void;
}

export default function HistorySidebar({ open, onClose, onSelect }: HistorySidebarProps) {
  const router = useRouter();
  const [searches, setSearches] = useState<SearchEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [compareMode, setCompareMode] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (open) {
      setLoading(true);
      setCompareMode(false);
      setSelected(new Set());
      fetch("/api/searches?limit=30")
        .then((r) => r.json())
        .then((data) => setSearches(data.searches || []))
        .catch(() => setSearches([]))
        .finally(() => setLoading(false));
    }
  }, [open]);

  function formatDate(iso: string) {
    const d = new Date(iso);
    const now = new Date();
    const diffMs = now.getTime() - d.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    if (diffMins < 1) return "Just now";
    if (diffMins < 60) return `${diffMins}m ago`;
    const diffHrs = Math.floor(diffMins / 60);
    if (diffHrs < 24) return `${diffHrs}h ago`;
    const diffDays = Math.floor(diffHrs / 24);
    if (diffDays < 7) return `${diffDays}d ago`;
    return d.toLocaleDateString("en-AU", { day: "numeric", month: "short" });
  }

  function handleClick(entry: SearchEntry) {
    if (compareMode) {
      const next = new Set(selected);
      if (next.has(entry.id)) {
        next.delete(entry.id);
      } else if (next.size < 2) {
        next.add(entry.id);
      }
      setSelected(next);
    } else {
      onSelect({ address: entry.address, lat: entry.lat, lng: entry.lng });
      onClose();
    }
  }

  function handleCompare() {
    const entries = searches.filter((s) => selected.has(s.id));
    if (entries.length !== 2) return;
    const [a, b] = entries;
    const url = `/compare?latA=${a.lat}&lngA=${a.lng}&qA=${encodeURIComponent(a.address)}&latB=${b.lat}&lngB=${b.lng}&qB=${encodeURIComponent(b.address)}`;
    router.push(url);
    onClose();
  }

  return (
    <AnimatePresence>
      {open && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 sm:bg-black/20 sm:backdrop-blur-sm"
            onClick={onClose}
          />

          {/* Sidebar panel */}
          <motion.aside
            initial={{ x: -320, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: -320, opacity: 0 }}
            transition={{ type: "spring", damping: 28, stiffness: 300 }}
            className="fixed top-0 left-0 bottom-0 z-50 w-80 max-w-[85vw] flex flex-col border-r shadow-xl"
            style={{ background: "var(--bg-elevated)", borderColor: "var(--border)" }}
          >
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-4 border-b" style={{ borderColor: "var(--border)" }}>
              <div className="flex items-center gap-2">
                <History size={18} style={{ color: "var(--accent)" }} />
                <h2 className="font-semibold text-sm" style={{ color: "var(--text-primary)" }}>Search History</h2>
              </div>
              <button
                onClick={onClose}
                className="p-1.5 rounded-lg transition hover:scale-110"
                style={{ color: "var(--text-muted)" }}
              >
                <X size={16} />
              </button>
            </div>

            {/* List */}
            <div className="flex-1 overflow-y-auto">
              {loading && (
                <div className="flex items-center justify-center py-12">
                  <RotateCw size={18} className="animate-spin" style={{ color: "var(--text-muted)" }} />
                </div>
              )}

              {!loading && searches.length === 0 && (
                <div className="text-center py-12 px-4">
                  <MapPin size={24} className="mx-auto mb-2 opacity-40" style={{ color: "var(--text-muted)" }} />
                  <p className="text-sm" style={{ color: "var(--text-muted)" }}>No searches yet</p>
                  <p className="text-xs mt-1" style={{ color: "var(--text-muted)", opacity: 0.7 }}>
                    Search for an address to build your history
                  </p>
                </div>
              )}

              {!loading && searches.length > 0 && (
                <>
                  {/* Compare row */}
                  {!compareMode && searches.length >= 2 && (
                    <div className="px-4 pt-3 pb-1">
                      <button
                        onClick={() => setCompareMode(true)}
                        className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-xs font-medium transition-all hover:scale-[1.02]"
                        style={{ background: "var(--accent-subtle)", border: "1px solid var(--accent-border)", color: "var(--accent)" }}
                      >
                        <ArrowLeftRight size={14} />
                        Compare Properties
                        <span className="ml-auto text-[10px] opacity-60">Pick 2</span>
                      </button>
                    </div>
                  )}

                  {/* Compare mode header */}
                  {compareMode && (
                    <div className="px-4 pt-3 pb-1 flex items-center justify-between">
                      <p className="text-xs font-medium" style={{ color: "var(--accent)" }}>
                        Select 2 properties ({selected.size}/2)
                      </p>
                      <button
                        onClick={() => { setCompareMode(false); setSelected(new Set()); }}
                        className="text-xs px-2 py-1 rounded-lg transition"
                        style={{ color: "var(--text-muted)" }}
                      >
                        Cancel
                      </button>
                    </div>
                  )}

                  <ul className="py-2">
                    {searches.map((entry) => {
                      const isSelected = selected.has(entry.id);
                      return (
                        <li key={entry.id}>
                          <button
                            onClick={() => handleClick(entry)}
                            className="w-full text-left px-4 py-3 transition-colors hover:bg-[var(--bg-sunken)] group"
                            style={isSelected ? { background: "var(--accent-subtle)" } : {}}
                          >
                            <div className="flex items-start justify-between gap-2">
                              {compareMode && (
                                <div
                                  className="mt-0.5 w-4 h-4 rounded border flex items-center justify-center shrink-0"
                                  style={{
                                    borderColor: isSelected ? "var(--accent)" : "var(--border)",
                                    background: isSelected ? "var(--accent)" : "transparent",
                                  }}
                                >
                                  {isSelected && <Check size={10} style={{ color: "white" }} />}
                                </div>
                              )}
                              <div className="min-w-0 flex-1">
                                <p className="text-sm font-medium truncate" style={{ color: "var(--text-primary)" }}>
                                  {entry.address.split(",")[0]}
                                </p>
                                <p className="text-xs truncate mt-0.5" style={{ color: "var(--text-muted)" }}>
                                  {entry.address.split(",").slice(1).join(",").trim()}
                                </p>
                                <div className="flex items-center gap-2 mt-1.5">
                                  {entry.snapshot?.zone && (
                                    <span className="text-[10px] font-medium px-1.5 py-0.5 rounded" style={{ background: "var(--accent-subtle)", color: "var(--accent)" }}>
                                      {entry.snapshot.zone}
                                    </span>
                                  )}
                                  <span className="flex items-center gap-1 text-[10px]" style={{ color: "var(--text-muted)" }}>
                                    <Clock size={9} />
                                    {formatDate(entry.searched_at)}
                                  </span>
                                  {entry.search_count > 1 && (
                                    <span className="text-[10px]" style={{ color: "var(--text-muted)" }}>
                                      · {entry.search_count}x
                                    </span>
                                  )}
                                </div>
                              </div>
                              {!compareMode && (
                                <ChevronRight size={14} className="mt-1 opacity-0 group-hover:opacity-60 transition-opacity" style={{ color: "var(--text-muted)" }} />
                              )}
                            </div>
                          </button>
                        </li>
                      );
                    })}
                  </ul>
                </>
              )}
            </div>

            {/* Footer */}
            {compareMode && selected.size === 2 ? (
              <div className="px-4 py-3 border-t" style={{ borderColor: "var(--border)" }}>
                <button
                  onClick={handleCompare}
                  className="w-full py-2.5 rounded-xl text-sm font-semibold transition-all hover:scale-[1.02]"
                  style={{ background: "var(--accent)", color: "white" }}
                >
                  Compare Selected
                </button>
              </div>
            ) : searches.length > 0 && !compareMode ? (
              <div className="px-4 py-3 border-t text-center" style={{ borderColor: "var(--border)" }}>
                <p className="text-[10px]" style={{ color: "var(--text-muted)" }}>
                  {searches.length} saved {searches.length === 1 ? "search" : "searches"}
                </p>
              </div>
            ) : null}
          </motion.aside>
        </>
      )}
    </AnimatePresence>
  );
}
