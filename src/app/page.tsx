"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import dynamic from "next/dynamic";
import SearchBar from "./components/SearchBar";
import ThemeToggle from "./components/ThemeToggle";
import OnboardingModal from "./components/OnboardingModal";
import { LogOut, Shield, Settings } from "lucide-react";
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
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [showEditProfile, setShowEditProfile] = useState(false);
  const [userProfile, setUserProfile] = useState<{ role: string; goal: string } | null>(null);
  const supabase = createBrowserClient();

  useEffect(() => {
    setSearchHistory(getSearchHistory());
    supabase.auth.getUser().then(({ data: { user } }) => {
      setUserEmail(user?.email || null);
      if (user) {
        // Check if profile exists
        fetch("/api/profile").then(r => r.json()).then(({ profile }) => {
          if (!profile) setShowOnboarding(true);
          else setUserProfile(profile);
        }).catch(() => {});
      }
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
        <div className="fixed top-4 left-4 right-4 z-50 flex items-center justify-end pointer-events-auto">
          <div className="flex items-center gap-1.5 ml-2">
            {(process.env.NEXT_PUBLIC_ADMIN_EMAILS || "").split(",").map(e => e.trim().toLowerCase()).includes(userEmail?.toLowerCase() || "") && (
              <Link href="/admin" className="p-2 rounded-lg border cursor-pointer transition-all duration-150 hover:scale-110 hover:shadow-md active:scale-95" style={{ background: "var(--input-bg)", borderColor: "var(--border)", color: "var(--text-secondary)" }} title="Admin">
                <Shield size={18} />
              </Link>
            )}
            <button onClick={() => setShowEditProfile(true)} className="p-2 rounded-lg border cursor-pointer transition-all duration-150 hover:scale-110 hover:shadow-md active:scale-95" style={{ background: "var(--input-bg)", borderColor: "var(--border)", color: "var(--text-secondary)" }} title="Profile Settings">
              <Settings size={18} />
            </button>
            <button onClick={handleSignOut} className="p-2 rounded-lg border cursor-pointer transition-all duration-150 hover:scale-110 hover:shadow-md active:scale-95" style={{ background: "var(--input-bg)", borderColor: "var(--border)", color: "var(--text-secondary)" }} title="Sign Out">
              <LogOut size={18} />
            </button>
            <ThemeToggle />
          </div>
        </div>

        <div className="text-center mt-24 md:mt-32 mb-8">
          <motion.h1 initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} className="text-4xl md:text-5xl font-bold mb-3" style={{ color: "var(--text-primary)" }}>
            Landlytic
          </motion.h1>
          <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.2 }} className="text-lg" style={{ color: "var(--text-muted)" }}>
            Property intelligence for NSW.
          </motion.p>
        </div>

        <div className="pointer-events-auto">
          <SearchBar onSelect={handleSelect} searchHistory={searchHistory} onHistoryClick={handleHistoryClick} />
        </div>
      </main>

      {showOnboarding && (
        <OnboardingModal
          onComplete={(p) => { setUserProfile(p); setShowOnboarding(false); }}
          onSkip={() => setShowOnboarding(false)}
        />
      )}

      {showEditProfile && (
        <OnboardingModal
          isEditing
          initialRole={userProfile?.role || ""}
          initialGoal={userProfile?.goal || ""}
          onComplete={(p) => { setUserProfile(p); setShowEditProfile(false); }}
          onSkip={() => setShowEditProfile(false)}
        />
      )}
    </>
  );
}
