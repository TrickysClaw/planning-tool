"use client";
import { ReactNode } from "react";
import { motion } from "framer-motion";

export default function ZoneCard({ icon, title, children, delay = 0 }: { icon: ReactNode; title: string; children: ReactNode; delay?: number }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay }}
      className="glass-card"
    >
      <div className="flex items-center gap-2 mb-3">
        <span className="text-emerald-400">{icon}</span>
        <h3 className="font-semibold text-white text-lg">{title}</h3>
      </div>
      <div className="text-slate-300 text-sm space-y-1">{children}</div>
    </motion.div>
  );
}
