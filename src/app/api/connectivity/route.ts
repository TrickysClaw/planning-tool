import { NextRequest, NextResponse } from "next/server";
import { haversineKm } from "@/lib/geo";
import { STATIONS } from "@/data/stations";

const OVERPASS_URLS = [
  "https://overpass-api.de/api/interpreter",
  "https://overpass.kumi.systems/api/interpreter",
  "https://overpass.openstreetmap.ru/api/interpreter",
];

interface AmenityResult {
  type: string;
  name: string;
  distance: number;
}

function getStaticTrainStations(lat: number, lng: number): AmenityResult[] {
  return STATIONS
    .map((s) => ({ type: "train", name: `${s.name} (${s.type === "metro" ? "Metro" : s.type === "light_rail" ? "Light Rail" : "Train"})`, distance: Math.round(haversineKm(lat, lng, s.lat, s.lng) * 1000) }))
    .filter((s) => s.distance <= 3000)
    .sort((a, b) => a.distance - b.distance);
}

async function fetchOverpass(query: string): Promise<{ elements?: Record<string, unknown>[] }> {
  for (const url of OVERPASS_URLS) {
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 20000);
      const res = await fetch(url, {
        method: "POST",
        body: `data=${encodeURIComponent(query)}`,
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        signal: controller.signal,
      });
      clearTimeout(timeout);
      if (!res.ok) continue;
      const text = await res.text();
      if (text.startsWith("<")) continue;
      return JSON.parse(text);
    } catch {
      continue;
    }
  }
  throw new Error("All Overpass endpoints failed");
}

function categorize(tags: Record<string, string>): { type: string; name: string } | null {
  if (tags.highway === "bus_stop" || tags.public_transport === "platform" || tags.public_transport === "stop_position") return { type: "bus", name: tags.name || "Bus Stop" };
  if (tags.amenity === "school" || tags.amenity === "kindergarten") return { type: "school", name: tags.name || "School" };
  if (tags.shop === "supermarket" || tags.shop === "convenience") return { type: "shopping", name: tags.name || "Supermarket" };
  if (tags.shop === "mall" || tags.shop === "department_store") return { type: "shopping", name: tags.name || "Shopping Centre" };
  if (tags.amenity === "marketplace") return { type: "shopping", name: tags.name || "Market" };
  if (tags.amenity === "hospital") return { type: "medical", name: tags.name || "Hospital" };
  if (tags.amenity === "clinic" || tags.amenity === "doctors" || tags.healthcare) return { type: "medical", name: tags.name || "Medical Centre" };
  if (tags.amenity === "pharmacy") return { type: "medical", name: tags.name || "Pharmacy" };
  if (tags.leisure === "park" || tags.leisure === "garden" || tags.leisure === "playground") return { type: "park", name: tags.name || "Park" };
  if (tags.amenity === "restaurant" || tags.amenity === "cafe" || tags.amenity === "fast_food") return { type: "dining", name: tags.name || "Restaurant/Cafe" };
  return null;
}

function computeScore(grouped: Record<string, AmenityResult[]>): number {
  const trains = grouped.train || [];
  const bus = grouped.bus || [];
  const schools = grouped.school || [];
  const shops = grouped.shopping || [];
  const medical = grouped.medical || [];
  const parks = grouped.park || [];
  const dining = grouped.dining || [];

  let score = 0;
  if (trains.length > 0 && trains[0].distance <= 1000) score += 3;
  else if (trains.length > 0 && trains[0].distance <= 2000) score += 2;
  else if (trains.length > 0) score += 1;
  if (bus.length >= 5) score += 1.5;
  else if (bus.length >= 2) score += 1;
  else if (bus.length >= 1) score += 0.5;
  if (schools.length >= 2) score += 1;
  else if (schools.length >= 1) score += 0.5;
  if (shops.length >= 1) score += 1;
  if (medical.length >= 2) score += 1;
  else if (medical.length >= 1) score += 0.5;
  if (parks.length >= 2) score += 1;
  else if (parks.length >= 1) score += 0.5;
  if (dining.length >= 5) score += 1;
  else if (dining.length >= 2) score += 0.5;

  return Math.min(10, Math.round(score * 10) / 10);
}

export async function GET(req: NextRequest) {
  const lat = parseFloat(req.nextUrl.searchParams.get("lat") || "0");
  const lng = parseFloat(req.nextUrl.searchParams.get("lng") || "0");
  if (!lat || !lng) return NextResponse.json({ error: "Missing lat/lng" }, { status: 400 });

  const radius = 1200;
  const trainStations = getStaticTrainStations(lat, lng);

  const query = `
    [out:json][timeout:25];
    (
      node["highway"="bus_stop"](around:${radius},${lat},${lng});
      node["public_transport"="platform"](around:${radius},${lat},${lng});
      nwr["amenity"="school"](around:${radius},${lat},${lng});
      nwr["amenity"="kindergarten"](around:${radius},${lat},${lng});
      nwr["shop"="supermarket"](around:${radius},${lat},${lng});
      nwr["shop"="convenience"](around:800,${lat},${lng});
      nwr["shop"="mall"](around:${radius},${lat},${lng});
      nwr["shop"="department_store"](around:${radius},${lat},${lng});
      nwr["amenity"="hospital"](around:${radius},${lat},${lng});
      nwr["amenity"="clinic"](around:${radius},${lat},${lng});
      nwr["amenity"="doctors"](around:${radius},${lat},${lng});
      nwr["healthcare"](around:${radius},${lat},${lng});
      nwr["amenity"="pharmacy"](around:${radius},${lat},${lng});
      nwr["leisure"="park"](around:${radius},${lat},${lng});
      nwr["leisure"="garden"](around:800,${lat},${lng});
      nwr["leisure"="playground"](around:800,${lat},${lng});
      node["amenity"="restaurant"](around:${radius},${lat},${lng});
      node["amenity"="cafe"](around:${radius},${lat},${lng});
      node["amenity"="fast_food"](around:800,${lat},${lng});
    );
    out center;
  `;

  let amenities: AmenityResult[] = [];
  let overpassFailed = false;

  try {
    const data = await fetchOverpass(query);
    const elements = (data.elements || []) as Record<string, unknown>[];
    for (const el of elements) {
      const tags = el.tags as Record<string, string> | undefined;
      if (!tags) continue;
      const cat = categorize(tags);
      if (!cat) continue;
      const elLat = (el.lat as number) || (el.center as { lat: number })?.lat;
      const elLon = (el.lon as number) || (el.center as { lon: number })?.lon;
      if (!elLat || !elLon) continue;
      amenities.push({ ...cat, distance: Math.round(haversineKm(lat, lng, elLat, elLon) * 1000) });
    }
  } catch {
    overpassFailed = true;
  }

  // Combine + deduplicate
  const all = [...trainStations, ...amenities].sort((a, b) => a.distance - b.distance);
  const seen = new Set<string>();
  const deduped: AmenityResult[] = [];
  for (const a of all) {
    const key = `${a.type}:${a.name}`;
    if (seen.has(key)) continue;
    seen.add(key);
    deduped.push(a);
  }

  // Group by type
  const grouped: Record<string, AmenityResult[]> = {};
  for (const a of deduped) {
    if (!grouped[a.type]) grouped[a.type] = [];
    grouped[a.type].push(a);
  }

  const score = computeScore(grouped);

  return NextResponse.json({
    score,
    summary: {
      train: (grouped.train || []).slice(0, 3),
      bus: (grouped.bus || []).slice(0, 5),
      school: (grouped.school || []).slice(0, 5),
      shopping: (grouped.shopping || []).slice(0, 3),
      medical: (grouped.medical || []).slice(0, 3),
      park: (grouped.park || []).slice(0, 3),
      dining: (grouped.dining || []).slice(0, 5),
    },
    counts: {
      train: (grouped.train || []).length,
      bus: (grouped.bus || []).length,
      school: (grouped.school || []).length,
      shopping: (grouped.shopping || []).length,
      medical: (grouped.medical || []).length,
      park: (grouped.park || []).length,
      dining: (grouped.dining || []).length,
    },
    ...(overpassFailed ? { overpassError: true } : {}),
  });
}
