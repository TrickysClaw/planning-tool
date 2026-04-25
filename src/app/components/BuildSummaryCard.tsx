"use client";
import { motion } from "framer-motion";
import { Building2, AlertTriangle, Flame, Droplets, Landmark, TrendingUp } from "lucide-react";

/* eslint-disable @typescript-eslint/no-explicit-any */

const ZONE_DESCRIPTIONS: Record<string, string> = {
  R1: "Large lot residential — houses only, no subdividing below minimum lot size",
  R2: "Low density — houses, duplexes, granny flats, home businesses",
  R3: "Medium density — townhouses, villas, manor houses, plus everything R2 allows",
  R4: "High density — apartment buildings, plus everything R3 allows",
  R5: "Large lot / rural residential",
  B1: "Local/neighbourhood centre — shops, offices, and some residential above",
  B2: "Local/neighbourhood centre — shops, offices, and some residential above",
  B4: "Mixed use — residential, commercial, retail all permitted",
  B6: "Enterprise corridor — commercial, light industrial, some residential",
  MU1: "Mixed use — residential, commercial, retail all permitted",
  E1: "Environmental/conservation — very restricted development",
  E2: "Environmental/conservation — very restricted development",
  E3: "Environmental/conservation — very restricted development",
  C1: "Environmental/conservation — very restricted development",
  C2: "Environmental/conservation — very restricted development",
  C3: "Environmental/conservation — very restricted development",
  C4: "Environmental/conservation — very restricted development",
  IN1: "Industrial — no residential",
  IN2: "Industrial — no residential",
  SP1: "Special purpose",
  SP2: "Special purpose",
  RE1: "Recreation — very limited development",
  RE2: "Recreation — very limited development",
  W1: "Waterway — no development",
  W2: "Waterway — no development",
};

// E4 can be both industrial or environmental depending on context; treat as industrial per spec
const ZONE_DESCRIPTIONS_E4 = "Industrial — no residential";

function getZoneDescription(code: string): string {
  const base = code?.replace(/\s.*/, "") || "";
  if (base === "E4") return ZONE_DESCRIPTIONS_E4;
  return ZONE_DESCRIPTIONS[base] || "Check with council for permitted uses";
}

type Potential = "green" | "amber" | "red";

function getDevelopmentPotential(zoneCode: string, fsr: number, heritage: boolean, bushfire: boolean, flood: boolean): Potential {
  const base = zoneCode?.replace(/\s.*/, "") || "";
  
  // Red conditions
  if (heritage && flood && bushfire) return "red";
  if (["E1","E2","E3","E4","C1","C2","C3","C4","RE1","RE2","W1","W2"].includes(base)) return "red";
  if (heritage) return "red";
  if (flood && bushfire) return "red";
  
  // Green conditions
  if (["R3","R4","B4","MU1"].includes(base) && fsr > 1.0) return "green";
  
  // Amber conditions
  if (["R2","B1","B2"].includes(base) && fsr >= 0.5 && fsr <= 1.0) return "amber";
  
  // Default based on zone
  if (["R3","R4","B4","MU1"].includes(base)) return "green";
  if (["R1","R2","R5","B1","B2","B6","IN1","IN2","SP1","SP2"].includes(base)) return "amber";
  
  return "amber";
}

const POTENTIAL_CONFIG = {
  green: { label: "High Development Potential", bg: "bg-emerald-500/15", border: "border-emerald-500/30", text: "text-emerald-400", dot: "bg-emerald-400" },
  amber: { label: "Moderate Development Potential", bg: "bg-amber-500/15", border: "border-amber-500/30", text: "text-amber-400", dot: "bg-amber-400" },
  red: { label: "Restricted Development", bg: "bg-red-500/15", border: "border-red-500/30", text: "text-red-400", dot: "bg-red-400" },
};

interface Props {
  data: any;
}

export default function BuildSummaryCard({ data }: Props) {
  const { planning, hazard, cadastre } = data;
  const results = planning?.results || [];
  const find = (name: string) => results.find((r: any) => r.layerName === name)?.attributes || {};

  const zoning = find("Land Zoning");
  const height = find("Height of Building");
  const fsr = find("Floor Space Ratio");
  const lotSizeData = find("Lot Size");
  const heritage = find("Heritage");
  const cad = cadastre?.features?.[0]?.attributes || {};
  const bush = hazard?.bushfire?.features || [];
  const flood = hazard?.flood?.features || [];

  const zoneCode = zoning.SYM_CODE || "";
  const zoneName = zoning.LAY_CLASS || "";
  const heightM = parseFloat(height.MAX_B_H);
  const fsrNum = parseFloat(fsr.FSR);
  const lotArea = cad.lot_area || cad.shape_area || 600;
  const hasHeritage = !!heritage.HER_NAME;
  const hasBushfire = bush.length > 0;
  const hasFlood = flood.length > 0;

  const storeys = !isNaN(heightM) ? Math.floor(heightM / 3) : null;
  const maxGFA = !isNaN(fsrNum) ? Math.round(fsrNum * 600) : null;
  const potential = getDevelopmentPotential(zoneCode, isNaN(fsrNum) ? 0 : fsrNum, hasHeritage, hasBushfire, hasFlood);
  const config = POTENTIAL_CONFIG[potential];

  const warnings = [];
  if (hasHeritage) warnings.push({ icon: <Landmark size={16} />, text: "Heritage listed — significant constraints on alterations", color: "text-red-400" });
  if (hasBushfire) warnings.push({ icon: <Flame size={16} />, text: "Bushfire prone land — BAL assessment required, construction costs increase", color: "text-amber-400" });
  if (hasFlood) warnings.push({ icon: <Droplets size={16} />, text: "Flood affected — floor levels must be above flood planning level", color: "text-amber-400" });

  if (!zoneCode) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="max-w-6xl mx-auto"
    >
      <div className="glass-card">
        <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
          <div className="flex items-center gap-3">
            <Building2 className="text-emerald-400" size={24} />
            <h2 className="text-xl font-bold text-white">What Can I Build Here?</h2>
          </div>
          <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full ${config.bg} border ${config.border}`}>
            <span className={`w-2.5 h-2.5 rounded-full ${config.dot}`} />
            <span className={`text-sm font-medium ${config.text}`}>{config.label}</span>
          </div>
        </div>

        {/* Zone summary */}
        <div className="p-4 rounded-xl bg-white/[0.03] border border-white/[0.06] mb-4">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-2xl font-bold text-emerald-400">{zoneCode}</span>
            <span className="text-slate-300 font-medium">{zoneName}</span>
          </div>
          <p className="text-slate-300 leading-relaxed">{getZoneDescription(zoneCode)}</p>
        </div>

        {/* Key metrics */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-4">
          {storeys !== null && (
            <div className="p-3 rounded-xl bg-white/[0.02] border border-white/[0.05]">
              <p className="text-xs text-slate-400 mb-1">Maximum Height</p>
              <p className="text-lg font-bold text-white">{heightM}m <span className="text-sm font-normal text-slate-400">(~{storeys} storeys)</span></p>
            </div>
          )}
          {maxGFA !== null && (
            <div className="p-3 rounded-xl bg-white/[0.02] border border-white/[0.05]">
              <p className="text-xs text-slate-400 mb-1">Floor Space Ratio</p>
              <p className="text-lg font-bold text-white">{fsr.FSR}:1</p>
              <p className="text-xs text-slate-400">On a 600m² lot, you could build up to {maxGFA.toLocaleString()}m² of floor area</p>
            </div>
          )}
          {lotSizeData.LOT_SIZE && (
            <div className="p-3 rounded-xl bg-white/[0.02] border border-white/[0.05]">
              <p className="text-xs text-slate-400 mb-1">Minimum Lot Size</p>
              <p className="text-lg font-bold text-white">{parseFloat(lotSizeData.LOT_SIZE).toLocaleString()}m²</p>
            </div>
          )}
        </div>

        {/* Warnings */}
        {warnings.length > 0 && (
          <div className="space-y-2">
            {warnings.map((w, i) => (
              <div key={i} className="flex items-center gap-3 p-3 rounded-xl bg-red-500/5 border border-red-500/10">
                <AlertTriangle className={w.color} size={18} />
                <span className={`text-sm ${w.color}`}>{w.text}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </motion.div>
  );
}
