"use client";
import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { HardHat, ChevronDown, ChevronUp, MapPin } from "lucide-react";

/* eslint-disable @typescript-eslint/no-explicit-any */

interface CDCResult {
  address: string;
  status: string;
  type: string[];
  costOfDevelopment: number;
  dwellings: number;
  storeys: number;
  lodgementDate: string;
  pan: string;
  lat: number;
  lng: number;
  distance: number;
}

const STATUS_COLORS: Record<string, string> = {
  Determined: "bg-emerald-500/20 text-emerald-300",
  "Under Assessment": "bg-yellow-500/20 text-yellow-300",
  Rejected: "bg-red-500/20 text-red-300",
  Withdrawn: "bg-slate-500/20 text-slate-400",
  Registered: "bg-cyan-500/20 text-cyan-300",
};

function getStatusColor(status: string): string {
  for (const [key, val] of Object.entries(STATUS_COLORS)) {
    if (status.toLowerCase().includes(key.toLowerCase())) return val;
  }
  return "bg-slate-500/20 text-slate-400";
}

function formatAUD(n: number): string {
  if (!n) return "";
  return new Intl.NumberFormat("en-AU", { style: "currency", currency: "AUD", maximumFractionDigits: 0 }).format(n);
}

function formatDate(d: string): string {
  if (!d) return "";
  try {
    return new Date(d).toLocaleDateString("en-AU", { day: "numeric", month: "short", year: "numeric" });
  } catch {
    return d;
  }
}

export default function NearbyCDCCard({ lat, lng }: { lat: number; lng: number }) {
  const [cdcs, setCdcs] = useState<CDCResult[]>([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState(false);

  useEffect(() => {
    setLoading(true);
    fetch(`/api/cdc?lat=${lat}&lng=${lng}`)
      .then((r) => r.json())
      .then((d) => setCdcs(d.results || []))
      .catch(() => setCdcs([]))
      .finally(() => setLoading(false));
  }, [lat, lng]);

  const visible = expanded ? cdcs : cdcs.slice(0, 5);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="glass-card col-span-1 md:col-span-2"
    >
      <div className="flex items-center gap-3 mb-1">
        <HardHat className="text-emerald-400" size={22} />
        <h2 className="text-lg font-semibold text-white">🏗️ Fast-Track Approvals Nearby (CDC)</h2>
      </div>
      <p className="text-slate-400 text-sm mb-4">
        Complying Development Certificates — projects approved without full council review
      </p>

      {loading ? (
        <div className="text-slate-500 text-sm py-6 text-center">Loading nearby CDCs…</div>
      ) : cdcs.length === 0 ? (
        <div className="text-slate-500 text-sm py-6 text-center">No CDCs found within 1km</div>
      ) : (
        <>
          <div className="flex gap-3 mb-4 flex-wrap">
            <div className="px-3 py-1.5 rounded-lg bg-white/[0.03] border border-white/[0.06] text-sm">
              <span className="text-slate-400">Total nearby:</span>{" "}
              <span className="text-white font-semibold">{cdcs.length}</span>
            </div>
            {(() => {
              const totalValue = cdcs.reduce((sum, c) => sum + (c.costOfDevelopment || 0), 0);
              const determined = cdcs.filter(c => c.status.toLowerCase().includes("determined")).length;
              const approvalRate = cdcs.length > 0 ? Math.round((determined / cdcs.length) * 100) : 0;
              const typeCounts: Record<string, number> = {};
              cdcs.forEach(c => { const t = Array.isArray(c.type) ? c.type.join(", ") : (c.type || "Unknown"); typeCounts[t] = (typeCounts[t] || 0) + 1; });
              const mostCommon = Object.entries(typeCounts).sort((a, b) => b[1] - a[1])[0];
              return (
                <>
                  {totalValue > 0 && (
                    <div className="px-3 py-1.5 rounded-lg bg-blue-500/10 border border-blue-500/20 text-sm">
                      <span className="text-blue-300/70">Total value:</span>{" "}
                      <span className="text-blue-300 font-semibold">{formatAUD(totalValue)}</span>
                    </div>
                  )}
                  <div className="px-3 py-1.5 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-sm">
                    <span className="text-emerald-300/70">Determined:</span>{" "}
                    <span className="text-emerald-300 font-semibold">{determined}</span>
                  </div>
                  <div className="px-3 py-1.5 rounded-lg bg-purple-500/10 border border-purple-500/20 text-sm">
                    <span className="text-purple-300/70">Approval rate:</span>{" "}
                    <span className="text-purple-300 font-semibold">{approvalRate}%</span>
                  </div>
                  {mostCommon && (
                    <div className="px-3 py-1.5 rounded-lg bg-white/[0.03] border border-white/[0.06] text-sm">
                      <span className="text-slate-400">Most common:</span>{" "}
                      <span className="text-white font-semibold truncate">{mostCommon[0]}</span>
                    </div>
                  )}
                </>
              );
            })()}
          </div>

          <div className="space-y-3">
            {visible.map((cdc, i) => (
              <motion.div
                key={cdc.pan || i}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.03 }}
                className="p-3 rounded-xl bg-white/[0.02] border border-white/[0.05] hover:border-emerald-500/20 transition-colors"
              >
                <div className="flex items-start justify-between gap-2 mb-2">
                  <div className="font-medium text-white text-sm leading-snug">{cdc.address}</div>
                  <span className={`shrink-0 text-xs px-2 py-0.5 rounded-full font-medium ${getStatusColor(cdc.status)}`}>
                    {cdc.status}
                  </span>
                </div>
                <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-400">
                  <span className="flex items-center gap-1">
                    <MapPin size={11} /> {cdc.distance}m away
                  </span>
                  {cdc.type?.length > 0 && <span>{Array.isArray(cdc.type) ? cdc.type.join(", ") : cdc.type}</span>}
                  {cdc.costOfDevelopment > 0 && <span>{formatAUD(cdc.costOfDevelopment)}</span>}
                  {cdc.dwellings > 0 && <span>🏠 {cdc.dwellings} dwellings</span>}
                  {cdc.storeys > 0 && <span>🏢 {cdc.storeys} storeys</span>}
                  {cdc.lodgementDate && <span>📅 {formatDate(cdc.lodgementDate)}</span>}
                </div>
                {cdc.pan && <div className="text-[10px] text-slate-500 mt-1">PAN: {cdc.pan}</div>}
              </motion.div>
            ))}
          </div>

          {cdcs.length > 5 && (
            <button
              onClick={() => setExpanded(!expanded)}
              className="flex items-center gap-1.5 mt-3 text-emerald-400 text-sm hover:text-emerald-300 transition"
            >
              {expanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
              {expanded ? "Show less" : `Show all ${cdcs.length}`}
            </button>
          )}
        </>
      )}
    </motion.div>
  );
}
