"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import dynamic from "next/dynamic";
import SearchBar from "./components/SearchBar";
import ThemeToggle from "./components/ThemeToggle";
import { Search, Construction, SlidersHorizontal, LogOut, Shield, Building2, Ruler, Activity, ArrowUpRight } from "lucide-react";
import Link from "next/link";
import { createBrowserClient } from "@/lib/supabase";

const MapBackground = dynamic(() => import("./components/MapBackgroundInner"), { ssr: false });

interface SearchHistoryEntry {
  address: string;
  lat: number;
  lng: number;
  zone: string;
  timestamp: number;
}

function getSearchHistory(): SearchHistoryEntry[] {
  if (typeof window === "undefined") return [];
  try {
    return JSON.parse(localStorage.getItem("planning-search-history") || "[]");
  } catch { return []; }
}

const CAPABILITIES = [
  {
    icon: Building2,
    title: "Zoning & controls",
    desc: "Permitted uses, FSR, height and lot-size limits pulled from council LEPs.",
  },
  {
    icon: Ruler,
    title: "Build envelope",
    desc: "What you can actually build — storeys, max GFA and subdivision potential.",
  },
  {
    icon: Activity,
    title: "Live development activity",
    desc: "DAs, CDCs and state-significant projects mapped within your radius.",
  },
];

export default function Home() {
  const router = useRouter();
  const [searchHistory, setSearchHistory] = useState<SearchHistoryEntry[]>([]);
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const supabase = createBrowserClient();

  useEffect(() => {
    setSearchHistory(getSearchHistory());
    supabase.auth.getUser().then(({ data: { user } }) => {
      setUserEmail(user?.email || null);
    });
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  async function handleSignOut() {
    await supabase.auth.signOut();
    router.replace("/login");
  }

  function handleSelect(r: { display_name: string; lat: string; lon: string }) {
    router.push(`/address?lat=${r.lat}&lng=${r.lon}&q=${encodeURIComponent(r.display_name)}`);
  }

  function handleHistoryClick(entry: SearchHistoryEntry) {
    router.push(`/address?lat=${entry.lat}&lng=${entry.lng}&q=${encodeURIComponent(entry.address)}`);
  }

  return (
    <>
      <MapBackground />
      <main className="relative z-30 min-h-screen px-4 pt-4 pb-12 md:pb-20 pointer-events-none">
        {/* Top bar: nav tabs + theme toggle pinned to top */}
        <header className="fixed top-4 left-4 right-4 z-50 flex items-center justify-between pointer-events-auto">
          <Link href="/" className="flex items-center gap-2 pl-1">
            <span className="flex items-center justify-center w-7 h-7 rounded-md" style={{ background: "var(--accent)", color: "var(--text-inverted)" }}>
              <Building2 size={16} />
            </span>
            <span className="font-semibold text-sm tracking-tight" style={{ color: "var(--text-primary)" }}>PlanView</span>
          </Link>

          <nav className="hidden sm:inline-flex rounded-xl p-1 gap-1 backdrop-blur-sm" style={{ background: "var(--bg-sunken)", border: "1px solid var(--border)" }}>
            <span className="nav-seg" data-active="true">
              <Search size={14} />
              Home
            </span>
            <Link href="/search" className="nav-seg">
              <SlidersHorizontal size={14} />
              Site Search
              <span className="text-[10px] font-medium uppercase tracking-wider opacity-50">beta</span>
            </Link>
            <Link href="/ssda" className="nav-seg">
              <Construction size={14} />
              Major Projects
              <span className="text-[10px] font-medium uppercase tracking-wider opacity-50">beta</span>
            </Link>
          </nav>

          <div className="flex items-center gap-1.5">
            {userEmail === process.env.NEXT_PUBLIC_ADMIN_EMAIL && (
              <Link href="/admin" className="btn-icon p-2 rounded-lg border" style={{ background: "var(--input-bg)", borderColor: "var(--border)", color: "var(--text-secondary)" }} title="Admin">
                <Shield size={18} />
              </Link>
            )}
            <button onClick={handleSignOut} className="btn-icon p-2 rounded-lg border" style={{ background: "var(--input-bg)", borderColor: "var(--border)", color: "var(--text-secondary)" }} title="Sign Out">
              <LogOut size={18} />
            </button>
            <ThemeToggle />
          </div>
        </header>

        {/* Hero */}
        <div className="max-w-3xl mx-auto text-center mt-28 md:mt-36 mb-7 pointer-events-auto">
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            className="inline-flex items-center gap-2 px-3 py-1 rounded-full mb-6"
            style={{ background: "var(--bg-sunken)", border: "1px solid var(--border)" }}
          >
            <span className="w-1.5 h-1.5 rounded-full" style={{ background: "var(--success)" }} />
            <span className="text-xs font-medium" style={{ color: "var(--text-secondary)" }}>
              Live NSW planning &amp; development data
            </span>
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: -16 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-4xl md:text-6xl font-bold tracking-tight text-balance mb-4"
            style={{ color: "var(--text-primary)" }}
          >
            Property intelligence for NSW
          </motion.h1>

          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.15 }}
            className="text-lg leading-relaxed text-pretty max-w-xl mx-auto"
            style={{ color: "var(--text-muted)" }}
          >
            Search any address to instantly see what you can build — zoning, controls,
            hazards and live development activity on one map.
          </motion.p>
        </div>

        {/* Search */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.25 }}
          className="pointer-events-auto"
        >
          <SearchBar onSelect={handleSelect} searchHistory={searchHistory} onHistoryClick={handleHistoryClick} />
        </motion.div>

        {/* Capability strip */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.35 }}
          className="max-w-2xl mx-auto mt-12 grid grid-cols-1 sm:grid-cols-3 gap-3 pointer-events-auto"
        >
          {CAPABILITIES.map((c) => (
            <div key={c.title} className="glass-card !p-4 text-left">
              <c.icon size={18} style={{ color: "var(--accent)" }} />
              <h3 className="mt-3 text-sm font-semibold" style={{ color: "var(--text-primary)" }}>{c.title}</h3>
              <p className="mt-1 text-xs leading-relaxed" style={{ color: "var(--text-muted)" }}>{c.desc}</p>
            </div>
          ))}
        </motion.div>

        {/* Secondary tools — visible entry points to beta surfaces */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.45 }}
          className="max-w-2xl mx-auto mt-4 flex flex-wrap items-center justify-center gap-2 pointer-events-auto"
        >
          <Link href="/search" className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition" style={{ background: "var(--bg-sunken)", border: "1px solid var(--border)", color: "var(--text-secondary)" }}>
            <SlidersHorizontal size={13} /> Site Search <ArrowUpRight size={12} />
          </Link>
          <Link href="/ssda" className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition" style={{ background: "var(--bg-sunken)", border: "1px solid var(--border)", color: "var(--text-secondary)" }}>
            <Construction size={13} /> Major Projects <ArrowUpRight size={12} />
          </Link>
        </motion.div>
      </main>
    </>
  );
}
