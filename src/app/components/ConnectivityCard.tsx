"use client";
import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Train, Bus, GraduationCap, ShoppingBag, Stethoscope, TreePine, UtensilsCrossed, Wifi, ChevronDown, ChevronUp } from "lucide-react";

interface AmenityItem { type: string; name: string; distance: number }

interface ConnectivityData {
  score: number;
  summary: Record<string, AmenityItem[]>;
  counts: Record<string, number>;
}

const ICONS: Record<string, React.ReactNode> = {
  train: <Train size={14} className="text-blue-400" />,
  bus: <Bus size={14} className="text-yellow-400" />,
  school: <GraduationCap size={14} className="text-purple-400" />,
  shopping: <ShoppingBag size={14} className="text-pink-400" />,
  medical: <Stethoscope size={14} className="text-red-400" />,
  park: <TreePine size={14} className="text-green-400" />,
  dining: <UtensilsCrossed size={14} className="text-orange-400" />,
};

const LABELS: Record<string, string> = {
  train: "Train/Metro Stations",
  bus: "Bus Stops",
  school: "Schools",
  shopping: "Shopping",
  medical: "Medical",
  park: "Parks",
  dining: "Dining",
};

function ScoreRing({ score }: { score: number }) {
  const pct = (score / 10) * 100;
  const color = score >= 7 ? "#10B981" : score >= 4 ? "#F59E0B" : "#EF4444";
  const r = 36;
  const circ = 2 * Math.PI * r;
  const offset = circ - (pct / 100) * circ;

  return (
    <div className="relative w-24 h-24 flex-shrink-0">
      <svg width="96" height="96" className="-rotate-90">
        <circle cx="48" cy="48" r={r} fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth="6" />
        <motion.circle
          cx="48" cy="48" r={r} fill="none" stroke={color} strokeWidth="6"
          strokeLinecap="round"
          strokeDasharray={circ}
          initial={{ strokeDashoffset: circ }}
          animate={{ strokeDashoffset: offset }}
          transition={{ duration: 1.2, ease: "easeOut" }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-xl font-bold text-white">{score}</span>
        <span className="text-[10px] text-slate-400">/10</span>
      </div>
    </div>
  );
}

export default function ConnectivityCard({ lat, lng }: { lat: number; lng: number }) {
  const [data, setData] = useState<ConnectivityData | null>(null);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState(false);

  const [error, setError] = useState(false);

  useEffect(() => {
    setLoading(true);
    setError(false);
    fetch(`/api/connectivity?lat=${lat}&lng=${lng}`)
      .then(r => r.json())
      .then(d => { 
        if (d.error) { setError(true); } else { setData(d); }
        setLoading(false); 
      })
      .catch(() => { setError(true); setLoading(false); });
  }, [lat, lng]);

  if (loading) {
    return (
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}
        className="glass-card col-span-1 md:col-span-2">
        <div className="flex items-center gap-2 mb-3">
          <Wifi className="text-emerald-400" size={20} />
          <h3 className="font-semibold text-white text-lg">Connectivity</h3>
        </div>
        <div className="flex items-center gap-2 text-slate-400 text-sm">
          <div className="w-4 h-4 border-2 border-emerald-400 border-t-transparent rounded-full animate-spin" />
          Scanning nearby amenities...
        </div>
      </motion.div>
    );
  }

  if (error || !data || data.score === undefined) {
    return (
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}
        className="glass-card col-span-1 md:col-span-2">
        <div className="flex items-center gap-2 mb-3">
          <Wifi className="text-emerald-400" size={20} />
          <h3 className="font-semibold text-white text-lg">Connectivity</h3>
        </div>
        <p className="text-sm text-slate-400">Unable to load connectivity data — the OpenStreetMap service may be temporarily busy. Try refreshing.</p>
      </motion.div>
    );
  }

  const label = data.score >= 8 ? "Excellent" : data.score >= 6 ? "Good" : data.score >= 4 ? "Moderate" : "Limited";

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}
      className="glass-card col-span-1 md:col-span-2">
      <div className="flex items-center gap-2 mb-4">
        <Wifi className="text-emerald-400" size={20} />
        <h3 className="font-semibold text-white text-lg">Connectivity</h3>
      </div>

      <div className="flex items-start gap-6">
        <ScoreRing score={data.score} />
        <div className="flex-1 min-w-0">
          <p className="text-lg font-semibold text-white mb-1">{label} Connectivity</p>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {Object.entries(data.counts).map(([type, count]) => (
              <div key={type} className="flex items-center gap-1.5 text-sm text-slate-300">
                {ICONS[type]}
                <span>{count} {LABELS[type] || type}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Expandable detail */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="mt-4 flex items-center gap-1 text-xs text-emerald-400 hover:text-emerald-300 transition"
      >
        {expanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
        {expanded ? "Hide details" : "Show nearby amenities"}
      </button>

      {expanded && (
        <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} className="mt-3 space-y-3">
          {Object.entries(data.summary).map(([type, items]) => {
            if (!items.length) return null;
            return (
              <div key={type}>
                <div className="flex items-center gap-1.5 mb-1">
                  {ICONS[type]}
                  <span className="text-xs font-medium text-slate-300">{LABELS[type] || type}</span>
                </div>
                <div className="space-y-0.5">
                  {items.map((item, i) => (
                    <div key={i} className="flex justify-between text-xs text-slate-400 pl-5">
                      <span className="truncate mr-2">{item.name}</span>
                      <span className="text-slate-500 whitespace-nowrap">{item.distance}m</span>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </motion.div>
      )}
    </motion.div>
  );
}
