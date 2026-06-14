"use client";
import { useState, useEffect, useRef, useCallback } from "react";
import { Search, X, Clock } from "lucide-react";

interface GeoResult {
  display_name: string;
  lat: string;
  lon: string;
}

interface SearchHistoryEntry {
  address: string;
  lat: number;
  lng: number;
  zone: string;
  timestamp: number;
}

interface Props {
  onSelect: (r: GeoResult) => void;
  searchHistory?: SearchHistoryEntry[];
  onHistoryClick?: (entry: SearchHistoryEntry) => void;
  compact?: boolean;
  placeholder?: string;
}

export default function SearchBar({ onSelect, searchHistory, onHistoryClick, compact, placeholder }: Props) {
  const [q, setQ] = useState("");
  const [results, setResults] = useState<GeoResult[]>([]);
  const [open, setOpen] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout>>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

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

  // Only fetch when user types - not when q is set programmatically
  function handleInputChange(value: string) {
    setQ(value);
    if (value.length < 3) { setResults([]); setOpen(false); return; }
    setShowHistory(false);
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(async () => {
      const res = await fetch(`/api/geocode?q=${encodeURIComponent(value)}`);
      const data = await res.json();
      setResults(data);
      setOpen(data.length > 0);
    }, 350);
  }

  function handleSelect(r: GeoResult) {
    if (timer.current) clearTimeout(timer.current);
    setResults([]);
    setOpen(false);
    setShowHistory(false);
    setQ(r.display_name);
    inputRef.current?.blur();
    onSelect(r);
  }

  const handleFocus = useCallback(() => {
    if (results.length > 0) setOpen(true);
    else if (q.length < 3 && searchHistory?.length) setShowHistory(true);
  }, [results, q, searchHistory]);

  return (
    <div className={`relative w-full ${compact ? "" : "max-w-2xl mx-auto"}`} ref={containerRef}>
      <div className={`flex items-center gap-3 ${compact ? "rounded-lg px-3 py-2" : "glass-card !p-3"}`} style={compact ? { background: "var(--input-bg)", border: "1px solid var(--input-border)", transition: "border-color 150ms ease, box-shadow 150ms ease" } : undefined}>
        <Search className="shrink-0" size={compact ? 18 : 24} style={{ color: "var(--accent)" }} />
        <input
          ref={inputRef}
          className={`bg-transparent outline-none w-full ${compact ? "text-sm" : "text-lg"} placeholder:text-[var(--text-muted)]`}
          style={{ color: "var(--text-primary)" }}
          placeholder={placeholder || "Search any NSW address..."}
          value={q}
          onChange={(e) => handleInputChange(e.target.value)}
          onFocus={handleFocus}
          onKeyDown={(e) => {
            if (e.key === "Escape") { setOpen(false); setShowHistory(false); }
            if (e.key === "Enter" && results.length > 0) handleSelect(results[0]);
          }}
        />
        {q && (
          <button onClick={() => { setQ(""); setResults([]); setOpen(false); }} className="btn-icon">
            <X size={18} />
          </button>
        )}
      </div>

      {open && results.length > 0 && (
        <div className="absolute z-50 w-full mt-2 glass-card !p-2 space-y-1 max-h-60 overflow-y-auto">
          {results.map((r, i) => (
            <button key={i} className="dropdown-item" onClick={() => handleSelect(r)}>
              {r.display_name}
            </button>
          ))}
        </div>
      )}

      {showHistory && searchHistory && searchHistory.length > 0 && !open && (
        <div className="absolute z-50 w-full mt-2 glass-card !p-2 space-y-1 max-h-60 overflow-y-auto">
          <div className="px-3 py-1.5 text-xs font-medium flex items-center gap-1.5" style={{ color: "var(--text-muted)" }}>
            <Clock size={11} /> Recent searches
          </div>
          {searchHistory.slice(0, 6).map((entry) => (
            <button
              key={entry.timestamp}
              className="dropdown-item flex items-center justify-between"
              onClick={() => { if (timer.current) clearTimeout(timer.current); onHistoryClick?.(entry); setQ(entry.address); setShowHistory(false); }}
            >
              <span className="truncate">{entry.address}</span>
              {entry.zone && <span className="text-xs shrink-0 ml-2" style={{ color: "var(--accent)", opacity: 0.6 }}>{entry.zone}</span>}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
