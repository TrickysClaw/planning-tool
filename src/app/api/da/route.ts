import { NextRequest, NextResponse } from "next/server";
import { haversineKm } from "@/lib/geo";

/* eslint-disable @typescript-eslint/no-explicit-any */

async function getCouncilName(lat: number, lng: number): Promise<string | null> {
  const params = new URLSearchParams({
    geometry: `${lng},${lat}`,
    geometryType: "esriGeometryPoint",
    inSR: "4326",
    spatialRel: "esriSpatialRelIntersects",
    outFields: "councilname",
    returnGeometry: "false",
    f: "json",
  });
  try {
    const res = await fetch(
      `https://maps.six.nsw.gov.au/arcgis/rest/services/public/NSW_Administrative_Boundaries/MapServer/1/query?${params}`,
      { next: { revalidate: 86400 } }
    );
    if (!res.ok) return null;
    const data = await res.json();
    return data?.features?.[0]?.attributes?.councilname || null;
  } catch {
    return null;
  }
}

export async function GET(req: NextRequest) {
  const lat = parseFloat(req.nextUrl.searchParams.get("lat") || "");
  const lng = parseFloat(req.nextUrl.searchParams.get("lng") || "");
  const radius = Math.min(parseFloat(req.nextUrl.searchParams.get("radius") || "1"), 2);

  if (isNaN(lat) || isNaN(lng)) {
    return NextResponse.json({ error: "lat and lng required" }, { status: 400 });
  }

  const councilName = await getCouncilName(lat, lng);
  const councilNames = councilName ? [councilName] : [];
  const oneYearAgo = new Date();
  oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);
  const dateFrom = oneYearAgo.toISOString().slice(0, 10);

  const allResults: any[] = [];

  for (const council of councilNames) {
    const filters = JSON.stringify({
      filters: { CouncilName: [council], LodgementDateFrom: dateFrom },
    });

    // First request to get TotalPages (API returns oldest first, so we fetch from the last page backwards)
    try {
      const firstRes = await fetch("https://api.apps1.nsw.gov.au/eplanning/data/v0/OnlineDA", {
        headers: { PageSize: "100", PageNumber: "1", filters },
        next: { revalidate: 3600 },
      });
      if (!firstRes.ok) continue;
      const firstData = await firstRes.json();
      const totalPages = firstData.TotalPages || 1;

      // Fetch last 5 pages (newest data) in reverse order
      const startPage = Math.max(1, totalPages - 4);
      for (let page = totalPages; page >= startPage; page--) {
        if (page === 1 && totalPages > 1) {
          // We already fetched page 1 for TotalPages but it has old data, skip unless it's the only page
          continue;
        }
        try {
          const res = await fetch("https://api.apps1.nsw.gov.au/eplanning/data/v0/OnlineDA", {
            headers: { PageSize: "100", PageNumber: String(page), filters },
            next: { revalidate: 3600 },
          });
          if (!res.ok) break;
          const data = await res.json();
          const items = data?.Application || data || [];
          if (!Array.isArray(items) || items.length === 0) break;
          allResults.push(...items);
        } catch {
          break;
        }
      }

      // If only 1 page total, use the data from the first request
      if (totalPages === 1) {
        const items = firstData?.Application || [];
        if (Array.isArray(items)) allResults.push(...items);
      }
    } catch {
      continue;
    }
  }

  const nearby = allResults
    .map((da: any) => {
      const loc = da.Location?.[0];
      if (!loc?.X || !loc?.Y) return null;
      const daLng = parseFloat(loc.X);
      const daLat = parseFloat(loc.Y);
      if (isNaN(daLat) || isNaN(daLng)) return null;
      const dist = haversineKm(lat, lng, daLat, daLng);
      if (dist > radius) return null;

      const devTypes = (da.DevelopmentType || []).map((t: any) =>
        typeof t === "string" ? t : t?.DevelopmentType || t?.value || ""
      ).filter(Boolean);

      const lots = (loc.Lot || []).map((l: any) => `Lot ${l.Lot}/${l.PlanLabel}`).join(", ");

      return {
        address: loc.FullAddress || "Unknown address",
        suburb: loc.Suburb || "",
        status: da.ApplicationStatus || "Unknown",
        applicationType: da.ApplicationType || "",
        type: devTypes,
        description: devTypes.join(", ") || da.ApplicationType || "Development Application",
        costOfDevelopment: da.CostOfDevelopment || 0,
        dwellings: da.NumberOfNewDwellings || 0,
        storeys: da.NumberOfStoreys || 0,
        lodgementDate: da.LodgementDate || da.SubmissionDate || "",
        determinationDate: da.DeterminationDate || "",
        pan: da.PlanningPortalApplicationNumber || "",
        councilRef: da.CouncilApplicationNumber || "",
        lot: lots,
        lat: daLat,
        lng: daLng,
        distance: Math.round(dist * 1000),
      };
    })
    .filter(Boolean)
    .sort((a: any, b: any) => a.distance - b.distance);

  return NextResponse.json({ results: nearby });
}
