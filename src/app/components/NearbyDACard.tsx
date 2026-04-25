"use client";
import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { ClipboardList, ChevronDown, ChevronUp, MapPin } from "lucide-react";

/* eslint-disable @typescript-eslint/no-explicit-any */

interface DAResult {
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
  "On Exhibition": "bg-blue-500/20 text-blue-300",
  Withdrawn: "bg-slate-500/20 text-slate-400",
  Registered: "bg-cyan-500/20 text-cyan-300",
  "Additional Information Requested": "bg-orange-500/20 text-orange-300",
  Deferred: "bg-purple-500/20 text-purple-300",
  Pending: "bg-slate-500/20 text-slate-400",
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

export default function NearbyDACard({
  lat,
  lng,
  onDAs,
}: {
  lat: number;
  lng: number;
  onDAs?: (das: DAResult[]) => void;
}) {
  const [das, setDas] = useState<DAResult[]>([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState(false);

  useEffect(() => {
    setLoading(true);
    fetch(`/api/da?lat=${lat}&lng=${lng}`)
      .then((r) => r.json())
      .then((d) => {
        const results = d.results || [];
        setDas(results);
        onDAs?.(results);
      })
      .catch(() => setDas([]))
      .finally(() => setLoading(false));
  }, [lat, lng, onDAs]);

  const underAssessment = das.filter((d) => d.status.toLowerCase().includes("assessment")).length;
  const determined = das.filter((d) => d.status.toLowerCase().includes("determined")).length;
  const visible = expanded ? das : das.slice(0, 5);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="glass-card col-span-1 md:col-span-2"
    >
      <div className="flex items-center gap-3 mb-1">
        <ClipboardList className="text-emerald-400" size={22} />
        <h2 className="text-lg font-semibold text-white">📋 Nearby Development Applications</h2>
      </div>
      <p className="text-slate-400 text-sm mb-4">
        What&apos;s being built or proposed near you — applications lodged with council
      </p>

      {loading ? (
        <div className="text-slate-500 text-sm py-6 text-center">Loading nearby DAs…</div>
      ) : das.length === 0 ? (
        <div className="text-slate-500 text-sm py-6 text-center">No development applications found within 1km</div>
      ) : (
        <>
          {/* Summary stats */}
          <div className="flex gap-3 mb-4 flex-wrap">
            <div className="px-3 py-1.5 rounded-lg bg-white/[0.03] border border-white/[0.06] text-sm">
              <span className="text-slate-400">Total nearby:</span>{" "}
              <span className="text-white font-semibold">{das.length}</span>
            </div>
            <div className="px-3 py-1.5 rounded-lg bg-yellow-500/10 border border-yellow-500/20 text-sm">
              <span className="text-yellow-300/70">Under assessment:</span>{" "}
              <span className="text-yellow-300 font-semibold">{underAssessment}</span>
            </div>
            <div className="px-3 py-1.5 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-sm">
              <span className="text-emerald-300/70">Determined:</span>{" "}
              <span className="text-emerald-300 font-semibold">{determined}</span>
            </div>
            {(() => {
              const totalValue = das.reduce((sum, d) => sum + (d.costOfDevelopment || 0), 0);
              const approvalRate = das.length > 0 ? Math.round((determined / das.length) * 100) : 0;
              const typeCounts: Record<string, number> = {};
              das.forEach(d => { const t = Array.isArray(d.type) ? d.type.join(", ") : (d.type || "Unknown"); typeCounts[t] = (typeCounts[t] || 0) + 1; });
              const mostCommon = Object.entries(typeCounts).sort((a, b) => b[1] - a[1])[0];
              return (
                <>
                  {totalValue > 0 && (
                    <div className="px-3 py-1.5 rounded-lg bg-blue-500/10 border border-blue-500/20 text-sm">
                      <span className="text-blue-300/70">Total value:</span>{" "}
                      <span className="text-blue-300 font-semibold">{formatAUD(totalValue)}</span>
                    </div>
                  )}
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
            {visible.map((da, i) => (
              <motion.div
                key={da.pan || i}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.03 }}
                className="p-3 rounded-xl bg-white/[0.02] border border-white/[0.05] hover:border-emerald-500/20 transition-colors"
              >
                <div className="flex items-start justify-between gap-2 mb-2">
                  <div className="font-medium text-white text-sm leading-snug">{da.address}</div>
                  <span className={`shrink-0 text-xs px-2 py-0.5 rounded-full font-medium ${getStatusColor(da.status)}`}>
                    {da.status}
                  </span>
                </div>
                <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-400">
                  <span className="flex items-center gap-1">
                    <MapPin size={11} /> {da.distance}m away
                  </span>
                  {da.type?.length > 0 && <span>{Array.isArray(da.type) ? da.type.join(", ") : da.type}</span>}
                  {da.costOfDevelopment > 0 && <span>{formatAUD(da.costOfDevelopment)}</span>}
                  {da.dwellings > 0 && <span>🏠 {da.dwellings} dwellings</span>}
                  {da.storeys > 0 && <span>🏢 {da.storeys} storeys</span>}
                  {da.lodgementDate && <span>📅 {formatDate(da.lodgementDate)}</span>}
                </div>
                {da.pan && <div className="text-[10px] text-slate-500 mt-1">PAN: {da.pan}</div>}
              </motion.div>
            ))}
          </div>

          {das.length > 5 && (
            <button
              onClick={() => setExpanded(!expanded)}
              className="flex items-center gap-1.5 mt-3 text-emerald-400 text-sm hover:text-emerald-300 transition"
            >
              {expanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
              {expanded ? "Show less" : `Show all ${das.length}`}
            </button>
          )}
        </>
      )}
    </motion.div>
  );
}
