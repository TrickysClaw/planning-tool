"use client";
import { useState, useEffect, useRef, useCallback } from "react";
import { Search, X, Clock } from "lucide-react";

interface GeoResult { display_name: string; lat: string; lon: string }
interface SearchHistoryEntry { address: string; lat: number; lng: number; zone: string; timestamp: number }

export default function SearchBar({
  onSelect,
  searchHistory,
  onHistoryClick,
}: {
  onSelect: (r: GeoResult) => void;
  searchHistory?: SearchHistoryEntry[];
  onHistoryClick?: (entry: SearchHistoryEntry) => void;
}) {
  const [q, setQ] = useState("");
  const [results, setResults] = useState<GeoResult[]>([]);
  const [open, setOpen] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout>>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
        setShowHistory(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  useEffect(() => {
    if (q.length < 3) { setResults([]); setOpen(false); return; }
    setShowHistory(false);
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(async () => {
      const res = await fetch(`/api/geocode?q=${encodeURIComponent(q)}`);
      const data = await res.json();
      setResults(data);
      setOpen(data.length > 0);
    }, 350);
  }, [q]);

  const handleSelect = useCallback((r: GeoResult) => {
    onSelect(r);
    setQ(r.display_name);
    setResults([]);
    setOpen(false);
    setShowHistory(false);
  }, [onSelect]);

  const handleClear = useCallback(() => {
    setQ("");
    setResults([]);
    setOpen(false);
    setShowHistory(false);
  }, []);

  const handleFocus = useCallback(() => {
    if (results.length > 0) {
      setOpen(true);
    } else if (q.length < 3 && searchHistory && searchHistory.length > 0) {
      setShowHistory(true);
    }
  }, [results, q, searchHistory]);

  return (
    <div className="relative w-full max-w-2xl mx-auto" ref={containerRef}>
      <div className="flex items-center glass-card !p-3 gap-3">
        <Search className="text-emerald-400 shrink-0" size={24} />
        <input
          className="bg-transparent outline-none w-full text-lg text-white placeholder-slate-500"
          placeholder="Search any NSW address... (e.g. 100 Fairway Drive, Norwest)"
          value={q}
          onChange={e => setQ(e.target.value)}
          onFocus={handleFocus}
          onKeyDown={e => {
            if (e.key === "Escape") { setOpen(false); setShowHistory(false); }
            if (e.key === "Enter" && results.length > 0) handleSelect(results[0]);
          }}
        />
        {q && (
          <button onClick={handleClear} className="text-slate-500 hover:text-white transition">
            <X size={18} />
          </button>
        )}
      </div>
      {/* Geocode results */}
      {open && results.length > 0 && (
        <div className="absolute z-50 w-full mt-2 glass-card !p-2 space-y-1 max-h-60 overflow-y-auto">
          {results.map((r, i) => (
            <button
              key={i}
              className="w-full text-left px-3 py-2 rounded-lg hover:bg-emerald-500/10 text-sm text-slate-200 transition"
              onClick={() => handleSelect(r)}
            >
              {r.display_name}
            </button>
          ))}
        </div>
      )}
      {/* History dropdown */}
      {showHistory && searchHistory && searchHistory.length > 0 && !open && (
        <div className="absolute z-50 w-full mt-2 glass-card !p-2 space-y-1 max-h-60 overflow-y-auto">
          <div className="px-3 py-1.5 text-xs text-slate-500 font-medium flex items-center gap-1.5">
            <Clock size={11} /> Recent searches
          </div>
          {searchHistory.slice(0, 6).map((entry) => (
            <button
              key={entry.timestamp}
              className="w-full text-left px-3 py-2 rounded-lg hover:bg-emerald-500/10 text-sm text-slate-200 transition flex items-center justify-between"
              onClick={() => {
                onHistoryClick?.(entry);
                setQ(entry.address);
                setShowHistory(false);
              }}
            >
              <span className="truncate">{entry.address}</span>
              {entry.zone && <span className="text-xs text-emerald-400/50 shrink-0 ml-2">{entry.zone}</span>}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
