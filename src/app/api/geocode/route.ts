import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  const q = req.nextUrl.searchParams.get("q") || "";
  if (!q) return NextResponse.json([]);
  const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(q)}&format=json&limit=5&countrycodes=au&viewbox=140.99,-37.51,153.64,-28.15&bounded=1`;
  const res = await fetch(url, { headers: { "User-Agent": "NSWPlanningTool/1.0" } });
  const data = await res.json();
  return NextResponse.json(data);
}
