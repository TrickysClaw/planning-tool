import { NextRequest, NextResponse } from "next/server";
import { verifyAuth } from "@/lib/auth";
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
  const { response } = await verifyAuth(req);
  if (response) return response;

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
      const firstRes = await fetch("https://api.apps1.nsw.gov.au/eplanning/data/v0/OnlineCC", {
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
          continue;
        }
        try {
          const res = await fetch("https://api.apps1.nsw.gov.au/eplanning/data/v0/OnlineCC", {
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
    .map((cc: any) => {
      const loc = cc.Location?.[0];
      if (!loc?.X || !loc?.Y) return null;
      const ccLng = parseFloat(loc.X);
      const ccLat = parseFloat(loc.Y);
      if (isNaN(ccLat) || isNaN(ccLng)) return null;
      const dist = haversineKm(lat, lng, ccLat, ccLng);
      if (dist > radius) return null;

      const devTypes = (cc.DevelopmentType || []).map((t: any) =>
        typeof t === "string" ? t : t?.DevelopmentType || t?.value || ""
      ).filter(Boolean);

      const buildingClasses = (cc.BuildingCodeClass || []).map((b: any) => ({
        class: b.BuildingCodeClass || "",
        description: b.BuildingCodeDescription || "",
      }));

      return {
        address: loc.FullAddress || "Unknown address",
        suburb: loc.Suburb || "",
        status: cc.ApplicationStatus || "Unknown",
        type: devTypes,
        description: devTypes.join(", ") || "Construction Certificate",
        costOfDevelopment: cc.CostOfDevelopment || 0,
        storeys: cc.StoreysProposed || 0,
        units: cc.UnitsProposed || 0,
        lodgementDate: cc.LodgementDate || cc.DateSubmitted || "",
        determinationDate: cc.DeterminationDate || "",
        pan: cc.PlanningPortalApplicationNumber || "",
        builder: cc.BuilderLegalName || "",
        currentUse: cc.CurrentBuildingUse || "",
        proposedUse: cc.ProposedBuildingUse || "",
        buildingClasses,
        existingFloorArea: cc.ExistingGrossFloorArea || 0,
        proposedFloorArea: cc.ProposedGrossFloorArea || 0,
        lat: ccLat,
        lng: ccLng,
        distance: Math.round(dist * 1000),
      };
    })
    .filter(Boolean)
    .sort((a: any, b: any) => a.distance - b.distance);

  return NextResponse.json({ results: nearby });
}
