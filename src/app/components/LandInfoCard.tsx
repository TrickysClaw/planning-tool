"use client";
import { useState } from "react";
import { motion } from "framer-motion";
import {
  MapPin,
  Landmark,
  Flame,
  Droplets,
  Mountain,
  FlaskConical,
  TreePine,
  Plane,
  FileText,
  MapPinned,
  Ruler,
  Move,
  Building2,
  ArrowUpDown,
  Layers,
} from "lucide-react";

/* eslint-disable @typescript-eslint/no-explicit-any */

function Tooltip({ text, children }: { text: string; children: React.ReactNode }) {
  const [show, setShow] = useState(false);
  return (
    <span
      className="relative inline-flex"
      onMouseEnter={() => setShow(true)}
      onMouseLeave={() => setShow(false)}
    >
      {children}
      {show && (
        <span
          className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2.5 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap pointer-events-none z-50"
          style={{
            background: "var(--bg-elevated)",
            border: "1px solid var(--border)",
            color: "var(--text-primary)",
            boxShadow: "0 4px 12px rgba(0,0,0,0.12)",
          }}
        >
          {text}
        </span>
      )}
    </span>
  );
}

const ZONE_DESCRIPTIONS: Record<string, string> = {
  R1: "Large lot residential, houses only",
  R2: "Low density: houses, duplexes, granny flats",
  R3: "Medium density: townhouses, villas, manor houses",
  R4: "High density: apartment buildings",
  R5: "Large lot / rural residential",
  B1: "Local centre: shops, offices, some residential",
  B2: "Local centre: shops, offices, some residential",
  B4: "Mixed use: residential, commercial, retail",
  B6: "Enterprise corridor: commercial, light industrial",
  MU1: "Mixed use: residential, commercial, retail",
  E1: "Conservation, very restricted",
  E2: "Conservation, very restricted",
  E3: "Conservation, very restricted",
  C1: "Conservation, very restricted",
  C2: "Conservation, very restricted",
  C3: "Conservation, very restricted",
  C4: "Conservation, very restricted",
  IN1: "Industrial, no residential",
  IN2: "Industrial, no residential",
  SP1: "Special purpose",
  SP2: "Special purpose",
  RE1: "Recreation, limited development",
  RE2: "Recreation, limited development",
};

export default function LandInfoCard({ data }: { data: any }) {
  const { planning, hazard, cadastre, councilName } = data;
  const results = planning?.results || [];
  const find = (name: string) => results.find((r: any) => r.layerName === name)?.attributes || {};

  const cad = cadastre?.features?.[0]?.attributes || {};
  const zoning = find("Land Zoning");
  const heightData = find("Height of Building");
  const fsrData = find("Floor Space Ratio");
  const lotSizeData = find("Lot Size");
  const heritage = find("Heritage");

  const zoneCode = zoning.SYM_CODE || "";
  const zoneName = zoning.LAY_CLASS || "";
  const heightM = parseFloat(heightData.MAX_B_H);
  const fsrNum = parseFloat(fsrData.FSR);
  const lotArea = cad.computedArea || cad.planlotarea || 0;
  const frontage = cad.lotFrontage;
  const depth = cad.lotDepth;
  const lotDP = cad.lotnumber ? `Lot ${cad.lotnumber} / DP ${cad.plannumber}` : null;
  const lep = zoning.EPI_NAME || null;
  const minLotSize = lotSizeData.LOT_SIZE ? parseFloat(lotSizeData.LOT_SIZE) : null;
  const lga = councilName || zoning.LGA_NAME || null;

  const storeys = !isNaN(heightM) ? Math.floor(heightM / 3) : null;
  const effectiveLot = lotArea > 0 ? Math.round(lotArea) : 600;
  const maxGFA = !isNaN(fsrNum) ? Math.round(fsrNum * effectiveLot) : null;

  const bush = hazard?.bushfire?.features || [];
  const flood = hazard?.flood?.features || [];
  const landslide = hazard?.landslide?.features || [];
  const acidSulfate = hazard?.acidSulfate || [];
  const biodiversity = hazard?.biodiversity || [];
  const airportNoise = hazard?.airportNoise || [];
  const keySites = hazard?.keySites || [];

  const hasHeritage = !!heritage.H_NAME;
  const isHeritageItem = heritage.LAY_CLASS?.includes("Item");
  const isHCA = heritage.LAY_CLASS?.includes("Conservation Area");
  const hasBushfire = bush.length > 0;
  const hasFlood = flood.length > 0;
  const hasLandslide = landslide.length > 0;
  const hasAcidSulfate = acidSulfate.length > 0;
  const hasBiodiversity = biodiversity.length > 0;
  const hasAirportNoise = airportNoise.length > 0;
  const hasKeySite = keySites.length > 0;

  const overlays = [
    {
      icon: <Landmark size={16} />,
      active: hasHeritage,
      tooltip: hasHeritage
        ? isHeritageItem
          ? `${heritage.H_NAME}. Can't demolish or significantly alter without Heritage Council approval`
          : isHCA
          ? `${heritage.H_NAME}. New builds must respect streetscape character, materials & scale`
          : `${heritage.H_NAME}. Additional approvals and design constraints apply`
        : "No heritage listing, no extra heritage approvals needed",
    },
    {
      icon: <Flame size={16} />,
      active: hasBushfire,
      tooltip: hasBushfire
        ? `${bush[0]?.attributes?.CATEGORY || "Mapped"}. Need a BAL rating, fireproof materials & asset protection zone`
        : "Not bushfire prone, no BAL assessment or fire construction needed",
    },
    {
      icon: <Droplets size={16} />,
      active: hasFlood,
      tooltip: hasFlood
        ? "Habitable floors must be built above the Flood Planning Level, may limit basement/ground use"
        : !hazard?.floodDataAvailable
        ? "No flood data for this council, confirm with council directly"
        : "Not flood affected, no floor level restrictions from flooding",
    },
    {
      icon: <Mountain size={16} />,
      active: hasLandslide,
      tooltip: hasLandslide
        ? "Geotech report required before DA, may need piled foundations (+$50-100k)"
        : "No mapped landslide risk, standard foundations likely OK",
    },
    {
      icon: <FlaskConical size={16} />,
      active: hasAcidSulfate,
      tooltip: hasAcidSulfate
        ? `${acidSulfate[0]?.attributes?.LABEL || "Acid sulfate soils present"}. Disturbing soil produces acid, need management plan for earthworks`
        : "No acid sulfate soils, no special earthworks management needed",
    },
    {
      icon: <TreePine size={16} />,
      active: hasBiodiversity,
      tooltip: hasBiodiversity
        ? "Protected habitat. Clearing may be restricted, offsets or ecological assessment needed"
        : "No mapped biodiversity values, no vegetation clearing constraints",
    },
    {
      icon: <Plane size={16} />,
      active: hasAirportNoise,
      tooltip: hasAirportNoise
        ? "Inside ANEF noise contour. Acoustic insulation required, some uses restricted"
        : "Outside airport noise contours, no acoustic requirements",
    },
    {
      icon: <MapPinned size={16} />,
      active: hasKeySite,
      tooltip: hasKeySite
        ? "LEP Key Site. May unlock bonus height, FSR or uses not normally permitted in this zone"
        : "Not a key site, standard zone controls apply",
    },
  ];

  const zoneBase = zoneCode?.replace(/\s.*/, "") || "";
  const zoneDesc = ZONE_DESCRIPTIONS[zoneBase] || "Check with council for permitted uses";
  const zoneTooltip = `${zoneName}. ${zoneDesc}`;

  const metrics = [
    zoneCode && { icon: <Building2 size={13} />, label: "Zone", value: zoneCode, tooltip: zoneTooltip },
    !isNaN(heightM) && { icon: <ArrowUpDown size={13} />, label: "HOB", value: `${heightM}m${storeys ? ` (~${storeys}st)` : ""}`, tooltip: "Tallest any structure can be from ground to roof, roughly 3m per storey" },
    !isNaN(fsrNum) && { icon: <Layers size={13} />, label: "FSR", value: `${fsrData.FSR}:1${maxGFA ? ` → ${maxGFA.toLocaleString()}m²` : ""}`, tooltip: "Total floor area you can build as a multiple of lot size (all storeys combined)" },
    lotArea > 0 && { icon: <Move size={13} />, label: "Lot", value: `${Math.round(lotArea).toLocaleString()}m²`, tooltip: "Total site area from cadastral survey" },
    frontage && { icon: <Ruler size={13} />, label: "Frontage", value: `~${Math.round(frontage)}m`, tooltip: "Width of the lot facing the street" },
    depth && { icon: <Ruler size={13} />, label: "Depth", value: `~${Math.round(depth)}m`, tooltip: "How far the lot extends back from the street" },
    minLotSize && { icon: <Move size={13} />, label: "Min Lot", value: `${minLotSize.toLocaleString()}m²`, tooltip: "Smallest lot allowed after subdivision. Your lot must be 2x this to split" },
    lotDP && { icon: <FileText size={13} />, label: "Lot/DP", value: lotDP, tooltip: "Legal parcel identifier used in contracts and title searches" },
    lga && { icon: <MapPin size={13} />, label: "LGA", value: lga, tooltip: "The council that assesses DAs and sets local planning policy" },
    lep && { icon: <Ruler size={13} />, label: "LEP", value: lep, tooltip: "The legal planning instrument that sets zoning, height and FSR for this land" },
  ].filter(Boolean) as { icon: React.ReactNode; label: string; value: string; tooltip?: string }[];

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }} className="w-full">
      <div
        className="flex items-center gap-0 flex-wrap rounded-xl"
        style={{ background: "var(--bg-sunken)", border: "1px solid var(--border)" }}
      >
        {/* Metrics */}
        <div className="flex items-center gap-x-4 gap-y-1 flex-wrap px-4 py-2.5 flex-1 min-w-0">
          {metrics.map((m, i) => (
            <Tooltip key={i} text={m.tooltip || m.label}>
              <div className="flex items-center gap-1.5 text-xs whitespace-nowrap">
                <span style={{ color: "var(--text-muted)" }}>{m.icon}</span>
                <span style={{ color: "var(--text-muted)" }}>{m.label}:</span>
                <span className="font-medium" style={{ color: "var(--text-primary)" }}>{m.value}</span>
              </div>
            </Tooltip>
          ))}
        </div>

        {/* Divider */}
        <div className="w-px h-8 hidden sm:block" style={{ background: "var(--border)" }} />

        {/* Overlay icons: lit = applies, dimmed = clear */}
        <div className="flex items-center gap-1.5 px-3 py-2">
          {overlays.map((o, i) => (
            <Tooltip key={i} text={o.tooltip}>
              <span
                className="p-1.5 rounded-md transition-opacity"
                style={{
                  color: o.active ? "var(--text-primary)" : "var(--text-muted)",
                  opacity: o.active ? 1 : 0.25,
                }}
              >
                {o.icon}
              </span>
            </Tooltip>
          ))}
        </div>
      </div>
    </motion.div>
  );
}
