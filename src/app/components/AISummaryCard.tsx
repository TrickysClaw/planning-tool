"use client";
import { useEffect, useState, useRef } from "react";
import { motion } from "framer-motion";
import { TrendingUp, AlertTriangle, Home, BarChart3, Heart, Loader2 } from "lucide-react";

/* eslint-disable @typescript-eslint/no-explicit-any */

interface Insight {
  category: string;
  headline: string;
  detail: string;
  sentiment: "positive" | "neutral" | "negative";
}

interface InsightsData {
  summary: string;
  insights: Insight[];
}

const CATEGORY_ICONS: Record<string, React.ReactNode> = {
  "Development Potential": <Home size={14} />,
  "Market Position": <TrendingUp size={14} />,
  "Risk Factors": <AlertTriangle size={14} />,
  "Lifestyle & Liveability": <Heart size={14} />,
  "Investment Outlook": <BarChart3 size={14} />,
};

const SENTIMENT_COLORS: Record<string, { text: string; bg: string }> = {
  positive: { text: "var(--success)", bg: "var(--success-bg)" },
  neutral: { text: "var(--text-muted)", bg: "var(--bg-sunken)" },
  negative: { text: "var(--danger)", bg: "var(--danger-bg)" },
};

function extractSuburb(address?: string): string {
  if (!address) return "";
  // NSW addresses: "123 Street Name, SUBURB, NSW 2000" or "123 Street Name, SUBURB"
  const parts = address.split(",").map(p => p.trim());
  if (parts.length >= 2) {
    // Second-to-last part is usually suburb (last is state/postcode)
    const candidate = parts.length >= 3 ? parts[parts.length - 2] : parts[1];
    // Remove postcode/state suffix if present
    return candidate.replace(/\s*(NSW|VIC|QLD|SA|WA|TAS|NT|ACT)\s*\d{0,4}\s*$/i, "").trim();
  }
  return "";
}

export default function AISummaryCard({ address, siteData }: { address?: string; siteData?: any }) {
  const [insights, setInsights] = useState<InsightsData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fetchedRef = useRef<string | null>(null);
  const suburb = extractSuburb(address);
  const heading = suburb || "Market Insights";

  useEffect(() => {
    if (!address || !siteData) return;
    // Prevent double-fetch for the same address
    if (fetchedRef.current === address) return;
    fetchedRef.current = address;

    setLoading(true);
    setError(null);

    fetch("/api/insights", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ address, siteData }),
    })
      .then((res) => {
        if (!res.ok) throw new Error("Failed to generate insights");
        return res.json();
      })
      .then((data) => {
        if (data.error) throw new Error(data.error);
        setInsights(data);
      })
      .catch((err) => {
        console.error("Insights error:", err);
        setError("Unable to generate AI insights");
        fetchedRef.current = null; // allow retry on error
      })
      .finally(() => setLoading(false));
  }, [address, siteData]);

  // No data yet - don't render
  if (!address || !siteData) return null;

  if (loading) {
    return (
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
        <div className="glass-card">
          <div className="mb-3">
            <h2 className="text-lg font-semibold" style={{ color: "var(--text-primary)" }}>{heading}</h2>
          </div>
          <div className="flex items-center justify-center gap-3 py-8">
            <Loader2 size={18} className="animate-spin" style={{ color: "var(--accent)" }} />
            <p className="text-sm" style={{ color: "var(--text-muted)" }}>Synthesizing property data into insights...</p>
          </div>
        </div>
      </motion.div>
    );
  }

  if (error || !insights) {
    return (
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
        <div className="glass-card">
          <div className="mb-3">
            <h2 className="text-lg font-semibold" style={{ color: "var(--text-primary)" }}>{heading}</h2>
          </div>
          <div className="rounded-xl p-4" style={{ background: "var(--bg-sunken)", border: "1px dashed var(--border)" }}>
            <p className="text-sm" style={{ color: "var(--text-muted)" }}>
              {error || "Insights not available for this property."}
            </p>
          </div>
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
      <div className="glass-card">
        {/* Header */}
        <div className="mb-4">
          <h2 className="text-lg font-semibold" style={{ color: "var(--text-primary)" }}>{heading}</h2>
        </div>

        {/* Executive Summary */}
        <div className="p-4 rounded-xl mb-4" style={{ background: "var(--accent-subtle)", border: "1px solid var(--accent-border)" }}>
          <p className="text-sm leading-relaxed" style={{ color: "var(--text-primary)" }}>
            {insights.summary}
          </p>
        </div>

        {/* Insight cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {insights.insights.map((insight, i) => {
            const colors = SENTIMENT_COLORS[insight.sentiment] || SENTIMENT_COLORS.neutral;
            return (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 + i * 0.05 }}
                className="p-3 rounded-xl"
                style={{ background: colors.bg, border: `1px solid color-mix(in srgb, ${colors.text} 20%, transparent)` }}
              >
                <div className="flex items-center gap-2 mb-1.5">
                  <span style={{ color: colors.text }}>{CATEGORY_ICONS[insight.category] || <BarChart3 size={14} />}</span>
                  <span className="text-[11px] font-medium" style={{ color: colors.text }}>{insight.category}</span>
                </div>
                <p className="text-sm font-semibold mb-1" style={{ color: "var(--text-primary)" }}>{insight.headline}</p>
                <p className="text-xs leading-relaxed" style={{ color: "var(--text-secondary)" }}>{insight.detail}</p>
              </motion.div>
            );
          })}
        </div>

        {/* Footer */}
        <p className="text-[10px] mt-3" style={{ color: "var(--text-muted)" }}>
          Insights generated from ABS Census, BOCSAR, Planning Portal, and market data. Not financial advice.
        </p>
      </div>
    </motion.div>
  );
}
