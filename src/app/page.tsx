"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import dynamic from "next/dynamic";
import SearchBar from "./components/SearchBar";
import ThemeToggle from "./components/ThemeToggle";
import { Search, Construction, SlidersHorizontal, LogOut, Shield } from "lucide-react";
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
        <div className="fixed top-4 left-4 right-4 z-50 flex items-center justify-center pointer-events-auto">
          <div className="inline-flex rounded-xl p-1 gap-1 backdrop-blur-sm" style={{ background: "var(--bg-sunken)", border: "1px solid var(--border)" }}>
            <span className="flex items-center gap-2 px-3 sm:px-4 py-2 rounded-lg text-xs sm:text-sm font-medium" style={{ background: "var(--accent-subtle)", color: "var(--text-primary)" }}>
              <Search size={14} />
              <span className="hidden sm:inline">Home</span>
            </span>
            <Link href="/search" className="flex items-center gap-2 px-3 sm:px-4 py-2 rounded-lg text-xs sm:text-sm font-medium transition" style={{ color: "var(--text-muted)" }}>
              <SlidersHorizontal size={14} />
              <span className="hidden sm:inline">Site Search</span>
              <span className="text-[10px] font-medium uppercase tracking-wider ml-1 opacity-50">beta</span>
            </Link>
            <Link href="/ssda" className="flex items-center gap-2 px-3 sm:px-4 py-2 rounded-lg text-xs sm:text-sm font-medium transition" style={{ color: "var(--text-muted)" }}>
              <Construction size={14} />
              <span className="hidden sm:inline">Major Projects</span>
              <span className="text-[10px] font-medium uppercase tracking-wider ml-1 opacity-50">beta</span>
            </Link>
          </div>
          <div className="absolute right-0 flex items-center gap-1.5">
            {userEmail === process.env.NEXT_PUBLIC_ADMIN_EMAIL && (
              <Link href="/admin" className="p-2 rounded-lg border cursor-pointer transition-all duration-150 hover:scale-110 hover:shadow-md active:scale-95" style={{ background: "var(--input-bg)", borderColor: "var(--border)", color: "var(--text-secondary)" }} title="Admin">
                <Shield size={18} />
              </Link>
            )}
            <button onClick={handleSignOut} className="p-2 rounded-lg border cursor-pointer transition-all duration-150 hover:scale-110 hover:shadow-md active:scale-95" style={{ background: "var(--input-bg)", borderColor: "var(--border)", color: "var(--text-secondary)" }} title="Sign Out">
              <LogOut size={18} />
            </button>
            <ThemeToggle />
          </div>
        </div>

        <div className="text-center mt-24 md:mt-32 mb-8">
          <motion.h1 initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} className="text-4xl md:text-5xl font-bold mb-3" style={{ color: "var(--text-primary)" }}>
            PlanView
          </motion.h1>
          <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.2 }} className="text-lg" style={{ color: "var(--text-muted)" }}>
            Property intelligence for NSW.
          </motion.p>
        </div>

        <div className="pointer-events-auto">
          <SearchBar onSelect={handleSelect} searchHistory={searchHistory} onHistoryClick={handleHistoryClick} />
        </div>
      </main>
    </>
  );
}
