"use client";
import { useState, useRef, useCallback, useEffect } from "react";
import { GripVertical } from "lucide-react";

interface CompareSliderProps {
  leftContent: React.ReactNode;
  rightContent: React.ReactNode;
  leftLabel?: string;
  rightLabel?: string;
}

export default function CompareSlider({ leftContent, rightContent, leftLabel = "Property A", rightLabel = "Property B" }: CompareSliderProps) {
  const [position, setPosition] = useState(50);
  const containerRef = useRef<HTMLDivElement>(null);
  const dragging = useRef(false);

  const handleMove = useCallback((clientX: number) => {
    if (!containerRef.current || !dragging.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const x = clientX - rect.left;
    const pct = Math.max(10, Math.min(90, (x / rect.width) * 100));
    setPosition(pct);
  }, []);

  const handleMouseDown = useCallback(() => {
    dragging.current = true;
    document.body.style.cursor = "col-resize";
    document.body.style.userSelect = "none";
  }, []);

  const handleMouseUp = useCallback(() => {
    dragging.current = false;
    document.body.style.cursor = "";
    document.body.style.userSelect = "";
  }, []);

  useEffect(() => {
    const onMove = (e: MouseEvent) => handleMove(e.clientX);
    const onTouchMove = (e: TouchEvent) => handleMove(e.touches[0].clientX);
    const onUp = () => handleMouseUp();

    document.addEventListener("mousemove", onMove);
    document.addEventListener("mouseup", onUp);
    document.addEventListener("touchmove", onTouchMove);
    document.addEventListener("touchend", onUp);

    return () => {
      document.removeEventListener("mousemove", onMove);
      document.removeEventListener("mouseup", onUp);
      document.removeEventListener("touchmove", onTouchMove);
      document.removeEventListener("touchend", onUp);
    };
  }, [handleMove, handleMouseUp]);

  return (
    <div className="relative w-full" ref={containerRef}>
      {/* Labels */}
      <div className="flex items-center justify-between mb-3 px-1">
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold px-2 py-0.5 rounded" style={{ background: "#3B82F620", color: "#3B82F6" }}>A</span>
          <span className="text-xs font-medium" style={{ color: "var(--text-muted)" }}>{leftLabel}</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs font-medium" style={{ color: "var(--text-muted)" }}>{rightLabel}</span>
          <span className="text-xs font-semibold px-2 py-0.5 rounded" style={{ background: "#F59E0B20", color: "#F59E0B" }}>B</span>
        </div>
      </div>

      {/* Slider container */}
      <div className="relative overflow-hidden rounded-2xl" style={{ border: "1px solid var(--border)" }}>
        {/* Left (Property A) */}
        <div
          className="w-full"
          style={{ clipPath: `inset(0 ${100 - position}% 0 0)` }}
        >
          <div className="border-l-4" style={{ borderColor: "#3B82F6" }}>
            {leftContent}
          </div>
        </div>

        {/* Right (Property B) — absolutely positioned on top */}
        <div
          className="absolute inset-0 w-full"
          style={{ clipPath: `inset(0 0 0 ${position}%)` }}
        >
          <div className="border-l-4" style={{ borderColor: "#F59E0B" }}>
            {rightContent}
          </div>
        </div>

        {/* Slider handle */}
        <div
          className="absolute top-0 bottom-0 z-30 flex items-center justify-center"
          style={{ left: `${position}%`, transform: "translateX(-50%)" }}
        >
          <div
            className="h-full w-1 relative cursor-col-resize group"
            style={{ background: "var(--border)" }}
            onMouseDown={handleMouseDown}
            onTouchStart={handleMouseDown}
          >
            {/* Handle grip */}
            <div
              className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-8 h-12 rounded-lg flex items-center justify-center shadow-lg transition-transform group-hover:scale-110"
              style={{ background: "var(--bg-elevated)", border: "1px solid var(--border)" }}
            >
              <GripVertical size={16} style={{ color: "var(--text-muted)" }} />
            </div>
          </div>
        </div>
      </div>

      {/* Position indicator */}
      <div className="flex justify-center mt-2">
        <span className="text-[10px]" style={{ color: "var(--text-muted)" }}>
          {Math.round(position)}% / {Math.round(100 - position)}%
        </span>
      </div>
    </div>
  );
}
