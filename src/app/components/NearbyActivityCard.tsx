"use client";
import { useState, useEffect, useMemo } from "react";
import { motion } from "framer-motion";
import { ClipboardList, HardHat, Hammer, ChevronDown, ChevronUp, MapPin } from "lucide-react";
import { formatAUD, formatDate, getStatusStyle } from "@/lib/format";

/* eslint-disable @typescript-eslint/no-explicit-any */

interface ActivityResult {
  address: string;
  suburb: string;
  status: string;
  applicationType: string;
  type: string[];
  description: string;
  costOfDevelopment: number;
  dwellings: number;
  storeys: number;
  lodgementDate: string;
  determinationDate?: string;
  pan: string;
  councilRef: string;
  lot: string;
  lat: number;
  lng: number;
  distance: number;
}

type Tab = "da" | "cdc" | "cc";

export default function NearbyActivityCard({
  lat,
  lng,
  onDAs,
  onCDCs,
  onCCs,
  onItemClick,
  initialDA,
  initialCDC,
  initialCC,
}: {
  lat: number;
  lng: number;
  onDAs?: (das: ActivityResult[]) => void;
  onCDCs?: (cdcs: ActivityResult[]) => void;
  onCCs?: (ccs: ActivityResult[]) => void;
  onItemClick?: (item: { lat: number; lng: number }) => void;
  initialDA?: any;
  initialCDC?: any;
  initialCC?: any;
}) {
  const [tab, setTab] = useState<Tab>("da");
  const [das, setDas] = useState<ActivityResult[]>(initialDA?.results || []);
  const [cdcs, setCdcs] = useState<ActivityResult[]>(initialCDC?.results || []);
  const [ccs, setCcs] = useState<ActivityResult[]>(initialCC?.results || []);
  const [loadingDA, setLoadingDA] = useState(!initialDA);
  const [loadingCDC, setLoadingCDC] = useState(!initialCDC);
  const [loadingCC, setLoadingCC] = useState(!initialCC);
  const [expanded, setExpanded] = useState(false);
  const [statusFilter, setStatusFilter] = useState("All");
  const [sortBy, setSortBy] = useState<"distance" | "cost" | "date" | "dwellings">("distance");

  useEffect(() => {
    if (initialDA) return;
    setLoadingDA(true);
    fetch(`/api/da?lat=${lat}&lng=${lng}`)
      .then((r) => r.json())
      .then((d) => {
        const results = d.results || [];
        setDas(results);
        onDAs?.(results);
      })
      .catch(() => setDas([]))
      .finally(() => setLoadingDA(false));
  }, [lat, lng, onDAs, initialDA]);

  useEffect(() => {
    if (initialCDC) return;
    setLoadingCDC(true);
    fetch(`/api/cdc?lat=${lat}&lng=${lng}`)
      .then((r) => r.json())
      .then((d) => {
        const results = d.results || [];
        setCdcs(results);
        onCDCs?.(results);
      })
      .catch(() => setCdcs([]))
      .finally(() => setLoadingCDC(false));
  }, [lat, lng, onCDCs, initialCDC]);

  useEffect(() => {
    if (initialCC) return;
    setLoadingCC(true);
    fetch(`/api/cc?lat=${lat}&lng=${lng}`)
      .then((r) => r.json())
      .then((d) => {
        const results = d.results || [];
        setCcs(results);
        onCCs?.(results);
      })
      .catch(() => setCcs([]))
      .finally(() => setLoadingCC(false));
  }, [lat, lng, onCCs, initialCC]);

  // Reset filter/expanded when switching tabs
  useEffect(() => {
    setStatusFilter("All");
    setExpanded(false);
  }, [tab]);

  const items = tab === "da" ? das : tab === "cdc" ? cdcs : ccs;
  const loading = tab === "da" ? loadingDA : tab === "cdc" ? loadingCDC : loadingCC;

  const statuses = useMemo(() => ["All", ...Array.from(new Set(items.map((d) => d.status).filter(Boolean)))], [items]);

  const filtered = useMemo(() => {
    let result = items;
    if (statusFilter !== "All") {
      result = result.filter((d) => d.status === statusFilter);
    }
    result = [...result].sort((a, b) => {
      switch (sortBy) {
        case "cost": return (b.costOfDevelopment || 0) - (a.costOfDevelopment || 0);
        case "date": return new Date(b.lodgementDate || 0).getTime() - new Date(a.lodgementDate || 0).getTime();
        case "dwellings": return (b.dwellings || 0) - (a.dwellings || 0);
        default: return (a.distance || 0) - (b.distance || 0);
      }
    });
    return result;
  }, [items, statusFilter, sortBy]);

  const underAssessment = items.filter((d) => d.status?.toLowerCase().includes("assessment")).length;
  const determined = items.filter((d) => d.status?.toLowerCase().includes("determined")).length;
  const totalValue = items.reduce((sum, d) => sum + (d.costOfDevelopment || 0), 0);
  const approvalRate = items.length > 0 ? Math.round((determined / items.length) * 100) : 0;
  const visible = expanded ? filtered : filtered.slice(0, 5);

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="glass-card">
      {/* Tab header */}
      <div className="flex items-center gap-4 mb-4">
        <button onClick={() => setTab("da")} className="tab-btn" data-active={tab === "da"}>
          <ClipboardList size={16} />
          DAs {das.length > 0 && <span className="text-xs opacity-70">({das.length})</span>}
        </button>
        <button onClick={() => setTab("cdc")} className="tab-btn" data-active={tab === "cdc"}>
          <HardHat size={16} />
          CDCs {cdcs.length > 0 && <span className="text-xs opacity-70">({cdcs.length})</span>}
        </button>
        <button onClick={() => setTab("cc")} className="tab-btn" data-active={tab === "cc"}>
          <Hammer size={16} />
          CCs {ccs.length > 0 && <span className="text-xs opacity-70">({ccs.length})</span>}
        </button>
      </div>

      <p className="text-sm mb-4" style={{ color: "var(--text-muted)" }}>
        {tab === "da"
          ? "Development Applications lodged with council near this property"
          : tab === "cdc"
          ? "Complying Development Certificates - fast-track approvals nearby"
          : "Construction Certificates - confirmed to start building nearby"}
      </p>

      {loading ? (
        <div className="text-sm py-6 text-center" style={{ color: "var(--text-muted)" }}>
          Loading nearby {tab === "da" ? "DAs" : tab === "cdc" ? "CDCs" : "CCs"}…
        </div>
      ) : items.length === 0 ? (
        <div className="text-sm py-6 text-center" style={{ color: "var(--text-muted)" }}>
          No {tab === "da" ? "development applications" : tab === "cdc" ? "CDCs" : "construction certificates"} found within 1km
        </div>
      ) : (
        <>
          {/* Stats badges */}
          <div className="flex gap-3 mb-4 flex-wrap">
            <div className="px-3 py-1.5 rounded-lg text-sm" style={{ background: "var(--bg-sunken)", border: "1px solid var(--border)" }}>
              <span style={{ color: "var(--text-muted)" }}>Total:</span>{" "}
              <span className="font-semibold" style={{ color: "var(--text-primary)" }}>{items.length}</span>
            </div>
            {underAssessment > 0 && (
              <div className="px-3 py-1.5 rounded-lg text-sm" style={{ background: "var(--warning-bg)", border: "1px solid var(--warning-border)" }}>
                <span style={{ color: "var(--warning)", opacity: 0.7 }}>Assessing:</span>{" "}
                <span className="font-semibold" style={{ color: "var(--warning)" }}>{underAssessment}</span>
              </div>
            )}
            <div className="px-3 py-1.5 rounded-lg text-sm" style={{ background: "var(--success-bg)", border: "1px solid var(--success-border)" }}>
              <span style={{ color: "var(--success)", opacity: 0.7 }}>Determined:</span>{" "}
              <span className="font-semibold" style={{ color: "var(--success)" }}>{determined}</span>
            </div>
            {totalValue > 0 && (
              <div className="px-3 py-1.5 rounded-lg text-sm" style={{ background: "var(--info-bg)", border: "1px solid var(--info-border)" }}>
                <span style={{ color: "var(--info)", opacity: 0.7 }}>Value:</span>{" "}
                <span className="font-semibold" style={{ color: "var(--info)" }}>{formatAUD(totalValue)}</span>
              </div>
            )}
            <div className="px-3 py-1.5 rounded-lg text-sm" style={{ background: "rgba(139, 92, 246, 0.1)", border: "1px solid rgba(139, 92, 246, 0.2)" }}>
              <span style={{ color: "var(--text-muted)" }}>Approval:</span>{" "}
              <span className="font-semibold" style={{ color: "#7C3AED" }}>{approvalRate}%</span>
            </div>
          </div>

          {/* Filters */}
          <div className="flex flex-wrap gap-2 mb-4">
            <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="form-select">
              {statuses.map((s) => <option key={s} value={s}>{s === "All" ? "All Statuses" : s}</option>)}
            </select>
            <select value={sortBy} onChange={(e) => setSortBy(e.target.value as any)} className="form-select">
              <option value="distance">Sort: Nearest</option>
              <option value="date">Sort: Most Recent</option>
              <option value="cost">Sort: Highest Value</option>
              <option value="dwellings">Sort: Most Dwellings</option>
            </select>
            {statusFilter !== "All" && (
              <span className="text-xs self-center" style={{ color: "var(--text-muted)" }}>{filtered.length} of {items.length}</span>
            )}
          </div>

          {/* List */}
          <div className="space-y-3">
            {visible.map((item, i) => (
              <motion.div
                key={item.pan || i}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.03 }}
                className="clickable-item"
                onClick={() => item.lat && item.lng && onItemClick?.({ lat: item.lat, lng: item.lng })}
              >
                <div className="flex items-start justify-between gap-2 mb-1.5">
                  <div className="font-medium text-sm leading-snug" style={{ color: "var(--text-primary)" }}>{item.address}</div>
                  <span className="shrink-0 text-xs px-2 py-0.5 rounded-full font-medium" style={{ background: getStatusStyle(item.status).bg, color: getStatusStyle(item.status).color }}>
                    {item.status}
                  </span>
                </div>
                {item.description && (
                  <p className="text-xs mb-1.5" style={{ color: "var(--text-secondary)" }}>{item.description}</p>
                )}
                <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs" style={{ color: "var(--text-muted)" }}>
                  <span className="flex items-center gap-1"><MapPin size={11} /> {item.distance}m</span>
                  {item.applicationType && tab !== "cc" && <span style={{ opacity: 0.7 }}>{item.applicationType}</span>}
                  {(item as any).builder && <span>🔨 {(item as any).builder}</span>}
                  {item.costOfDevelopment > 0 && <span>{formatAUD(item.costOfDevelopment)}</span>}
                  {item.dwellings > 0 && <span>{item.dwellings} dwellings</span>}
                  {item.storeys > 0 && <span>{item.storeys} storeys</span>}
                  {(item as any).proposedUse && tab === "cc" && <span>{(item as any).proposedUse}</span>}
                  {item.lodgementDate && <span>{formatDate(item.lodgementDate)}</span>}
                </div>
                <div className="flex flex-wrap gap-x-3 text-[10px] mt-1.5" style={{ color: "var(--text-muted)", opacity: 0.7 }}>
                  {item.councilRef && <span>Ref: {item.councilRef}</span>}
                  {item.pan && <span>PAN: {item.pan}</span>}
                  {item.lot && <span>{item.lot}</span>}
                </div>
              </motion.div>
            ))}
          </div>

          {filtered.length > 5 && (
            <button onClick={() => setExpanded(!expanded)} className="btn-text mt-3">
              {expanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
              {expanded ? "Show less" : `Show all ${filtered.length}`}
            </button>
          )}
        </>
      )}
    </motion.div>
  );
}
