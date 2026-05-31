"use client";
import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Users, ThumbsUp, AlertTriangle, DollarSign, TrendingUp, Shield, Bot, Loader2, Lightbulb } from "lucide-react";
import { findSuburbPerception } from "@/data/suburbPerception";

interface PerceptionData {
  suburb: string;
  sentiment: "positive" | "neutral" | "negative";
  sentimentScore: number;
  crimeRate: "low" | "moderate" | "high";
  crimeIndex: number;
  medianIncome: number;
  medianHousePrice?: number | null;
  demographics: { medianAge?: number; familyPercentage?: number; ownerOccupied?: number };
  highlights: string[];
  concerns: string[];
  investorInsight?: string;
  sources?: string[];
}

function SentimentFace({ score }: { score: number }) {
  if (score >= 0.5) return <span className="text-4xl">😊</span>;
  if (score >= 0.1) return <span className="text-4xl">🙂</span>;
  if (score >= -0.2) return <span className="text-4xl">😐</span>;
  if (score >= -0.5) return <span className="text-4xl">😕</span>;
  return <span className="text-4xl">😟</span>;
}

function CrimeIndicator({ rate }: { rate: "low" | "moderate" | "high" }) {
  const cssVars = { low: "var(--success)", moderate: "var(--warning)", high: "var(--danger)" };
  const bgVars = { low: "var(--success-bg)", moderate: "var(--warning-bg)", high: "var(--danger-bg)" };
  const labels = { low: "Low Crime Area", moderate: "Moderate Crime", high: "Higher Crime Area" };
  return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium" style={{ color: cssVars[rate], background: bgVars[rate] }}>
      <Shield size={10} />
      {labels[rate]}
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

export default function PerceptionCard({ address }: { address: string }) {
  const [perception, setPerception] = useState<PerceptionData | null>(null);
  const [loading, setLoading] = useState(true);
  const [aiPowered, setAiPowered] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!address) return;

    const suburb = extractSuburb(address);

    // Check static data first (instant)
    const staticData = findSuburbPerception(address);
    if (staticData) {
      setPerception(staticData);
      setLoading(false);
      setAiPowered(false);
      return;
    }

    // Fetch from AI API
    setLoading(true);
    setError(null);
    fetch(`/api/perception?suburb=${encodeURIComponent(suburb)}`)
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
  }, [address]);

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
        <CrimeIndicator rate={perception.crimeRate} />
      </div>

      <div className="flex items-start gap-5 mb-4">
        <div className="flex flex-col items-center gap-1">
          <SentimentFace score={perception.sentimentScore} />
          <span className="text-xs capitalize" style={{ color: "var(--text-muted)" }}>{perception.sentiment}</span>
        </div>

        <div className="flex-1 grid grid-cols-2 sm:grid-cols-3 gap-3">
          <div className="p-2 rounded-lg" style={{ background: "var(--bg-sunken)" }}>
            <div className="flex items-center gap-1 text-xs mb-0.5" style={{ color: "var(--text-muted)" }}>
              <DollarSign size={10} />
              Median Income
            </div>
            <p className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>${perception.medianIncome.toLocaleString()}</p>
          </div>
          {perception.medianHousePrice && (
            <div className="p-2 rounded-lg" style={{ background: "var(--bg-sunken)" }}>
              <div className="flex items-center gap-1 text-xs mb-0.5" style={{ color: "var(--text-muted)" }}>
                <TrendingUp size={10} />
                Median House
              </div>
              <p className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>${(perception.medianHousePrice / 1000000).toFixed(1)}M</p>
            </div>
          )}
          {perception.demographics?.medianAge && (
            <div className="p-2 rounded-lg" style={{ background: "var(--bg-sunken)" }}>
              <div className="flex items-center gap-1 text-xs mb-0.5" style={{ color: "var(--text-muted)" }}>
                <Users size={10} />
                Median Age
              </div>
              <p className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>{perception.demographics.medianAge}</p>
            </div>
          )}
          {perception.demographics?.familyPercentage && (
            <div className="p-2 rounded-lg" style={{ background: "var(--bg-sunken)" }}>
              <div className="flex items-center gap-1 text-xs mb-0.5" style={{ color: "var(--text-muted)" }}>
                <Users size={10} />
                Families
              </div>
              <p className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>{perception.demographics.familyPercentage}%</p>
            </div>
          )}
          {perception.demographics?.ownerOccupied && (
            <div className="p-2 rounded-lg" style={{ background: "var(--bg-sunken)" }}>
              <div className="flex items-center gap-1 text-xs mb-0.5" style={{ color: "var(--text-muted)" }}>
                Owner Occupied
              </div>
              <p className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>{perception.demographics.ownerOccupied}%</p>
            </div>
          )}
        </div>
      </div>

      {/* Investor Insight — AI-generated */}
      {perception.investorInsight && (
        <div className="mb-4 p-3 rounded-lg" style={{ background: "var(--accent-subtle)", border: "1px solid var(--accent-border)" }}>
          <div className="flex items-center gap-1.5 mb-1.5">
            <Lightbulb size={13} style={{ color: "var(--accent)" }} />
            <span className="text-xs font-semibold" style={{ color: "var(--accent)" }}>Investor Insight</span>
          </div>
          <p className="text-xs leading-relaxed" style={{ color: "var(--text-secondary)" }}>{perception.investorInsight}</p>
        </div>
      )}

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

      {/* Sources / AI badge */}
      <div className="mt-3 flex items-center gap-2 p-2 rounded-lg" style={{ background: "var(--bg-sunken)", border: "1px solid var(--border)" }}>
        <Bot size={14} style={{ color: "var(--accent)" }} />
        {aiPowered ? (
          <p className="text-[11px]" style={{ color: "var(--text-muted)" }}>
            AI-generated analysis based on {perception.sources?.join(", ") || "ABS Census, BOCSAR, Domain.com.au"}. Data may be approximate.
          </p>
        ) : (
          <p className="text-[11px]" style={{ color: "var(--text-muted)" }}>
            Based on ABS Census 2021, BOCSAR crime statistics &amp; market data.
          </p>
        )}
      </div>
    </motion.div>
  );
}
