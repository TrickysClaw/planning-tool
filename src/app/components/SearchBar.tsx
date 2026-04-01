"use client";
import { useState, useEffect, useRef, useCallback } from "react";
import { Search, X } from "lucide-react";

interface GeoResult { display_name: string; lat: string; lon: string }

export default function SearchBar({ onSelect }: { onSelect: (r: GeoResult) => void }) {
  const [q, setQ] = useState("");
  const [results, setResults] = useState<GeoResult[]>([]);
  const [open, setOpen] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout>>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Close dropdown on click outside
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  // Debounced search
  useEffect(() => {
    if (q.length < 3) { setResults([]); setOpen(false); return; }
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
  }, [onSelect]);

  const handleClear = useCallback(() => {
    setQ("");
    setResults([]);
    setOpen(false);
  }, []);

  return (
    <div className="relative w-full max-w-2xl mx-auto" ref={containerRef}>
      <div className="flex items-center glass-card !p-3 gap-3">
        <Search className="text-emerald-400 shrink-0" size={24} />
        <input
          className="bg-transparent outline-none w-full text-lg text-white placeholder-slate-500"
          placeholder="Search any NSW address... (e.g. 100 Fairway Drive, Norwest)"
          value={q}
          onChange={e => setQ(e.target.value)}
          onFocus={() => results.length > 0 && setOpen(true)}
          onKeyDown={e => {
            if (e.key === "Escape") setOpen(false);
            if (e.key === "Enter" && results.length > 0) handleSelect(results[0]);
          }}
        />
        {q && (
          <button onClick={handleClear} className="text-slate-500 hover:text-white transition">
            <X size={18} />
          </button>
        )}
      </div>
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
    </div>
  );
}
