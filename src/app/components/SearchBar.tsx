"use client";
import { useState, useEffect, useRef } from "react";
import { Search } from "lucide-react";

interface GeoResult { display_name: string; lat: string; lon: string }

export default function SearchBar({ onSelect }: { onSelect: (r: GeoResult) => void }) {
  const [q, setQ] = useState("");
  const [results, setResults] = useState<GeoResult[]>([]);
  const [open, setOpen] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout>>(null);

  useEffect(() => {
    if (q.length < 3) { setResults([]); return; }
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(async () => {
      const res = await fetch(`/api/geocode?q=${encodeURIComponent(q)}`);
      const data = await res.json();
      setResults(data);
      setOpen(true);
    }, 350);
  }, [q]);

  return (
    <div className="relative w-full max-w-2xl mx-auto">
      <div className="flex items-center glass-card !p-3 gap-3">
        <Search className="text-emerald-400 shrink-0" size={24} />
        <input
          className="bg-transparent outline-none w-full text-lg text-white placeholder-slate-500"
          placeholder="Search any NSW address..."
          value={q}
          onChange={e => setQ(e.target.value)}
          onFocus={() => results.length && setOpen(true)}
        />
      </div>
      {open && results.length > 0 && (
        <div className="absolute z-50 w-full mt-2 glass-card !p-2 space-y-1 max-h-60 overflow-y-auto">
          {results.map((r, i) => (
            <button
              key={i}
              className="w-full text-left px-3 py-2 rounded-lg hover:bg-emerald-500/10 text-sm text-slate-200 transition"
              onClick={() => { onSelect(r); setQ(r.display_name); setOpen(false); }}
            >
              {r.display_name}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
