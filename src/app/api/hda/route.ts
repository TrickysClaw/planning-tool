import { NextRequest, NextResponse } from "next/server";
import { HDA_PROJECTS } from "../../data/hdaProjects";
import { SUBURB_CENTROIDS } from "../../data/suburbCentroids";

function extractSuburb(address: string): string | null {
  const m = address.match(/([A-Z][A-Z\s]+?)\s+\d{4}$/i);
  if (m) return m[1].trim();
  const parts = address.trim().split(/\s+/);
  if (parts.length >= 2) {
    let i = parts.length - 1;
    if (/^\d{4}$/.test(parts[i])) i--;
    if (i >= 0) return parts[i];
  }
  return null;
}

// Haversine distance in km
function haversineKm(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

// Try to find a centroid for a project's suburb
function getProjectCentroid(suburb: string): { lat: number; lng: number } | null {
  if (!suburb) return null;
  const clean = suburb.trim();
  // Direct match
  if (SUBURB_CENTROIDS[clean]) return SUBURB_CENTROIDS[clean];
  // Case-insensitive
  const lower = clean.toLowerCase();
  for (const [key, val] of Object.entries(SUBURB_CENTROIDS)) {
    if (key.toLowerCase() === lower) return val;
  }
  // Partial match: suburb starts with a known name
  for (const [key, val] of Object.entries(SUBURB_CENTROIDS)) {
    if (lower.startsWith(key.toLowerCase()) || key.toLowerCase().startsWith(lower)) return val;
  }
  return null;
}

// Also try to extract suburb from address string
function extractSuburbFromAddress(address: string): string | null {
  // Match patterns like "Street, Suburb -" or "Street, Suburb"
  const m = address.match(/,\s*([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)\s*[-–—]?\s*$/);
  if (m) return m[1].trim();
  // Match "Street, Suburb" in middle
  const m2 = address.match(/,\s*([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)/);
  if (m2) return m2[1].trim();
  return null;
}

// Try to geocode an HDA address via NSW Planning Portal
async function geocodeHDA(address: string): Promise<{ lat: number; lng: number } | null> {
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
    const xs = ring.map((p: number[]) => p[0]);
    const ys = ring.map((p: number[]) => p[1]);
    const mx = xs.reduce((a: number, b: number) => a + b, 0) / xs.length;
    const my = ys.reduce((a: number, b: number) => a + b, 0) / ys.length;

    const lng = (mx * 180) / 20037508.34;
    const lat = (Math.atan(Math.exp((my * Math.PI) / 20037508.34)) * 360) / Math.PI - 90;
    return { lat, lng };
  } catch {
    return null;
  }
}

// Generate a description from project metadata
function describeProject(p: { type: string; dwellings: number | null; recommendation: string; applicant: string; capital_investment: number | string | null }): string {
  const parts: string[] = [];

  if (p.type === "Residential") parts.push("Residential housing development");
  else if (p.type === "Mixed-use") parts.push("Mixed-use development (residential + commercial)");
  else if (p.type === "Build-to-Rent") parts.push("Build-to-Rent residential development");
  else if (p.type === "Subdivision") parts.push("Land subdivision");
  else if (p.type === "Seniors housing") parts.push("Seniors living / aged care development");
  else parts.push(`${p.type || "Unknown"} development`);

  if (p.dwellings) parts.push(`proposing ${p.dwellings.toLocaleString()} dwellings`);
  if (p.capital_investment) parts.push(`with $${p.capital_investment} capital investment`);

  if (p.recommendation.includes("Declare")) {
    parts.push("— declared as State Significant Development (fast-tracked via HDA, bypasses council)");
  } else if (p.recommendation.includes("Not Declare")) {
    parts.push("— not declared SSD (remains under council assessment)");
  } else if (p.recommendation.includes("Deferred")) {
    parts.push("— decision deferred by the HDA");
  }

  if (p.applicant && p.applicant.length > 3) parts.push(`Applied by ${p.applicant}`);

  return parts.join(" ");
}

// HDA briefing record URL
function getBriefingUrl(briefingDate: string): string {
  const d = briefingDate.replace(/-/g, "");
  const month = briefingDate.slice(0, 7).replace("-", "-");
  return `https://www.planning.nsw.gov.au/sites/default/files/${month}/housing-delivery-authority-record-of-briefing-${d}.pdf`;
}

export async function GET(req: NextRequest) {
  const address = req.nextUrl.searchParams.get("address") || "";
  const searchLat = parseFloat(req.nextUrl.searchParams.get("lat") || "0");
  const searchLng = parseFloat(req.nextUrl.searchParams.get("lng") || "0");

  if (!address) return NextResponse.json({ projects: [] });

  const suburb = extractSuburb(address);
  const suburbLower = suburb?.toLowerCase() || "";
  const hasCoords = searchLat !== 0 && searchLng !== 0;

  // Distance-based matching: find projects within 15km using suburb centroids
  type ScoredProject = (typeof HDA_PROJECTS)[number] & { distance?: number };
  const matches: ScoredProject[] = [];
  const seen = new Set<string>();

  if (hasCoords) {
    for (const p of HDA_PROJECTS) {
      // Try suburb centroid from the project's suburb field
      let centroid = getProjectCentroid(p.suburb);
      // Also try extracting suburb from address
      if (!centroid) {
        const addrSuburb = extractSuburbFromAddress(p.address);
        if (addrSuburb) centroid = getProjectCentroid(addrSuburb);
      }
      if (centroid) {
        const dist = haversineKm(searchLat, searchLng, centroid.lat, centroid.lng);
        if (dist <= 15) {
          matches.push({ ...p, distance: dist });
          seen.add(p.eoi_number);
        }
      }
    }
  }

  // Also do suburb name matching as fallback
  if (suburbLower) {
    for (const p of HDA_PROJECTS) {
      if (seen.has(p.eoi_number)) continue;
      const pSuburb = (p.suburb || "").toLowerCase();
      const pAddress = (p.address || "").toLowerCase();
      if (
        pSuburb.includes(suburbLower) ||
        suburbLower.includes(pSuburb) ||
        pAddress.includes(suburbLower)
      ) {
        matches.push({ ...p });
        seen.add(p.eoi_number);
      }
    }
  }

  // Sort: by distance if available, then by briefing_date desc
  matches.sort((a, b) => {
    if (a.distance != null && b.distance != null) return a.distance - b.distance;
    if (a.distance != null) return -1;
    if (b.distance != null) return 1;
    return (b.briefing_date || "").localeCompare(a.briefing_date || "");
  });

  // Take up to 20
  const top = matches.slice(0, 20);

  // Geocode up to 10 for map markers
  const projectsWithCoords = await Promise.all(
    top.slice(0, 10).map(async (p) => {
      const cleanAddr = p.address.replace(/[–—-]\s*$/, "").trim();
      const coords = await geocodeHDA(cleanAddr);
      return {
        ...p,
        coords,
        description: describeProject(p),
        briefingUrl: getBriefingUrl(p.briefing_date),
      };
    })
  );

  const remaining = top.slice(10).map((p) => ({
    ...p,
    coords: null,
    description: describeProject(p),
    briefingUrl: getBriefingUrl(p.briefing_date),
  }));

  return NextResponse.json({
    projects: [...projectsWithCoords, ...remaining],
    suburb,
    totalMatched: matches.length,
  });
}
