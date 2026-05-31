export function formatAUD(n: number): string {
  if (!n) return "";
  return new Intl.NumberFormat("en-AU", { style: "currency", currency: "AUD", maximumFractionDigits: 0 }).format(n);
}

export function formatDate(d: string): string {
  if (!d) return "";
  try {
    return new Date(d).toLocaleDateString("en-AU", { day: "numeric", month: "short", year: "numeric" });
  } catch {
    return d;
  }
}

export const STATUS_STYLES: Record<string, { bg: string; color: string }> = {
  Determined: { bg: "var(--success-bg)", color: "var(--success)" },
  "Under Assessment": { bg: "var(--warning-bg)", color: "var(--warning)" },
  Rejected: { bg: "var(--danger-bg)", color: "var(--danger)" },
  "On Exhibition": { bg: "var(--info-bg)", color: "var(--info)" },
  Withdrawn: { bg: "rgba(100,116,139,0.1)", color: "#64748B" },
  Registered: { bg: "var(--info-bg)", color: "var(--info)" },
  "Additional Information Requested": { bg: "var(--warning-bg)", color: "var(--warning)" },
  Deferred: { bg: "rgba(139,92,246,0.1)", color: "#7C3AED" },
  Pending: { bg: "rgba(100,116,139,0.1)", color: "#64748B" },
};

export function getStatusStyle(status: string): { bg: string; color: string } {
  for (const [key, val] of Object.entries(STATUS_STYLES)) {
    if (status.toLowerCase().includes(key.toLowerCase())) return val;
  }
  return { bg: "rgba(100,116,139,0.1)", color: "#64748B" };
}

// Keep legacy class-based version for backward compat
export const STATUS_COLORS: Record<string, string> = {
  Determined: "bg-indigo-500/20 text-indigo-300",
  "Under Assessment": "bg-yellow-500/20 text-yellow-300",
  Rejected: "bg-red-500/20 text-red-300",
  "On Exhibition": "bg-blue-500/20 text-blue-300",
  Withdrawn: "bg-slate-500/20 text-slate-400",
  Registered: "bg-cyan-500/20 text-cyan-300",
  "Additional Information Requested": "bg-orange-500/20 text-orange-300",
  Deferred: "bg-purple-500/20 text-purple-300",
  Pending: "bg-slate-500/20 text-slate-400",
};

export function getStatusColor(status: string): string {
  for (const [key, val] of Object.entries(STATUS_COLORS)) {
    if (status.toLowerCase().includes(key.toLowerCase())) return val;
  }
  return "bg-slate-500/20 text-slate-400";
}

