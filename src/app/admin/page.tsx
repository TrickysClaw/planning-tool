"use client";

import { useEffect, useState } from "react";
import { createBrowserClient } from "@/lib/supabase";

interface AccessRequest {
  id: string;
  email: string;
  status: string;
  created_at: string;
  approved_at: string | null;
}

export default function AdminPage() {
  const [requests, setRequests] = useState<AccessRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [generatedCreds, setGeneratedCreds] = useState<{ email: string; password: string } | null>(null);

  const supabase = createBrowserClient();

  async function getToken() {
    const { data } = await supabase.auth.getSession();
    return data.session?.access_token;
  }

  async function fetchRequests() {
    const token = await getToken();
    if (!token) {
      window.location.href = "/login";
      return;
    }

    const res = await fetch("/api/auth/admin", {
      headers: { Authorization: `Bearer ${token}` },
    });

    if (res.status === 403 || res.status === 401) {
      window.location.href = "/";
      return;
    }

    const data = await res.json();
    setRequests(data.requests || []);
    setLoading(false);
  }

  async function handleAction(requestId: string, action: "approve" | "reject") {
    setActionLoading(requestId);
    setGeneratedCreds(null);
    const token = await getToken();

    const res = await fetch("/api/auth/admin", {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify({ requestId, action }),
    });

    const data = await res.json();

    if (action === "approve" && data.success) {
      setGeneratedCreds({ email: data.email, password: data.password });
    }

    setActionLoading(null);
    fetchRequests();
  }

  useEffect(() => { fetchRequests(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-950">
        <p className="text-gray-500">Loading...</p>
      </div>
    );
  }

  const pending = requests.filter((r) => r.status === "pending");
  const processed = requests.filter((r) => r.status !== "pending");

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 px-4 py-6 sm:p-6">
      <div className="max-w-3xl mx-auto">
        <h1 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white mb-6">Access Requests</h1>

        {generatedCreds && (
          <div className="mb-6 p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-xl">
            <p className="font-medium text-green-800 dark:text-green-300 mb-2">User approved!</p>
            <p className="text-sm text-green-700 dark:text-green-400">
              Email: <span className="font-mono">{generatedCreds.email}</span>
            </p>
            <p className="text-sm text-green-700 dark:text-green-400">
              Password: <span className="font-mono select-all">{generatedCreds.password}</span>
            </p>
            <p className="text-xs text-green-600 dark:text-green-500 mt-2">
              Send this password to the user. They can log in immediately.
            </p>
          </div>
        )}

        {/* Pending */}
        <section className="mb-8">
          <h2 className="text-lg font-semibold text-gray-800 dark:text-gray-200 mb-3">
            Pending ({pending.length})
          </h2>
          {pending.length === 0 ? (
            <p className="text-gray-500 text-sm">No pending requests</p>
          ) : (
            <div className="space-y-3">
              {pending.map((r) => (
                <div
                  key={r.id}
                  className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl"
                >
                  <div className="min-w-0">
                    <p className="font-medium text-gray-900 dark:text-white truncate">{r.email}</p>
                    <p className="text-xs text-gray-500">{new Date(r.created_at).toLocaleDateString()}</p>
                  </div>
                  <div className="flex gap-2 shrink-0">
                    <button
                      onClick={() => handleAction(r.id, "approve")}
                      disabled={actionLoading === r.id}
                      className="flex-1 sm:flex-none px-3 py-1.5 text-sm font-medium bg-green-600 hover:bg-green-700 disabled:opacity-50 text-white rounded-lg"
                    >
                      Approve
                    </button>
                    <button
                      onClick={() => handleAction(r.id, "reject")}
                      disabled={actionLoading === r.id}
                      className="flex-1 sm:flex-none px-3 py-1.5 text-sm font-medium bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white rounded-lg"
                    >
                      Reject
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* Processed */}
        <section>
          <h2 className="text-lg font-semibold text-gray-800 dark:text-gray-200 mb-3">
            Processed ({processed.length})
          </h2>
          {processed.length === 0 ? (
            <p className="text-gray-500 text-sm">No processed requests yet</p>
          ) : (
            <div className="space-y-2">
              {processed.map((r) => (
                <div
                  key={r.id}
                  className="flex items-center justify-between gap-2 p-3 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-lg opacity-70"
                >
                  <div className="min-w-0">
                    <p className="text-sm text-gray-900 dark:text-white truncate">{r.email}</p>
                    <p className="text-xs text-gray-500">{new Date(r.created_at).toLocaleDateString()}</p>
                  </div>
                  <span className={`text-xs px-2 py-1 rounded-full ${
                    r.status === "approved"
                      ? "bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400"
                      : "bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400"
                  }`}>
                    {r.status}
                  </span>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
