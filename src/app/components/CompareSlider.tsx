"use client";
import { useRef, useState } from "react";

interface CompareSliderProps {
  leftContent: React.ReactNode;
  rightContent: React.ReactNode;
  leftLabel?: string;
  rightLabel?: string;
}

const COLOR_A = "#3B82F6";
const COLOR_B = "#F59E0B";

export default function CompareSlider({ leftContent, rightContent, leftLabel = "Property A", rightLabel = "Property B" }: CompareSliderProps) {
  const [activeTab, setActiveTab] = useState<"A" | "B">("A");
  const [direction, setDirection] = useState<"left" | "right">("left");
  const contentRef = useRef<HTMLDivElement>(null);

  const switchTab = (tab: "A" | "B") => {
    if (tab === activeTab) return;
    setDirection(tab === "B" ? "left" : "right");
    setActiveTab(tab);
  };

  return (
    <div className="w-full">
      {/* Tab bar */}
      <div className="flex items-center gap-0 rounded-lg overflow-hidden mb-4" style={{ border: "1px solid var(--border)" }}>
        <button
          onClick={() => switchTab("A")}
          className="flex-1 flex items-center justify-center gap-2 px-4 py-3 text-sm font-medium transition-all hover:opacity-90"
          style={{
            background: activeTab === "A" ? `${COLOR_A}15` : "var(--bg-sunken)",
            color: activeTab === "A" ? COLOR_A : "var(--text-muted)",
            borderBottom: activeTab === "A" ? `2px solid ${COLOR_A}` : "2px solid transparent",
          }}
        >
          <span className="text-xs font-bold px-1.5 py-0.5 rounded" style={{ background: `${COLOR_A}20`, color: COLOR_A }}>A</span>
          <span className="truncate">{leftLabel}</span>
        </button>
        <div style={{ width: 1, background: "var(--border)", alignSelf: "stretch" }} />
        <button
          onClick={() => switchTab("B")}
          className="flex-1 flex items-center justify-center gap-2 px-4 py-3 text-sm font-medium transition-all hover:opacity-90"
          style={{
            background: activeTab === "B" ? `${COLOR_B}15` : "var(--bg-sunken)",
            color: activeTab === "B" ? COLOR_B : "var(--text-muted)",
            borderBottom: activeTab === "B" ? `2px solid ${COLOR_B}` : "2px solid transparent",
          }}
        >
          <span className="text-xs font-bold px-1.5 py-0.5 rounded" style={{ background: `${COLOR_B}20`, color: COLOR_B }}>B</span>
          <span className="truncate">{rightLabel}</span>
        </button>
      </div>

      {/* Content */}
      <div className="rounded-2xl overflow-hidden" style={{ border: "1px solid var(--border)" }}>
        <div
          ref={contentRef}
          key={activeTab}
          className="border-l-4 border-r-4 animate-slide-in"
          style={{
            borderLeftColor: activeTab === "A" ? COLOR_A : "transparent",
            borderRightColor: activeTab === "B" ? COLOR_B : "transparent",
            "--slide-from": direction === "left" ? "30px" : "-30px",
          } as React.CSSProperties}
        >
          {activeTab === "A" ? leftContent : rightContent}
        </div>
      </div>

      <style jsx>{`
        @keyframes slideIn {
          from {
            opacity: 0;
            transform: translateX(var(--slide-from));
          }
          to {
            opacity: 1;
            transform: translateX(0);
          }
        }
        .animate-slide-in {
          animation: slideIn 0.05s ease-out;
        }
      `}</style>
    </div>
  );
}
