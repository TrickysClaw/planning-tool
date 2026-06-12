import { NextRequest, NextResponse } from "next/server";
import { verifyAuth } from "@/lib/auth";
import { haversineKm, webMercatorToWGS84 } from "@/lib/geo";
import { HDA_PROJECTS, HDAProject } from "@/data/hdaProjects";
import { SUBURB_CENTROIDS } from "@/data/suburbCentroids";
import { createAdminClient } from "@/lib/supabase";

/* ─── Live HDA Scraper with Supabase Cache ─── */
const HDA_PAGE_URL = "https://www.planning.nsw.gov.au/policy-and-legislation/housing/housing-delivery-authority";
const CACHE_TTL_MS = 1000 * 60 * 60 * 24; // 24 hours

/**
 * Scrapes all HDA projects from the NSW Planning page.
 * Caches results in Supabase so they persist across serverless invocations.
 */
async function scrapeHDAProjects(): Promise<HDAProject[]> {
  const supabase = createAdminClient();

  // Check Supabase cache first
  const { data: cached } = await supabase
    .from("hda_cache")
    .select("scraped_at, projects")
    .order("scraped_at", { ascending: false })
    .limit(1)
    .single();

  if (cached) {
    const age = Date.now() - new Date(cached.scraped_at).getTime();
    if (age < CACHE_TTL_MS) {
      return cached.projects as HDAProject[];
    }
  }

  // Cache is stale or empty — scrape fresh data
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 10000);
    const res = await fetch(HDA_PAGE_URL, {
      headers: { "User-Agent": "PlanningTool/2.0 (property research)" },
      signal: controller.signal,
    });
    clearTimeout(timer);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const html = await res.text();

    const projects: HDAProject[] = [];
    const tableRegex = /<table>\s*<caption>Full details for entry (\d+)<\/caption>\s*<tbody>([\s\S]*?)<\/tbody>\s*<\/table>/g;
    let match;

    while ((match = tableRegex.exec(html)) !== null) {
      const eoiNumber = match[1];
      const tbody = match[2];

      const fields: Record<string, string> = {};
      const rowRegex = /<th>\s*<p>(.*?)<\/p>\s*<\/th>\s*<td>\s*<p>(.*?)<\/p>\s*<\/td>/g;
      let rowMatch;
      while ((rowMatch = rowRegex.exec(tbody)) !== null) {
        const label = rowMatch[1].trim().toLowerCase();
        const value = rowMatch[2].replace(/&#039;/g, "'").replace(/&amp;/g, "&").trim();
        fields[label] = value;
      }

      const address = fields["address"] || "";
      const lga = fields["local government area"] || "";
      const dwellingsStr = fields["number of dwellings"] || "";
      const meetingDate = fields["hda meeting date"] || "";
      const recommendation = fields["hda recommendation"] || "";
      const decision = fields["minister's decision"] || "";
      const type = fields["type of residential accommodation"] || "Residential";

      let briefingDate = "";
      const dateParts = meetingDate.match(/(\d{1,2})\/(\d{2})\/(\d{4})/);
      if (dateParts) {
        briefingDate = `${dateParts[3]}-${dateParts[2]}-${dateParts[1].padStart(2, "0")}`;
      }

      const suburbMatch = address.match(/,\s*([A-Za-z\s]+?)(?:\s+NSW|\s*$)/i)
        || address.match(/([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)$/);
      const suburb = suburbMatch ? suburbMatch[1].trim() : "";

      projects.push({
        eoi_number: eoiNumber,
        briefing_date: briefingDate,
        address,
        suburb,
        lga,
        applicant: "",
        type: mapHousingType(type),
        dwellings: dwellingsStr ? parseInt(dwellingsStr, 10) || null : null,
        capital_investment: null,
        recommendation: mapRecommendation(recommendation, decision),
        outcome: decision,
      });
    }

    if (projects.length > 50) {
      // Store in Supabase (delete old, insert new)
      await supabase.from("hda_cache").delete().neq("id", 0);
      await supabase.from("hda_cache").insert({
        project_count: projects.length,
        projects,
      });
      console.log(`[HDA] Scraped ${projects.length} projects → saved to Supabase`);
      return projects;
    }

    throw new Error(`Only found ${projects.length} projects, expected 800+`);
  } catch (err) {
    console.warn("[HDA] Scrape failed, using fallback:", err);
    // If we have stale Supabase data, use it
    if (cached) return cached.projects as HDAProject[];
    // Last resort: static file
    return HDA_PROJECTS;
  }
}

function mapHousingType(raw: string): string {
  if (raw.toLowerCase().includes("flat")) return "Residential";
  if (raw.toLowerCase().includes("mixed")) return "Mixed-use";
  if (raw.toLowerCase().includes("senior")) return "Seniors housing";
  if (raw.toLowerCase().includes("build-to-rent") || raw.toLowerCase().includes("build to rent")) return "Build-to-Rent";
  if (raw.toLowerCase().includes("multi dwelling")) return "Residential";
  if (raw.toLowerCase().includes("subdivision")) return "Subdivision";
  return "Residential";
}

function mapRecommendation(rec: string, decision: string): string {
  if (decision.toLowerCase().includes("declared ssd")) return "Declare SSD";
  if (rec.toLowerCase().includes("not recommended")) return "Not Declare";
  if (rec.toLowerCase().includes("recommended")) return "Declare SSD";
  if (rec.toLowerCase().includes("utilise")) return "Alternative Pathway";
  if (rec.toLowerCase().includes("withdrawn")) return "Withdrawn";
  return "Unknown";
}

function getProjectCentroid(suburb: string): { lat: number; lng: number } | null {
  if (!suburb || suburb.trim().length < 3) return null;
  const lower = suburb.trim().toLowerCase();
  // Only allow junk-free suburb names (letters, spaces, hyphens)
  if (!/^[a-z\s\-']+$/.test(lower)) return null;
  for (const [key, val] of Object.entries(SUBURB_CENTROIDS)) {
    if (key.toLowerCase() === lower) return val;
  }
  // Only allow startsWith matching if the suburb string is long enough (≥6 chars)
  // and matches at least 80% of the key to avoid false positives
  if (lower.length >= 6) {
    for (const [key, val] of Object.entries(SUBURB_CENTROIDS)) {
      const keyLower = key.toLowerCase();
      if (keyLower.startsWith(lower) && lower.length >= keyLower.length * 0.8) return val;
    }
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
  // Link to the published records page — individual PDF URLs are unreliable
  return `https://www.planning.nsw.gov.au/policy-and-legislation/housing/housing-delivery-authority/published-records`;
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
  const { response } = await verifyAuth(req);
  if (response) return response;

  const address = req.nextUrl.searchParams.get("address") || "";
  const searchLat = parseFloat(req.nextUrl.searchParams.get("lat") || "0");
  const searchLng = parseFloat(req.nextUrl.searchParams.get("lng") || "0");

  if (!address) return NextResponse.json({ projects: [] });

  // Fetch live data (cached 24h, falls back to static)
  const allProjects = await scrapeHDAProjects();

  const hasCoords = searchLat !== 0 && searchLng !== 0;

  type ScoredProject = HDAProject & { distance?: number };
  const matches: ScoredProject[] = [];
  const seen = new Set<string>();

  if (hasCoords) {
    for (const p of allProjects) {
      let centroid = getProjectCentroid(p.suburb);
      if (!centroid) {
        const addrSuburb = extractSuburbFromAddress(p.address);
        if (addrSuburb) centroid = getProjectCentroid(addrSuburb);
      }
      if (!centroid && p.lga) {
        // Try LGA name as suburb fallback
        centroid = getProjectCentroid(p.lga);
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

  // Geocode up to 3 nearest projects for precise pin placement
  const toGeocode = top.slice(0, 3);
  const geocoded = await Promise.all(toGeocode.map((p) => geocodeAddress(p.address)));

  const results = top.map((p, i) => {
    // Precise coords from geocoding (first 3 only)
    let coords: { lat: number; lng: number } | null = i < geocoded.length ? geocoded[i] : null;

    // Validate geocoded coords: if they're more than 20km from the search point, discard
    // (the project was matched via a centroid within 15km — a geocoded result far away is wrong)
    if (coords && haversineKm(searchLat, searchLng, coords.lat, coords.lng) > 20) {
      coords = null;
    }

    // Fallback: use suburb/LGA centroid so clicking still pans the map
    if (!coords) {
      let centroid = getProjectCentroid(p.suburb);
      if (!centroid) {
        const addrSuburb = extractSuburbFromAddress(p.address);
        if (addrSuburb) centroid = getProjectCentroid(addrSuburb);
      }
      if (!centroid && p.lga) centroid = getProjectCentroid(p.lga);
      coords = centroid;
    }

    return {
      eoi_number: p.eoi_number,
      briefing_date: p.briefing_date,
      address: p.address,
      suburb: p.suburb,
      lga: p.lga || "",
      type: p.type,
      dwellings: p.dwellings,
      recommendation: p.recommendation,
      outcome: p.outcome || "",
      description: describeProject(p),
      briefingUrl: getBriefingUrl(p.briefing_date),
      coords,
      distance: p.distance,
    };
  });

  return NextResponse.json({
    projects: results,
    meta: {
      total: allProjects.length,
      source: allProjects.length > 100 ? "live (NSW Planning)" : "static (fallback)",
    },
  });
}
