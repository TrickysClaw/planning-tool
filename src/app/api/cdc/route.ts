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
  const twoYearsAgo = new Date();
  twoYearsAgo.setFullYear(twoYearsAgo.getFullYear() - 2);
  const dateFrom = twoYearsAgo.toISOString().slice(0, 10);

  const allResults: any[] = [];

  for (const council of councilNames) {
    const filters = JSON.stringify({
      filters: { CouncilName: [council], LodgementDateFrom: dateFrom },
    });

    for (let page = 1; page <= 3; page++) {
      try {
        const res = await fetch("https://api.apps1.nsw.gov.au/eplanning/data/v0/OnlineCDC", {
          headers: { PageSize: "100", PageNumber: String(page), filters },
          next: { revalidate: 3600 },
        });
        if (!res.ok) break;
        const data = await res.json();
        const items = data?.Application || data || [];
        if (!Array.isArray(items) || items.length === 0) break;
        allResults.push(...items);
        if (items.length < 100) break;
      } catch {
        break;
      }
    }
  }

  const nearby = allResults
    .map((cdc: any) => {
      const loc = cdc.Location?.[0];
      if (!loc?.X || !loc?.Y) return null;
      const cdcLng = parseFloat(loc.X);
      const cdcLat = parseFloat(loc.Y);
      if (isNaN(cdcLat) || isNaN(cdcLng)) return null;
      const dist = haversineKm(lat, lng, cdcLat, cdcLng);
      if (dist > radius) return null;

      const devTypes = (cdc.DevelopmentType || []).map((t: any) =>
        typeof t === "string" ? t : t?.DevelopmentType || t?.value || ""
      ).filter(Boolean);

      const lots = (loc.Lot || []).map((l: any) => `Lot ${l.Lot}/${l.PlanLabel}`).join(", ");

      return {
        address: loc.FullAddress || "Unknown address",
        suburb: loc.Suburb || "",
        status: cdc.ApplicationStatus || "Unknown",
        applicationType: cdc.ApplicationType || "CDC",
        type: devTypes,
        description: devTypes.join(", ") || "Complying Development",
        costOfDevelopment: cdc.CostOfDevelopment || 0,
        dwellings: cdc.NumberOfNewDwellings || 0,
        storeys: cdc.NumberOfStoreys || 0,
        lodgementDate: cdc.LodgementDate || cdc.SubmissionDate || "",
        pan: cdc.PlanningPortalApplicationNumber || "",
        councilRef: cdc.CouncilApplicationNumber || "",
        lot: lots,
        lat: cdcLat,
        lng: cdcLng,
        distance: Math.round(dist * 1000),
      };
    })
    .filter(Boolean)
    .sort((a: any, b: any) => a.distance - b.distance);

  return NextResponse.json({ results: nearby });
}
