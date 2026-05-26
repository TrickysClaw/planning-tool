import { NextRequest, NextResponse } from "next/server";
import { haversineKm, webMercatorToWGS84 } from "@/lib/geo";
import { HDA_PROJECTS } from "@/data/hdaProjects";
import { SUBURB_CENTROIDS } from "@/data/suburbCentroids";

function getProjectCentroid(suburb: string): { lat: number; lng: number } | null {
  if (!suburb) return null;
  const lower = suburb.trim().toLowerCase();
  for (const [key, val] of Object.entries(SUBURB_CENTROIDS)) {
    if (key.toLowerCase() === lower) return val;
  }
  for (const [key, val] of Object.entries(SUBURB_CENTROIDS)) {
    if (lower.startsWith(key.toLowerCase()) || key.toLowerCase().startsWith(lower)) return val;
  }
  return null;
}

function extractSuburbFromAddress(address: string): string | null {
  const m = address.match(/,\s*([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)/);
  return m ? m[1].trim() : null;
}

async function geocodeAddress(address: string): Promise<{ lat: number; lng: number } | null> {
  try {
    const res = await fetch(
      `https://api.apps1.nsw.gov.au/planning/viewersf/V1/ePlanningApi/address?a=${encodeURIComponent(address)}&noOfRecords=1`
    );
    if (!res.ok) return null;
    const data = await res.json();
    if (!data.length) return null;

    const lotRes = await fetch(
      `https://api.apps1.nsw.gov.au/planning/viewersf/V1/ePlanningApi/lot?propid=${data[0].propId}`
    );
    if (!lotRes.ok) return null;
    const lots = await lotRes.json();
    if (!lots.length || !lots[0].geometry?.rings?.[0]) return null;

    const ring = lots[0].geometry.rings[0] as number[][];
    const mx = ring.reduce((s, p) => s + p[0], 0) / ring.length;
    const my = ring.reduce((s, p) => s + p[1], 0) / ring.length;
    return webMercatorToWGS84(mx, my);
  } catch {
    return null;
  }
}

function getBriefingUrl(briefingDate: string): string {
  const d = briefingDate.replace(/-/g, "");
  const month = briefingDate.slice(0, 7).replace("-", "-");
  return `https://www.planning.nsw.gov.au/sites/default/files/${month}/housing-delivery-authority-record-of-briefing-${d}.pdf`;
}

function describeProject(p: { type: string; dwellings: number | null; recommendation: string; applicant: string; capital_investment: number | string | null }): string {
  const parts: string[] = [];
  const typeLabels: Record<string, string> = {
    Residential: "Residential housing development",
    "Mixed-use": "Mixed-use development (residential + commercial)",
    "Build-to-Rent": "Build-to-Rent residential development",
    Subdivision: "Land subdivision",
    "Seniors housing": "Seniors living / aged care development",
  };
  parts.push(typeLabels[p.type] || `${p.type || "Unknown"} development`);
  if (p.dwellings) parts.push(`proposing ${p.dwellings.toLocaleString()} dwellings`);
  if (p.capital_investment) parts.push(`with $${p.capital_investment} capital investment`);
  if (p.recommendation.includes("Declare")) parts.push("— declared as State Significant Development");
  else if (p.recommendation.includes("Not Declare")) parts.push("— not declared SSD (council assessment)");
  else if (p.recommendation.includes("Deferred")) parts.push("— decision deferred");
  if (p.applicant && p.applicant.length > 3) parts.push(`Applied by ${p.applicant}`);
  return parts.join(" ");
}

export async function GET(req: NextRequest) {
  const address = req.nextUrl.searchParams.get("address") || "";
  const searchLat = parseFloat(req.nextUrl.searchParams.get("lat") || "0");
  const searchLng = parseFloat(req.nextUrl.searchParams.get("lng") || "0");

  if (!address) return NextResponse.json({ projects: [] });

  const hasCoords = searchLat !== 0 && searchLng !== 0;

  type ScoredProject = (typeof HDA_PROJECTS)[number] & { distance?: number };
  const matches: ScoredProject[] = [];
  const seen = new Set<string>();

  if (hasCoords) {
    for (const p of HDA_PROJECTS) {
      let centroid = getProjectCentroid(p.suburb);
      if (!centroid) {
        const addrSuburb = extractSuburbFromAddress(p.address);
        if (addrSuburb) centroid = getProjectCentroid(addrSuburb);
      }
      if (centroid) {
        const dist = haversineKm(searchLat, searchLng, centroid.lat, centroid.lng);
        if (dist <= 15 && !seen.has(p.eoi_number)) {
          seen.add(p.eoi_number);
          matches.push({ ...p, distance: Math.round(dist * 10) / 10 });
        }
      }
    }
  }

  matches.sort((a, b) => (a.distance || 0) - (b.distance || 0));
  const top = matches.slice(0, 15);

  // Geocode up to 3 nearest projects
  const toGeocode = top.slice(0, 3);
  const geocoded = await Promise.all(toGeocode.map((p) => geocodeAddress(p.address)));

  const results = top.map((p, i) => ({
    eoi_number: p.eoi_number,
    briefing_date: p.briefing_date,
    address: p.address,
    suburb: p.suburb,
    type: p.type,
    dwellings: p.dwellings,
    recommendation: p.recommendation,
    description: describeProject(p),
    briefingUrl: getBriefingUrl(p.briefing_date),
    coords: i < geocoded.length ? geocoded[i] : null,
    distance: p.distance,
  }));

  return NextResponse.json({ projects: results });
}
