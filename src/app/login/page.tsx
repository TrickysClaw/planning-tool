"use client";

import { useState } from "react";
import { createBrowserClient } from "@/lib/supabase";

export default function LoginPage() {
  const [mode, setMode] = useState<"login" | "request">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const supabase = createBrowserClient();

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setMessage(null);

    const { error } = await supabase.auth.signInWithPassword({ email, password });

    if (error) {
      setMessage({ type: "error", text: error.message });
    } else {
      window.location.href = "/";
    }
    setLoading(false);
  }

  async function handleRequestAccess(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setMessage(null);

    const res = await fetch("/api/auth/request-access", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email }),
    });

    const data = await res.json();
    if (res.ok) {
      setMessage({ type: "success", text: data.message || "Request submitted." });
    } else {
      setMessage({ type: "error", text: data.error || "Something went wrong" });
    }
    setLoading(false);
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-black px-4">
      {/* Subtle grid background */}
      <div className="absolute inset-0 opacity-[0.03]" style={{ backgroundImage: "url(\"data:image/svg+xml,%3Csvg width='40' height='40' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M0 0h40v40H0z' fill='none' stroke='white' stroke-width='0.5'/%3E%3C/svg%3E\")" }} />

      <div className="relative w-full max-w-sm">
        {/* Header */}
        <div className="text-center mb-10">
          <h1 className="text-2xl font-semibold tracking-tight text-white">PlanView</h1>
          <div className="flex items-center justify-center gap-2 mt-3">
            <span className="h-px w-8 bg-neutral-700" />
            <span className="text-[11px] uppercase tracking-[0.2em] text-neutral-500 font-medium">
              {mode === "login" ? "Sign In" : "Request Access"}
            </span>
            <span className="h-px w-8 bg-neutral-700" />
          </div>
        </div>

        {/* Card */}
        <div className="border border-neutral-800 rounded-lg bg-neutral-950 p-6">
          {/* Tab toggle */}
          <div className="flex border-b border-neutral-800 mb-6 -mt-1">
            <button
              onClick={() => { setMode("login"); setMessage(null); }}
              className={`flex-1 pb-3 text-xs font-medium tracking-wide uppercase transition-colors ${
                mode === "login"
                  ? "text-white border-b border-white -mb-px"
                  : "text-neutral-600 hover:text-neutral-400"
              }`}
            >
              Sign In
            </button>
            <button
              onClick={() => { setMode("request"); setMessage(null); }}
              className={`flex-1 pb-3 text-xs font-medium tracking-wide uppercase transition-colors ${
                mode === "request"
                  ? "text-white border-b border-white -mb-px"
                  : "text-neutral-600 hover:text-neutral-400"
              }`}
            >
              Request Access
            </button>
          </div>

          {mode === "login" ? (
            <form onSubmit={handleLogin} className="space-y-4">
              <div>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full px-3 py-2.5 rounded border border-neutral-800 bg-black text-sm text-white placeholder-neutral-600 focus:outline-none focus:border-neutral-600 transition-colors"
                  placeholder="Email"
                />
              </div>
              <div>
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full px-3 py-2.5 rounded border border-neutral-800 bg-black text-sm text-white placeholder-neutral-600 focus:outline-none focus:border-neutral-600 transition-colors"
                  placeholder="Password"
                />
              </div>
              <button
                type="submit"
                disabled={loading}
                className="w-full py-2.5 bg-white hover:bg-neutral-200 disabled:opacity-30 text-black text-sm font-medium rounded transition-colors"
              >
                {loading ? "..." : "Sign In"}
              </button>
            </form>
          ) : (
            <form onSubmit={handleRequestAccess} className="space-y-4">
              <p className="text-xs text-neutral-500 leading-relaxed">
                Invite only. Submit your email and we&apos;ll be in touch.
              </p>
              <div>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full px-3 py-2.5 rounded border border-neutral-800 bg-black text-sm text-white placeholder-neutral-600 focus:outline-none focus:border-neutral-600 transition-colors"
                  placeholder="Email"
                />
              </div>
              <button
                type="submit"
                disabled={loading}
                className="w-full py-2.5 bg-white hover:bg-neutral-200 disabled:opacity-30 text-black text-sm font-medium rounded transition-colors"
              >
                {loading ? "..." : "Request Access"}
              </button>
            </form>
          )}

          {message && (
            <div className={`mt-4 p-3 rounded text-xs ${
              message.type === "success"
                ? "bg-neutral-900 text-green-400 border border-neutral-800"
                : "bg-neutral-900 text-red-400 border border-neutral-800"
            }`}>
              {message.text}
            </div>
          )}
        </div>

        {/* Footer hint */}
        <p className="text-center text-[11px] text-neutral-700 mt-6">
          Under development · Invite only
        </p>
      </div>
    </div>
  );
}
