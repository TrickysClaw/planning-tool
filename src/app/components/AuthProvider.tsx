"use client";

import { createBrowserClient } from "@/lib/supabase";
import { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { Session } from "@supabase/supabase-js";

const PUBLIC_PATHS = ["/login"];

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null | undefined>(undefined);
  const router = useRouter();
  const pathname = usePathname();
  const supabase = createBrowserClient();

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });

    return () => subscription.unsubscribe();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (session === undefined) return; // still loading

    const isPublic = PUBLIC_PATHS.some((p) => pathname.startsWith(p));

    if (!session && !isPublic) {
      router.replace("/login");
    } else if (session && pathname === "/login") {
      router.replace("/");
    }
  }, [session, pathname, router]);

  // Still loading auth state
  if (session === undefined) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-950">
        <div className="animate-pulse text-gray-400">Loading...</div>
      </div>
    );
  }

  // Not authenticated and not on public page - show nothing while redirecting
  const isPublic = PUBLIC_PATHS.some((p) => pathname.startsWith(p));
  if (!session && !isPublic) {
    return null;
  }

  return <>{children}</>;
}
