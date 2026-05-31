"use client";
import { ReactNode } from "react";
import { motion } from "framer-motion";

interface Props {
  icon: ReactNode;
  title: string;
  children: ReactNode;
  delay?: number;
}

export default function ZoneCard({ icon, title, children, delay = 0 }: Props) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay }}
      className="glass-card"
    >
      <div className="flex items-center gap-2 mb-3">
        <span style={{ color: "var(--accent)" }}>{icon}</span>
        <h3 className="font-semibold text-lg" style={{ color: "var(--text-primary)" }}>{title}</h3>
      </div>
      <div className="text-sm space-y-1" style={{ color: "var(--text-secondary)" }}>{children}</div>
    </motion.div>
  );
}
