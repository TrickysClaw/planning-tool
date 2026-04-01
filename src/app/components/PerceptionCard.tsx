"use client";
import { motion } from "framer-motion";
import { Users, ThumbsUp, ThumbsDown, AlertTriangle, TrendingUp, DollarSign, Shield, Bot } from "lucide-react";
import { findSuburbPerception } from "../data/suburbPerception";

interface Props {
  address: string;
}

function SentimentFace({ score }: { score: number }) {
  // score: -1 to 1
  if (score >= 0.5) return <span className="text-4xl">😊</span>;
  if (score >= 0.1) return <span className="text-4xl">🙂</span>;
  if (score >= -0.2) return <span className="text-4xl">😐</span>;
  if (score >= -0.5) return <span className="text-4xl">😕</span>;
  return <span className="text-4xl">😟</span>;
}

function CrimeIndicator({ rate }: { rate: "low" | "moderate" | "high" }) {
  const colors = { low: "text-emerald-400", moderate: "text-yellow-400", high: "text-red-400" };
  const bgs = { low: "bg-emerald-500/10", moderate: "bg-yellow-500/10", high: "bg-red-500/10" };
  const labels = { low: "Low Crime Area", moderate: "Moderate Crime", high: "Higher Crime Area" };
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${colors[rate]} ${bgs[rate]}`}>
      <Shield size={10} />
      {labels[rate]}
    </span>
  );
}

export default function PerceptionCard({ address }: Props) {
  const perception = findSuburbPerception(address);

  if (!perception) {
    return (
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.45 }}
        className="glass-card col-span-1 md:col-span-2">
        <div className="flex items-center gap-2 mb-3">
          <Users className="text-emerald-400" size={20} />
          <h3 className="font-semibold text-white text-lg">Public Perception</h3>
        </div>
        <div className="flex items-center gap-3 p-3 rounded-lg bg-white/[0.02] border border-white/[0.05]">
          <Bot size={18} className="text-slate-500" />
          <p className="text-sm text-slate-400">
            Suburb perception data not yet available for this area. AI-powered sentiment analysis coming soon — will scrape Reddit, forums and review sites to generate a community sentiment summary.
          </p>
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.45 }}
      className="glass-card col-span-1 md:col-span-2">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Users className="text-emerald-400" size={20} />
          <h3 className="font-semibold text-white text-lg">Public Perception</h3>
        </div>
        <CrimeIndicator rate={perception.crimeRate} />
      </div>

      <div className="flex items-start gap-5 mb-4">
        <div className="flex flex-col items-center gap-1">
          <SentimentFace score={perception.sentimentScore} />
          <span className="text-xs text-slate-400 capitalize">{perception.sentiment}</span>
        </div>

        <div className="flex-1 grid grid-cols-2 sm:grid-cols-3 gap-3">
          <div className="p-2 rounded-lg bg-white/[0.02]">
            <div className="flex items-center gap-1 text-xs text-slate-400 mb-0.5">
              <DollarSign size={10} />
              Median Income
            </div>
            <p className="text-sm font-semibold text-white">${perception.medianIncome.toLocaleString()}</p>
          </div>
          {perception.medianHousePrice && (
            <div className="p-2 rounded-lg bg-white/[0.02]">
              <div className="flex items-center gap-1 text-xs text-slate-400 mb-0.5">
                <TrendingUp size={10} />
                Median House
              </div>
              <p className="text-sm font-semibold text-white">${(perception.medianHousePrice / 1000000).toFixed(1)}M</p>
            </div>
          )}
          {perception.demographics.medianAge && (
            <div className="p-2 rounded-lg bg-white/[0.02]">
              <div className="flex items-center gap-1 text-xs text-slate-400 mb-0.5">
                <Users size={10} />
                Median Age
              </div>
              <p className="text-sm font-semibold text-white">{perception.demographics.medianAge}</p>
            </div>
          )}
          {perception.demographics.familyPercentage && (
            <div className="p-2 rounded-lg bg-white/[0.02]">
              <div className="flex items-center gap-1 text-xs text-slate-400 mb-0.5">
                <Users size={10} />
                Families
              </div>
              <p className="text-sm font-semibold text-white">{perception.demographics.familyPercentage}%</p>
            </div>
          )}
          {perception.demographics.ownerOccupied && (
            <div className="p-2 rounded-lg bg-white/[0.02]">
              <div className="flex items-center gap-1 text-xs text-slate-400 mb-0.5">
                Owner Occupied
              </div>
              <p className="text-sm font-semibold text-white">{perception.demographics.ownerOccupied}%</p>
            </div>
          )}
        </div>
      </div>

      {/* Highlights & Concerns */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div className="p-3 rounded-lg bg-emerald-500/5 border border-emerald-500/10">
          <div className="flex items-center gap-1.5 mb-2">
            <ThumbsUp size={13} className="text-emerald-400" />
            <span className="text-xs font-medium text-emerald-400">Highlights</span>
          </div>
          <ul className="space-y-1">
            {perception.highlights.map((h, i) => (
              <li key={i} className="text-xs text-slate-300 flex gap-1.5">
                <span className="text-emerald-500 mt-0.5">•</span>
                <span>{h}</span>
              </li>
            ))}
          </ul>
        </div>
        <div className="p-3 rounded-lg bg-red-500/5 border border-red-500/10">
          <div className="flex items-center gap-1.5 mb-2">
            <AlertTriangle size={13} className="text-red-400" />
            <span className="text-xs font-medium text-red-400">Concerns</span>
          </div>
          <ul className="space-y-1">
            {perception.concerns.map((c, i) => (
              <li key={i} className="text-xs text-slate-300 flex gap-1.5">
                <span className="text-red-500 mt-0.5">•</span>
                <span>{c}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>

      {/* Coming soon banner */}
      <div className="mt-3 flex items-center gap-2 p-2 rounded-lg bg-white/[0.02] border border-white/[0.03]">
        <Bot size={14} className="text-emerald-400" />
        <p className="text-[11px] text-slate-500">
          AI sentiment analysis coming soon — will analyse Reddit, forums & review sites for real-time community perception with citations.
        </p>
      </div>
    </motion.div>
  );
}
