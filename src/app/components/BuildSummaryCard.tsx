"use client";
import { motion } from "framer-motion";
import { Building2, AlertTriangle, Flame, Droplets, Landmark, TrendingUp, Mountain, FlaskConical, Info } from "lucide-react";

/* eslint-disable @typescript-eslint/no-explicit-any */

const ZONE_DESCRIPTIONS: Record<string, string> = {
  R1: "Large lot residential - houses only, no subdividing below minimum lot size",
  R2: "Low density - houses, duplexes, granny flats, home businesses",
  R3: "Medium density - townhouses, villas, manor houses, plus everything R2 allows",
  R4: "High density - apartment buildings, plus everything R3 allows",
  R5: "Large lot / rural residential",
  B1: "Local/neighbourhood centre - shops, offices, and some residential above",
  B2: "Local/neighbourhood centre - shops, offices, and some residential above",
  B4: "Mixed use - residential, commercial, retail all permitted",
  B6: "Enterprise corridor - commercial, light industrial, some residential",
  MU1: "Mixed use - residential, commercial, retail all permitted",
  E1: "Environmental/conservation - very restricted development",
  E2: "Environmental/conservation - very restricted development",
  E3: "Environmental/conservation - very restricted development",
  C1: "Environmental/conservation - very restricted development",
  C2: "Environmental/conservation - very restricted development",
  C3: "Environmental/conservation - very restricted development",
  C4: "Environmental/conservation - very restricted development",
  IN1: "Industrial - no residential",
  IN2: "Industrial - no residential",
  SP1: "Special purpose",
  SP2: "Special purpose",
  RE1: "Recreation - very limited development",
  RE2: "Recreation - very limited development",
  W1: "Waterway - no development",
  W2: "Waterway - no development",
};

function getZoneDescription(code: string): string {
  const base = code?.replace(/\s.*/, "") || "";
  if (base === "E4") return "Industrial - no residential";
  return ZONE_DESCRIPTIONS[base] || "Check with council for permitted uses";
}

type Potential = "green" | "amber" | "red";

function getDevelopmentPotential(zoneCode: string, fsr: number, heritage: boolean, bushfire: boolean, flood: boolean): Potential {
  const base = zoneCode?.replace(/\s.*/, "") || "";

  if (heritage && flood && bushfire) return "red";
  if (["E1", "E2", "E3", "E4", "C1", "C2", "C3", "C4", "RE1", "RE2", "W1", "W2"].includes(base)) return "red";
  if (heritage) return "red";
  if (flood && bushfire) return "red";

  if (["R3", "R4", "B4", "MU1"].includes(base) && fsr > 1.0) return "green";
  if (["R2", "B1", "B2"].includes(base) && fsr >= 0.5 && fsr <= 1.0) return "amber";

  if (["R3", "R4", "B4", "MU1"].includes(base)) return "green";
  if (["R1", "R2", "R5", "B1", "B2", "B6", "IN1", "IN2", "SP1", "SP2"].includes(base)) return "amber";

  return "amber";
}

const POTENTIAL_CONFIG = {
  green: { label: "High Development Potential", bg: "var(--badge-green-bg)", border: "var(--badge-green)", text: "var(--badge-green)" },
  amber: { label: "Moderate Development Potential", bg: "var(--badge-amber-bg)", border: "var(--badge-amber)", text: "var(--badge-amber)" },
  red: { label: "Restricted Development", bg: "var(--badge-red-bg)", border: "var(--badge-red)", text: "var(--badge-red)" },
};

export default function BuildSummaryCard({ data }: { data: any }) {
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
  const landslide = hazard?.landslide?.features || [];
  const acidSulfate = hazard?.acidSulfate || [];

  const zoneCode = zoning.SYM_CODE || "";
  const zoneName = zoning.LAY_CLASS || "";
  const heightM = parseFloat(height.MAX_B_H);
  const fsrNum = parseFloat(fsr.FSR);
  const lotArea = cad.computedArea || cad.planlotarea || 0;
  const hasHeritage = !!heritage.H_NAME;
  const isHeritageItem = heritage.LAY_CLASS?.includes("Item");
  const isHCA = heritage.LAY_CLASS?.includes("Conservation Area");
  const heritageSig = heritage.SIG || "";
  const hasBushfire = bush.length > 0;
  const hasFlood = flood.length > 0;
  const hasLandslide = landslide.length > 0;
  const hasAcidSulfate = acidSulfate.length > 0;

  const storeys = !isNaN(heightM) ? Math.floor(heightM / 3) : null;
  const effectiveLot = lotArea > 0 ? Math.round(lotArea) : 600;
  const maxGFA = !isNaN(fsrNum) ? Math.round(fsrNum * effectiveLot) : null;
  const potential = getDevelopmentPotential(zoneCode, isNaN(fsrNum) ? 0 : fsrNum, hasHeritage, hasBushfire, hasFlood);
  const config = POTENTIAL_CONFIG[potential];

  const warnings = [];
  if (hasHeritage) {
    const label = isHeritageItem
      ? `Heritage Item - ${heritage.H_NAME}`
      : isHCA
      ? `Heritage Conservation Area - ${heritage.H_NAME}`
      : `Heritage listed - ${heritage.H_NAME}`;
    const sig = heritageSig ? ` (${heritageSig} significance)` : "";
    const advice = isHeritageItem
      ? " - major constraints on external changes"
      : " - new builds must match neighbourhood character";
    warnings.push({ icon: <Landmark size={16} />, text: `${label}${sig}${advice}`, cssVar: "var(--danger)" });
  }
  if (hasBushfire) warnings.push({ icon: <Flame size={16} />, text: `Bushfire prone${bush[0]?.attributes?.CATEGORY ? ` (${bush[0].attributes.CATEGORY})` : ""} - BAL assessment required`, cssVar: "var(--warning)" });
  if (hasFlood) {
    warnings.push({ icon: <Droplets size={16} />, text: "Flood affected - floor levels must be above flood planning level", cssVar: "var(--warning)" });
  } else if (!hazard?.floodDataAvailable) {
    warnings.push({ icon: <Info size={16} />, text: "Flood data unavailable for this council - check with your local council for flood information", cssVar: "var(--text-muted)" });
  }
  if (hasLandslide) warnings.push({ icon: <Mountain size={16} />, text: "Landslide risk area - geotechnical report required", cssVar: "var(--warning)" });
  if (hasAcidSulfate) warnings.push({ icon: <FlaskConical size={16} />, text: `Acid sulfate soils - ${acidSulfate[0]?.attributes?.LABEL || "management plan required"}`, cssVar: "var(--warning)" });

  if (!zoneCode) return null;

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
      <div className="glass-card">
        <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
          <div className="flex items-center gap-3">
            <Building2 size={24} style={{ color: "var(--accent)" }} />
            <h2 className="text-xl font-bold" style={{ color: "var(--text-primary)" }}>What Can I Build Here?</h2>
          </div>
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg" style={{ background: config.bg, border: `1px solid ${config.border}` }} title={potential === "green" ? "Zone and controls favour development" : potential === "amber" ? "Some constraints may limit development" : "Significant constraints restrict development"}>
            <span className="w-2 h-2 rounded-full" style={{ background: config.text }} />
            <span className="text-xs font-medium tracking-wide" style={{ color: config.text }}>{config.label}</span>
          </div>
        </div>

        <div className="p-4 rounded-xl mb-4" style={{ background: "var(--bg-sunken)", border: "1px solid var(--border)" }}>
          <div className="flex items-center gap-2 mb-2">
            <span className="text-2xl font-bold" style={{ color: "var(--accent)" }}>{zoneCode}</span>
            <span className="font-medium" style={{ color: "var(--text-secondary)" }}>{zoneName}</span>
          </div>
          <p style={{ color: "var(--text-secondary)" }} className="leading-relaxed">{getZoneDescription(zoneCode)}</p>
        </div>

        {/* Key metrics inline */}
        <div className="flex flex-wrap gap-4 text-sm mb-4" style={{ color: "var(--text-secondary)" }}>
          {storeys !== null && <span title="Maximum building height allowed under the LEP">↕ {heightM}m (~{storeys} storeys)</span>}
          {maxGFA !== null && <span title="Floor Space Ratio - total floor area relative to lot size">📐 FSR {fsr.FSR}:1 → {maxGFA.toLocaleString()}m² max</span>}
          {lotArea > 0 && <span title="Lot area from cadastral records">📏 Lot: {effectiveLot.toLocaleString()}m²</span>}
        </div>

        {warnings.length > 0 && (
          <div className="space-y-2">
            {warnings.map((w, i) => (
              <div key={i} className="flex items-center gap-3 p-3 rounded-xl" style={{ background: "var(--danger-bg)", border: "1px solid var(--danger-border)" }}>
                <AlertTriangle size={18} style={{ color: w.cssVar }} />
                <span className="text-sm" style={{ color: w.cssVar }}>{w.text}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </motion.div>
  );
}
