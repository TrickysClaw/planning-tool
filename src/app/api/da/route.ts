import { NextRequest, NextResponse } from "next/server";
import { getCouncilsForLocation, haversineKm } from "../../data/councilBounds";

/* eslint-disable @typescript-eslint/no-explicit-any */

export async function GET(req: NextRequest) {
  const sp = req.nextUrl.searchParams;
  const lat = parseFloat(sp.get("lat") || "");
  const lng = parseFloat(sp.get("lng") || "");
  const radius = Math.min(parseFloat(sp.get("radius") || "1"), 2); // km, max 2

  if (isNaN(lat) || isNaN(lng)) {
    return NextResponse.json({ error: "lat and lng required" }, { status: 400 });
  }

  const councilNames = getCouncilsForLocation(lat, lng);
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
        const res = await fetch(
          "https://api.apps1.nsw.gov.au/eplanning/data/v0/OnlineDA",
          {
            headers: {
              PageSize: "100",
              PageNumber: String(page),
              filters,
            },
            next: { revalidate: 3600 },
          }
        );
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

  // Filter by distance
  const nearby = allResults
    .map((da: any) => {
      const loc = da.Location?.[0];
      if (!loc?.X || !loc?.Y) return null;
      const daLng = parseFloat(loc.X);
      const daLat = parseFloat(loc.Y);
      if (isNaN(daLat) || isNaN(daLng)) return null;
      const dist = haversineKm(lat, lng, daLat, daLng);
      if (dist > radius) return null;
      return {
        address: da.Location?.[0]?.FullAddress || "Unknown address",
        status: da.ApplicationStatus || "Unknown",
        type: da.DevelopmentType || [],
        costOfDevelopment: da.CostOfDevelopment || 0,
        dwellings: da.NumberOfNewDwellings || 0,
        storeys: da.NumberOfStoreys || 0,
        lodgementDate: da.LodgementDate || "",
        pan: da.PlanningPortalApplicationNumber || "",
        lat: daLat,
        lng: daLng,
        distance: Math.round(dist * 1000), // metres
      };
    })
    .filter(Boolean)
    .sort((a: any, b: any) => a.distance - b.distance);

  return NextResponse.json({ results: nearby });
}
