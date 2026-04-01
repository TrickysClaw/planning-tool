"use client";
import ZoneCard from "./ZoneCard";
import { MapPin, Building2, Ruler, BarChart3, Move, Landmark, Flame, Waves } from "lucide-react";

/* eslint-disable @typescript-eslint/no-explicit-any */

const ZONE_DESC: Record<string, string> = {
  R1: "Houses, apartments, shops, community facilities",
  R2: "Houses, duplexes, boarding houses, home businesses",
  R3: "Townhouses, villas, apartments (3-4 storeys)",
  R4: "Apartment buildings (5+ storeys)",
  B1: "Shops, cafes, offices, residential above",
  B2: "Shops, cafes, offices, residential above",
  B4: "Residential, commercial, retail — almost anything",
  IN1: "Factories, warehouses, some offices",
  IN2: "Factories, warehouses, some offices",
  RE1: "Parks, sports grounds",
  SP2: "Roads, rail, utilities",
  E1: "Conservation, limited building", E2: "Conservation, limited building", E3: "Conservation, limited building", E4: "Conservation, limited building",
  RU1: "Farming, rural housing", RU2: "Farming, rural housing", RU3: "Farming, rural housing", RU4: "Farming, rural housing",
  MU1: "Residential, commercial, retail",
  C1: "Shops, cafes, offices, residential above",
  C2: "Shops, cafes, offices, residential above",
  C3: "Factories, warehouses, some offices",
  C4: "Conservation, limited building",
};

function getZoneDesc(code: string) {
  const base = code?.replace(/\s.*/,"") || "";
  return ZONE_DESC[base] || "Check local LEP for permitted uses";
}

interface Props { data: any }

export default function ReportCard({ data }: Props) {
  const { address, planning, hazard, cadastre } = data;

  // Extract planning layers
  const results = planning?.results || [];
  const find = (name: string) => results.find((r: any) => r.layerName === name)?.attributes || {};

  const zoning = find("Land Zoning");
  const height = find("Height of Building");
  const fsr = find("Floor Space Ratio");
  const lotSize = find("Lot Size");
  const heritage = find("Heritage");

  const cad = cadastre?.features?.[0]?.attributes || {};
  const bush = hazard?.bushfire?.features || [];
  const flood = hazard?.flood?.features || [];

  const lotArea = cad.lot_area || cad.shape_area;
  const fsrNum = parseFloat(fsr.FSR);
  const maxGFA = lotArea && !isNaN(fsrNum) ? Math.round(lotArea * fsrNum) : null;
  const heightM = parseFloat(height.MAX_B_H);
  const storeys = !isNaN(heightM) ? Math.round(heightM / 3) : null;

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 w-full max-w-6xl mx-auto">
      <ZoneCard icon={<MapPin size={20} />} title="Address & Location" delay={0}>
        <p className="font-medium text-white">{address}</p>
        {zoning.LGA_NAME && <p>LGA: {zoning.LGA_NAME}</p>}
        {cad.lotnumber && <p>Lot {cad.lotnumber} / DP {cad.plannumber}</p>}
        {lotArea && <p>Lot area: {Math.round(lotArea).toLocaleString()} m²</p>}
      </ZoneCard>

      <ZoneCard icon={<Building2 size={20} />} title="Zoning" delay={0.05}>
        {zoning.SYM_CODE ? (
          <>
            <p className="text-2xl font-bold text-emerald-400">{zoning.SYM_CODE}</p>
            <p className="font-medium text-white">{zoning.LAY_CLASS}</p>
            <p className="text-xs text-slate-400 mt-1">{getZoneDesc(zoning.SYM_CODE)}</p>
            {zoning.EPI_NAME && <p className="text-xs text-slate-500 mt-1">{zoning.EPI_NAME}</p>}
          </>
        ) : <p className="text-slate-500">No data</p>}
      </ZoneCard>

      <ZoneCard icon={<Ruler size={20} />} title="Height Limit" delay={0.1}>
        {!isNaN(heightM) ? (
          <>
            <p className="text-2xl font-bold text-emerald-400">{heightM}m</p>
            {storeys && <p>~{storeys} storeys</p>}
          </>
        ) : <p className="text-slate-500">No height limit mapped — may be uncapped or set by DCP</p>}
      </ZoneCard>

      <ZoneCard icon={<BarChart3 size={20} />} title="Floor Space Ratio" delay={0.15}>
        {fsr.FSR ? (
          <>
            <p className="text-2xl font-bold text-emerald-400">{fsr.FSR}</p>
            {maxGFA && <p>Max GFA: ~{maxGFA.toLocaleString()} m²</p>}
          </>
        ) : <p className="text-slate-500">No FSR mapped — may be governed by DCP or SEPP provisions</p>}
      </ZoneCard>

      <ZoneCard icon={<Move size={20} />} title="Minimum Lot Size" delay={0.2}>
        {lotSize.LOT_SIZE ? (
          <p className="text-2xl font-bold text-emerald-400">{parseFloat(lotSize.LOT_SIZE).toLocaleString()} m²</p>
        ) : <p className="text-slate-500">No minimum lot size mapped — check applicable LEP/SEPP</p>}
      </ZoneCard>

      <ZoneCard icon={<Landmark size={20} />} title="Heritage" delay={0.25}>
        {heritage.HER_NAME ? (
          <>
            <p className="text-emerald-400 font-bold">Yes — Heritage Listed</p>
            <p>{heritage.HER_NAME}</p>
            {heritage.HER_SIG && <p className="text-xs text-slate-400">Significance: {heritage.HER_SIG}</p>}
          </>
        ) : <p className="text-slate-400">No heritage listing</p>}
      </ZoneCard>

      <ZoneCard icon={<Flame size={20} />} title="Bushfire" delay={0.3}>
        {bush.length > 0 ? (
          <>
            <p className="text-orange-400 font-bold">⚠️ Bushfire Prone</p>
            {bush[0].attributes?.CATEGORY && <p>Category: {bush[0].attributes.CATEGORY}</p>}
          </>
        ) : <p className="text-slate-400">Not bushfire prone</p>}
      </ZoneCard>

      <ZoneCard icon={<Waves size={20} />} title="Flood" delay={0.35}>
        {flood.length > 0 ? (
          <p className="text-blue-400 font-bold">⚠️ Flood Affected</p>
        ) : <p className="text-slate-400">Not flood affected</p>}
      </ZoneCard>
    </div>
  );
}
