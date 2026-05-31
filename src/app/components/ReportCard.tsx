"use client";
import { motion } from "framer-motion";
import { MapPin, Move, FileText, MapPinned } from "lucide-react";

/* eslint-disable @typescript-eslint/no-explicit-any */

export default function ReportCard({ data }: { data: any }) {
  const { address, planning, cadastre, councilName } = data;
  const results = planning?.results || [];
  const find = (name: string) => results.find((r: any) => r.layerName === name)?.attributes || {};

  const zoning = find("Land Zoning");
  const lotSize = find("Lot Size");
  const cad = cadastre?.features?.[0]?.attributes || {};
  const keySites = data.hazard?.keySites || [];

  const lotArea = cad.planlotarea || cad.lot_area || cad.shape_area;

  const details = [
    { icon: <MapPin size={14} />, label: "Address", value: address },
    { icon: <MapPin size={14} />, label: "LGA", value: councilName || zoning.LGA_NAME || null },
    { icon: <FileText size={14} />, label: "Lot/DP", value: cad.lotnumber ? `Lot ${cad.lotnumber} / DP ${cad.plannumber}` : null },
    { icon: <Move size={14} />, label: "Lot Area", value: lotArea ? `${Math.round(lotArea).toLocaleString()} m²` : null },
    { icon: <Move size={14} />, label: "Min Lot Size", value: lotSize.LOT_SIZE ? `${parseFloat(lotSize.LOT_SIZE).toLocaleString()} m²` : null },
    { icon: <FileText size={14} />, label: "LEP", value: zoning.EPI_NAME || null },
    { icon: <MapPinned size={14} />, label: "Key Site", value: keySites.length > 0 ? (keySites[0].attributes?.LABEL || "Yes") : null },
  ].filter(d => d.value);

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="w-full">
      <div className="flex flex-wrap items-center gap-x-5 gap-y-2 px-4 py-3 rounded-xl" style={{ background: "var(--bg-sunken)", border: "1px solid var(--border)" }}>
        {details.map((d, i) => (
          <div key={i} className="flex items-center gap-1.5 text-sm">
            <span style={{ color: "var(--text-muted)" }}>{d.icon}</span>
            <span style={{ color: "var(--text-muted)" }}>{d.label}:</span>
            <span className="font-medium" style={{ color: "var(--text-primary)" }}>{d.value}</span>
          </div>
        ))}
      </div>
    </motion.div>
  );
}
