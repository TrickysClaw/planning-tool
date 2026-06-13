"use client";
import { motion } from "framer-motion";
import { Sparkles } from "lucide-react";

export default function AISummaryCard() {
  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
      <div className="glass-card">
        <div className="flex items-center gap-3 mb-3">
          <Sparkles size={20} style={{ color: "var(--accent)" }} />
          <h2 className="text-lg font-semibold" style={{ color: "var(--text-primary)" }}>AI Summary</h2>
        </div>
        <div
          className="rounded-xl p-4 min-h-[80px] flex items-center justify-center"
          style={{ background: "var(--bg-sunken)", border: "1px dashed var(--border)" }}
        >
          <p className="text-sm" style={{ color: "var(--text-muted)" }}>
            AI-generated property summary coming soon
          </p>
        </div>
      </div>
    </motion.div>
  );
}
