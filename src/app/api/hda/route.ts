import { NextRequest, NextResponse } from "next/server";
import { HDA_PROJECTS } from "../../data/hdaProjects";

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
  // Format: YYYY-MM-DD → try the known URL pattern
  const d = briefingDate.replace(/-/g, "");
  const month = briefingDate.slice(0, 7).replace("-", "-");
  return `https://www.planning.nsw.gov.au/sites/default/files/${month}/housing-delivery-authority-record-of-briefing-${d}.pdf`;
}

export async function GET(req: NextRequest) {
  const address = req.nextUrl.searchParams.get("address") || "";
  if (!address) return NextResponse.json({ projects: [] });

  const suburb = extractSuburb(address);
  if (!suburb) return NextResponse.json({ projects: [] });

  const suburbLower = suburb.toLowerCase();

  const matches = HDA_PROJECTS.filter((p) => {
    const pSuburb = (p.suburb || "").toLowerCase();
    const pAddress = (p.address || "").toLowerCase();
    return (
      pSuburb.includes(suburbLower) ||
      suburbLower.includes(pSuburb) ||
      pAddress.includes(suburbLower)
    );
  });

  // Sort by briefing_date desc
  matches.sort((a, b) => (b.briefing_date || "").localeCompare(a.briefing_date || ""));

  // Geocode up to 10 matches for map markers (don't overload the API)
  const projectsWithCoords = await Promise.all(
    matches.slice(0, 10).map(async (p) => {
      // Try to clean the address for geocoding
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

  // Add remaining without geocoding
  const remaining = matches.slice(10).map((p) => ({
    ...p,
    coords: null,
    description: describeProject(p),
    briefingUrl: getBriefingUrl(p.briefing_date),
  }));

  return NextResponse.json({
    projects: [...projectsWithCoords, ...remaining],
    suburb,
  });
}
