import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  const q = req.nextUrl.searchParams.get("q") || "";
  if (!q) return NextResponse.json([]);

  // Use Nominatim with structured query + addressdetails for better street-level results
  const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(q + ", NSW, Australia")}&format=json&limit=8&countrycodes=au&addressdetails=1`;
  const res = await fetch(url, { headers: { "User-Agent": "NSWPlanningTool/1.0" } });
  const data = await res.json();

  // Filter to NSW results only and deduplicate
  const seen = new Set<string>();
  const filtered = data.filter((r: Record<string, unknown>) => {
    const addr = r.address as Record<string, string> | undefined;
    const state = addr?.state || "";
    if (!state.includes("New South Wales")) return false;
    const key = `${Number(r.lat as string).toFixed(4)},${Number(r.lon as string).toFixed(4)}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });

  return NextResponse.json(filtered);
}
