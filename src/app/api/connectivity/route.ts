import { NextRequest, NextResponse } from "next/server";

// Overpass API — query nearby amenities within a radius
// Multiple Overpass endpoints for failover
const OVERPASS_URLS = [
  "https://overpass-api.de/api/interpreter",
  "https://overpass.kumi.systems/api/interpreter",
  "https://overpass.openstreetmap.ru/api/interpreter",
];

async function fetchOverpass(query: string): Promise<Record<string, unknown>> {
  for (const url of OVERPASS_URLS) {
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 12000);
      const res = await fetch(url, {
        method: "POST",
        body: `data=${encodeURIComponent(query)}`,
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        signal: controller.signal,
      });
      clearTimeout(timeout);
      if (!res.ok) continue;
      const text = await res.text();
      if (text.startsWith("<")) continue; // HTML error page
      return JSON.parse(text);
    } catch {
      continue;
    }
  }
  throw new Error("All Overpass endpoints failed");
}

interface AmenityResult {
  type: string;
  name: string;
  distance: number;
}

function haversine(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371000;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export async function GET(req: NextRequest) {
  const lat = parseFloat(req.nextUrl.searchParams.get("lat") || "0");
  const lng = parseFloat(req.nextUrl.searchParams.get("lng") || "0");
  if (!lat || !lng) return NextResponse.json({ error: "Missing lat/lng" }, { status: 400 });

  const radius = 1200; // 1.2km for most amenities
  const trainRadius = 3000; // 3km for train/metro stations

  // Overpass query for multiple amenity types
  const query = `
    [out:json][timeout:15];
    (
      node["railway"="station"](around:${trainRadius},${lat},${lng});
      way["railway"="station"](around:${trainRadius},${lat},${lng});
      node["railway"="halt"](around:${trainRadius},${lat},${lng});
      node["railway"="stop"]["train"="yes"](around:${trainRadius},${lat},${lng});
      node["railway"="stop"]["subway"="yes"](around:${trainRadius},${lat},${lng});
      node["railway"="stop"]["light_rail"="yes"](around:${trainRadius},${lat},${lng});
      node["station"="subway"](around:${trainRadius},${lat},${lng});
      node["highway"="bus_stop"](around:${radius},${lat},${lng});
      node["amenity"="school"](around:${radius},${lat},${lng});
      way["amenity"="school"](around:${radius},${lat},${lng});
      node["shop"="supermarket"](around:${radius},${lat},${lng});
      node["shop"="mall"](around:${radius},${lat},${lng});
      way["shop"="mall"](around:${radius},${lat},${lng});
      node["amenity"="hospital"](around:${radius},${lat},${lng});
      way["amenity"="hospital"](around:${radius},${lat},${lng});
      node["amenity"="clinic"](around:${radius},${lat},${lng});
      node["amenity"="doctors"](around:${radius},${lat},${lng});
      node["leisure"="park"](around:800,${lat},${lng});
      way["leisure"="park"](around:800,${lat},${lng});
      node["amenity"="pharmacy"](around:${radius},${lat},${lng});
      node["amenity"="restaurant"](around:800,${lat},${lng});
      node["amenity"="cafe"](around:800,${lat},${lng});
    );
    out center;
  `;

  try {
    const data = await fetchOverpass(query);
    const elements = (data.elements || []) as Record<string, unknown>[];

    const categorize = (el: Record<string, unknown>): { type: string; name: string } | null => {
      const tags = el.tags as Record<string, string> | undefined;
      if (!tags) return null;
      if (tags.railway === "station" || tags.railway === "halt" || (tags.railway === "stop" && (tags.train === "yes" || tags.subway === "yes" || tags.light_rail === "yes")) || tags.station === "subway")
        return { type: "train", name: tags.name || "Train/Metro Station" };
      if (tags.highway === "bus_stop")
        return { type: "bus", name: tags.name || "Bus Stop" };
      if (tags.amenity === "school")
        return { type: "school", name: tags.name || "School" };
      if (tags.shop === "supermarket")
        return { type: "shopping", name: tags.name || "Supermarket" };
      if (tags.shop === "mall")
        return { type: "shopping", name: tags.name || "Shopping Centre" };
      if (tags.amenity === "hospital")
        return { type: "medical", name: tags.name || "Hospital" };
      if (tags.amenity === "clinic" || tags.amenity === "doctors")
        return { type: "medical", name: tags.name || "Medical Centre" };
      if (tags.leisure === "park")
        return { type: "park", name: tags.name || "Park" };
      if (tags.amenity === "pharmacy")
        return { type: "medical", name: tags.name || "Pharmacy" };
      if (tags.amenity === "restaurant" || tags.amenity === "cafe")
        return { type: "dining", name: tags.name || "Restaurant/Cafe" };
      return null;
    };

    const amenities: AmenityResult[] = [];

    for (const el of elements) {
      const cat = categorize(el);
      if (!cat) continue;
      const elLat = (el.lat as number) || (el.center as { lat: number })?.lat;
      const elLon = (el.lon as number) || (el.center as { lon: number })?.lon;
      if (!elLat || !elLon) continue;
      const dist = Math.round(haversine(lat, lng, elLat, elLon));
      amenities.push({ ...cat, distance: dist });
    }

    // Sort by distance within each category
    amenities.sort((a, b) => a.distance - b.distance);

    // Deduplicate by name within each type (OSM often has multiple nodes for same station)
    const deduped: AmenityResult[] = [];
    const seenKeys = new Set<string>();
    for (const a of amenities) {
      const key = `${a.type}:${a.name}`;
      if (seenKeys.has(key)) continue;
      seenKeys.add(key);
      deduped.push(a);
    }

    // Group by type
    const grouped: Record<string, AmenityResult[]> = {};
    for (const a of deduped) {
      if (!grouped[a.type]) grouped[a.type] = [];
      grouped[a.type].push(a);
    }

    // Calculate connectivity score (0-10)
    const trainStations = grouped.train || [];
    const busStops = grouped.bus || [];
    const schools = grouped.school || [];
    const shops = grouped.shopping || [];
    const medical = grouped.medical || [];
    const parks = grouped.park || [];
    const dining = grouped.dining || [];

    let score = 0;
    // Train within 1km = huge bonus, within 2km = good, within 3km = ok
    if (trainStations.length > 0 && trainStations[0].distance <= 1000) score += 3;
    else if (trainStations.length > 0 && trainStations[0].distance <= 2000) score += 2;
    else if (trainStations.length > 0 && trainStations[0].distance <= 3000) score += 1;
    // Bus stops
    if (busStops.length >= 5) score += 1.5;
    else if (busStops.length >= 2) score += 1;
    else if (busStops.length >= 1) score += 0.5;
    // Schools
    if (schools.length >= 2) score += 1;
    else if (schools.length >= 1) score += 0.5;
    // Shopping
    if (shops.length >= 1) score += 1;
    // Medical
    if (medical.length >= 2) score += 1;
    else if (medical.length >= 1) score += 0.5;
    // Parks
    if (parks.length >= 2) score += 1;
    else if (parks.length >= 1) score += 0.5;
    // Dining
    if (dining.length >= 5) score += 1;
    else if (dining.length >= 2) score += 0.5;

    score = Math.min(10, Math.round(score * 10) / 10);

    return NextResponse.json({
      score,
      summary: {
        train: trainStations.slice(0, 3),
        bus: busStops.slice(0, 5),
        school: schools.slice(0, 5),
        shopping: shops.slice(0, 3),
        medical: medical.slice(0, 3),
        park: parks.slice(0, 3),
        dining: dining.slice(0, 5),
      },
      counts: {
        train: trainStations.length,
        bus: busStops.length,
        school: schools.length,
        shopping: shops.length,
        medical: medical.length,
        park: parks.length,
        dining: dining.length,
      },
    });
  } catch {
    return NextResponse.json({ error: "Failed to fetch connectivity data" }, { status: 500 });
  }
}
