"use client";
import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Sparkles, Trophy, Loader2, TrendingUp, Shield, BarChart3, Home, Lightbulb } from "lucide-react";

/* eslint-disable @typescript-eslint/no-explicit-any */

interface CompareCategory {
  name: string;
  headline: string;
  propertyA: string;
  propertyB: string;
  winner: "A" | "B" | "Tie";
  reasoning: string;
}

interface CompareResult {
  summary: string;
  categories: CompareCategory[];
  verdict: {
    winner: "A" | "B" | "Depends";
    headline: string;
    detail: string;
  };
}

const CATEGORY_ICONS: Record<string, React.ReactNode> = {
  "Development Potential": <Home size={14} />,
  "Risk Profile": <Shield size={14} />,
  "Market Position": <TrendingUp size={14} />,
  "Investment Outlook": <BarChart3 size={14} />,
  "Actionable Strategy": <Lightbulb size={14} />,
};

const COLOR_A = "#3B82F6";
const COLOR_B = "#F59E0B";

export default function CompareInsightsCard({ addressA, addressB, siteDataA, siteDataB }: { addressA: string; addressB: string; siteDataA: any; siteDataB: any }) {
  const [result, setResult] = useState<CompareResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!addressA || !addressB || !siteDataA || !siteDataB) return;

    setLoading(true);
    setError(null);

    fetch("/api/insights/compare", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ addressA, addressB, siteDataA, siteDataB }),
    })
      .then((res) => {
        if (!res.ok) throw new Error("Failed to generate comparison");
        return res.json();
      })
      .then((data) => {
        if (data.error) throw new Error(data.error);
        setResult(data);
      })
      .catch((err) => {
        console.error("Compare insights error:", err);
        setError("Unable to generate comparison");
      })
      .finally(() => setLoading(false));
  }, [addressA, addressB, siteDataA, siteDataB]);

  if (!addressA || !addressB) return null;

  if (loading) {
    return (
      <div className="glass-card">
        <div className="flex items-center gap-3 mb-3">
          <Sparkles size={20} style={{ color: "var(--accent)" }} />
          <h2 className="text-lg font-semibold" style={{ color: "var(--text-primary)" }}>AI Comparative Analysis</h2>
        </div>
        <div className="flex items-center justify-center gap-3 py-8">
          <Loader2 size={18} className="animate-spin" style={{ color: "var(--accent)" }} />
          <p className="text-sm" style={{ color: "var(--text-muted)" }}>Comparing both properties...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="glass-card">
        <div className="flex items-center gap-3 mb-3">
          <Sparkles size={20} style={{ color: "var(--text-muted)" }} />
          <h2 className="text-lg font-semibold" style={{ color: "var(--text-primary)" }}>AI Comparative Analysis</h2>
        </div>
        <p className="text-sm py-4" style={{ color: "var(--text-muted)" }}>{error}</p>
      </div>
    );
  }

  if (!result) return null;

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
      <div className="glass-card">
        {/* Header */}
        <div className="flex items-center gap-3 mb-4">
          <Sparkles size={20} style={{ color: "var(--accent)" }} />
          <h2 className="text-lg font-semibold" style={{ color: "var(--text-primary)" }}>AI Comparative Analysis</h2>
          <span className="text-[10px] font-medium px-2 py-0.5 rounded-full" style={{ background: "var(--bg-sunken)", color: "var(--text-muted)" }}>GPT-4.1</span>
        </div>

        {/* Summary */}
        <div className="p-4 rounded-xl mb-4" style={{ background: "var(--bg-sunken)", border: "1px solid var(--border)" }}>
          <p className="text-sm leading-relaxed" style={{ color: "var(--text-primary)" }}>{result.summary}</p>
        </div>

        {/* Property labels */}
        <div className="flex items-center justify-between mb-3 px-1">
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold px-2 py-0.5 rounded" style={{ background: `${COLOR_A}20`, color: COLOR_A }}>A</span>
            <span className="text-xs" style={{ color: "var(--text-muted)" }}>{addressA.split(",")[0]}</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs" style={{ color: "var(--text-muted)" }}>{addressB.split(",")[0]}</span>
            <span className="text-xs font-bold px-2 py-0.5 rounded" style={{ background: `${COLOR_B}20`, color: COLOR_B }}>B</span>
          </div>
        </div>

        {/* Category cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-4">
          {result.categories.map((cat, i) => (
            <motion.div
              key={cat.name}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
              className="p-4 rounded-xl"
              style={{ background: "var(--bg-sunken)", border: "1px solid var(--border)" }}
            >
              {/* Category header */}
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <span style={{ color: "var(--text-muted)" }}>{CATEGORY_ICONS[cat.name] || <BarChart3 size={14} />}</span>
                  <span className="text-xs font-semibold" style={{ color: "var(--text-primary)" }}>{cat.name}</span>
                </div>
                <span
                  className="text-[10px] font-bold px-1.5 py-0.5 rounded"
                  style={{
                    background: cat.winner === "A" ? `${COLOR_A}20` : cat.winner === "B" ? `${COLOR_B}20` : "var(--bg-sunken)",
                    color: cat.winner === "A" ? COLOR_A : cat.winner === "B" ? COLOR_B : "var(--text-muted)",
                  }}
                >
                  {cat.winner === "Tie" ? "Tie" : `${cat.winner} wins`}
                </span>
              </div>

              {/* Headline */}
              <p className="text-xs font-medium mb-2" style={{ color: "var(--text-primary)" }}>{cat.headline}</p>

              {/* Property comparisons */}
              <div className="space-y-2">
                <div className="text-xs p-2 rounded-lg" style={{ borderLeft: `3px solid ${COLOR_A}`, background: `${COLOR_A}08` }}>
                  <span className="font-semibold" style={{ color: COLOR_A }}>A: </span>
                  <span style={{ color: "var(--text-secondary)" }}>{cat.propertyA}</span>
                </div>
                <div className="text-xs p-2 rounded-lg" style={{ borderLeft: `3px solid ${COLOR_B}`, background: `${COLOR_B}08` }}>
                  <span className="font-semibold" style={{ color: COLOR_B }}>B: </span>
                  <span style={{ color: "var(--text-secondary)" }}>{cat.propertyB}</span>
                </div>
              </div>

              {/* Reasoning */}
              <p className="text-[11px] mt-2 italic" style={{ color: "var(--text-muted)" }}>{cat.reasoning}</p>
            </motion.div>
          ))}
        </div>

        {/* Verdict */}
        <div className="p-4 rounded-xl" style={{ background: "var(--accent-subtle)", border: "1px solid var(--accent-border)" }}>
          <div className="flex items-center gap-2 mb-2">
            <Trophy size={16} style={{ color: "var(--accent)" }} />
            <span className="text-sm font-bold" style={{ color: "var(--accent)" }}>
              Verdict: {result.verdict.winner === "Depends" ? "It depends" : `Property ${result.verdict.winner}`}
            </span>
          </div>
          <p className="text-sm font-medium mb-1" style={{ color: "var(--text-primary)" }}>{result.verdict.headline}</p>
          <p className="text-xs leading-relaxed" style={{ color: "var(--text-secondary)" }}>{result.verdict.detail}</p>
        </div>

        {/* Disclaimer */}
        <p className="text-[10px] mt-3 text-center" style={{ color: "var(--text-muted)", opacity: 0.7 }}>
          Insights generated from ABS Census, BOCSAR, Planning Portal, and market data. Not financial advice.
        </p>
      </div>
    </motion.div>
  );
}
