"use client";
import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Users, ThumbsUp, AlertTriangle, DollarSign, TrendingUp, Shield, Bot, Loader2, Home } from "lucide-react";
import { findSuburbPerception } from "@/data/suburbPerception";

interface CrimeBreakdown {
  assault: number;
  breakEnter: number;
  theft: number;
  maliciousDamage: number;
  drugOffences: number;
  domesticViolence: number;
  robbery: number;
  source: "suburb" | "lga";
}

interface PerceptionData {
  suburb: string;
  sentiment: "positive" | "neutral" | "negative";
  sentimentScore: number;
  crimeRate: "very low" | "low" | "moderate" | "high" | "very high";
  crimeIndex: number;
  crimeBreakdown?: CrimeBreakdown | null;
  medianIncome: number;
  medianHousePrice?: number | null;
  demographics: { medianAge?: number; familyPercentage?: number; ownerOccupied?: number };
  highlights: string[];
  concerns: string[];
  sources?: string[];
}

function SentimentFace({ score }: { score: number }) {
  if (score >= 0.5) return <span className="text-3xl">😊</span>;
  if (score >= 0.1) return <span className="text-3xl">🙂</span>;
  if (score >= -0.2) return <span className="text-3xl">😐</span>;
  if (score >= -0.5) return <span className="text-3xl">😕</span>;
  return <span className="text-3xl">😟</span>;
}



function CrimeIndicator({ rate, index }: { rate: string; index?: number | null }) {
  const cssVars: Record<string, string> = { "very low": "var(--success)", low: "var(--success)", moderate: "var(--warning)", high: "var(--danger)", "very high": "var(--danger)" };
  const bgVars: Record<string, string> = { "very low": "var(--success-bg)", low: "var(--success-bg)", moderate: "var(--warning-bg)", high: "var(--danger-bg)", "very high": "var(--danger-bg)" };
  return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium" style={{ color: cssVars[rate], background: bgVars[rate] }}>
      <Shield size={10} />
      {rate.charAt(0).toUpperCase() + rate.slice(1)} Crime
      {index != null && <span className="opacity-70">({index}/yr)</span>}
    </span>
  );
}

function extractSuburb(address: string): string {
  // Try to extract suburb name from various address formats
  const parts = address.toLowerCase().replace(/,/g, "").split(/\s+/);
  // Remove common suffixes/numbers
  const filtered = parts.filter(p => !/^\d+$/.test(p) && !["nsw", "australia", "blvd", "st", "rd", "ave", "dr", "ln", "ct", "pl", "way", "cres", "lot", "near"].includes(p));
  // Common multi-word suburb patterns
  const full = filtered.join(" ");
  // Check for known multi-word suburbs
  const multiWord = ["castle hill", "bella vista", "north sydney", "north ryde", "dee why", "st leonards", "double bay", "rose bay", "lane cove", "crows nest", "north shore", "palm beach", "manly vale", "bondi junction", "kings cross", "potts point", "darling harbour", "circular quay", "the hills", "kellyville ridge", "rouse hill", "baulkham hills"];
  for (const mw of multiWord) {
    if (full.includes(mw)) return mw;
  }
  // Return last meaningful word(s) - usually the suburb
  return filtered.length > 0 ? filtered[filtered.length - 1] : address;
}

export default function PerceptionCard({ address, lat, lng, initialData }: { address: string; lat?: number; lng?: number; initialData?: any }) {
  const [perception, setPerception] = useState<PerceptionData | null>(initialData || null);
  const [loading, setLoading] = useState(!initialData);
  const [aiPowered, setAiPowered] = useState(!!initialData);
  const [error, setError] = useState<string | null>(null);

  // Stabilize lat/lng to avoid dependency array size changes
  const stableLat = lat ?? null;
  const stableLng = lng ?? null;

  useEffect(() => {
    if (initialData || !address) return; // Skip fetch if data was pre-loaded

    const suburb = extractSuburb(address);

    // Check static data first (instant)
    const staticData = findSuburbPerception(address);
    if (staticData) {
      setPerception(staticData);
      setLoading(false);
      setAiPowered(false);
      return;
    }

    // Fetch from API with coordinates for real data lookups
    setLoading(true);
    setError(null);
    const params = new URLSearchParams({ suburb });
    if (stableLat != null && stableLng != null) {
      params.set("lat", stableLat.toString());
      params.set("lng", stableLng.toString());
    }
    fetch(`/api/perception?${params}`)
      .then(res => {
        if (!res.ok) throw new Error("API error");
        return res.json();
      })
      .then(data => {
        if (data.error) throw new Error(data.error);
        setPerception(data);
        setAiPowered(true);
      })
      .catch(err => {
        console.error("Perception fetch error:", err);
        setError("Unable to load perception data");
      })
      .finally(() => setLoading(false));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [address, stableLat, stableLng]);

  if (loading) {
    return (
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.45 }}
        className="glass-card">
        <div className="flex items-center gap-2 mb-4">
          <Users size={20} style={{ color: "var(--accent)" }} />
          <h3 className="font-semibold text-lg" style={{ color: "var(--text-primary)" }}>Public Perception</h3>
        </div>
        <div className="flex items-center justify-center gap-3 py-8">
          <Loader2 size={20} className="animate-spin" style={{ color: "var(--accent)" }} />
          <p className="text-sm" style={{ color: "var(--text-muted)" }}>Analysing suburb sentiment with AI...</p>
        </div>
      </motion.div>
    );
  }

  if (error || !perception) {
    return (
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.45 }}
        className="glass-card">
        <div className="flex items-center gap-2 mb-3">
          <Users size={20} style={{ color: "var(--accent)" }} />
          <h3 className="font-semibold text-lg" style={{ color: "var(--text-primary)" }}>Public Perception</h3>
        </div>
        <div className="flex items-center gap-3 p-3 rounded-lg" style={{ background: "var(--bg-sunken)", border: "1px solid var(--border)" }}>
          <Bot size={18} style={{ color: "var(--text-muted)" }} />
          <p className="text-sm" style={{ color: "var(--text-muted)" }}>
            {error || "Suburb perception data not available for this area."}
          </p>
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.45 }}
      className="glass-card">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Users size={20} style={{ color: "var(--accent)" }} />
          <h3 className="font-semibold text-lg" style={{ color: "var(--text-primary)" }}>Public Perception</h3>
          {aiPowered && (
            <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium" style={{ background: "var(--accent-subtle)", color: "var(--accent)" }}>
              <Bot size={10} /> AI
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <SentimentFace score={perception.sentimentScore} />
        </div>
      </div>

      {/* Demographics strip */}
      <div className="flex flex-wrap gap-2 mb-4">
        {perception.medianIncome != null && perception.medianIncome > 0 && (
          <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg" style={{ background: "var(--bg-sunken)" }}>
            <DollarSign size={12} style={{ color: "var(--text-muted)" }} />
            <span className="text-xs" style={{ color: "var(--text-muted)" }}>Median Household Income</span>
            <span className="text-xs font-semibold" style={{ color: "var(--text-primary)" }}>${(perception.medianIncome / 1000).toFixed(0)}k/yr</span>
          </div>
        )}
        {perception.medianHousePrice != null && perception.medianHousePrice > 0 && (
          <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg" style={{ background: "var(--bg-sunken)" }}>
            <TrendingUp size={12} style={{ color: "var(--text-muted)" }} />
            <span className="text-xs" style={{ color: "var(--text-muted)" }}>Median House Price</span>
            <span className="text-xs font-semibold" style={{ color: "var(--text-primary)" }}>${(perception.medianHousePrice / 1000000).toFixed(1)}M</span>
          </div>
        )}
        {perception.demographics?.medianAge != null && perception.demographics.medianAge > 0 && (
          <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg" style={{ background: "var(--bg-sunken)" }}>
            <Users size={12} style={{ color: "var(--text-muted)" }} />
            <span className="text-xs" style={{ color: "var(--text-muted)" }}>Median Resident Age</span>
            <span className="text-xs font-semibold" style={{ color: "var(--text-primary)" }}>{perception.demographics.medianAge} yrs</span>
          </div>
        )}
        {perception.demographics?.familyPercentage != null && perception.demographics.familyPercentage > 0 && (
          <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg" style={{ background: "var(--bg-sunken)" }}>
            <Home size={12} style={{ color: "var(--text-muted)" }} />
            <span className="text-xs" style={{ color: "var(--text-muted)" }}>Family Households</span>
            <span className="text-xs font-semibold" style={{ color: "var(--text-primary)" }}>{perception.demographics.familyPercentage}%</span>
          </div>
        )}
        {perception.demographics?.ownerOccupied != null && perception.demographics.ownerOccupied > 0 && perception.demographics.ownerOccupied <= 100 && (
          <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg" style={{ background: "var(--bg-sunken)" }}>
            <Home size={12} style={{ color: "var(--text-muted)" }} />
            <span className="text-xs" style={{ color: "var(--text-muted)" }}>Owner-Occupied</span>
            <span className="text-xs font-semibold" style={{ color: "var(--text-primary)" }}>{perception.demographics.ownerOccupied}%</span>
          </div>
        )}
      </div>

      {/* Crime */}
      {perception.crimeRate && (
        <div className="mb-4">
          <CrimeIndicator rate={perception.crimeRate} index={perception.crimeIndex} />
        </div>
      )}

      {/* Highlights & Concerns */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div className="p-3 rounded-lg" style={{ background: "var(--success-bg)", border: "1px solid var(--success-border)" }}>
          <div className="flex items-center gap-1.5 mb-2">
            <ThumbsUp size={13} style={{ color: "var(--success)" }} />
            <span className="text-xs font-medium" style={{ color: "var(--success)" }}>Highlights</span>
          </div>
          <ul className="space-y-1">
            {perception.highlights.map((h, i) => (
              <li key={i} className="text-xs flex gap-1.5" style={{ color: "var(--text-secondary)" }}>
                <span style={{ color: "var(--success)" }} className="mt-0.5">•</span>
                <span>{h}</span>
              </li>
            ))}
          </ul>
        </div>
        <div className="p-3 rounded-lg" style={{ background: "var(--danger-bg)", border: "1px solid var(--danger-border)" }}>
          <div className="flex items-center gap-1.5 mb-2">
            <AlertTriangle size={13} style={{ color: "var(--danger)" }} />
            <span className="text-xs font-medium" style={{ color: "var(--danger)" }}>Concerns</span>
          </div>
          <ul className="space-y-1">
            {perception.concerns.map((c, i) => (
              <li key={i} className="text-xs flex gap-1.5" style={{ color: "var(--text-secondary)" }}>
                <span style={{ color: "var(--danger)" }} className="mt-0.5">•</span>
                <span>{c}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>

      {/* Sources */}
      <div className="mt-3 flex items-center gap-2 p-2 rounded-lg" style={{ background: "var(--bg-sunken)", border: "1px solid var(--border)" }}>
        <Bot size={14} style={{ color: "var(--accent)" }} />
        <p className="text-[11px]" style={{ color: "var(--text-muted)" }}>
          {perception.sources?.join(" • ") || "ABS Census 2021 • BOCSAR Crime Stats • AI interpretation"}
        </p>
      </div>
    </motion.div>
  );
}
