import { NextRequest, NextResponse } from "next/server";
import { verifyAuth } from "@/lib/auth";

/* eslint-disable @typescript-eslint/no-explicit-any */

const LGA_BOUNDARY_URL =
  "https://maps.six.nsw.gov.au/arcgis/rest/services/public/NSW_Administrative_Boundaries/MapServer/1/query";

export async function GET(req: NextRequest) {
  const { response } = await verifyAuth(req);
  if (response) return response;

  const lat = parseFloat(req.nextUrl.searchParams.get("lat") || "0");
  const lng = parseFloat(req.nextUrl.searchParams.get("lng") || "0");

  if (!lat || !lng) {
    return NextResponse.json({ error: "lat and lng required" }, { status: 400 });
  }

  const params = new URLSearchParams({
    geometry: `${lng},${lat}`,
    geometryType: "esriGeometryPoint",
    inSR: "4326",
    spatialRel: "esriSpatialRelIntersects",
    outFields: "lganame,councilname,abscode",
    returnGeometry: "true",
    outSR: "4326",
    f: "json",
  });

  try {
    const res = await fetch(`${LGA_BOUNDARY_URL}?${params}`, {
      next: { revalidate: 86400 },
    });

    if (!res.ok) {
      return NextResponse.json({ error: "LGA service unavailable" }, { status: 502 });
    }

    const data = await res.json();
    const feature = data?.features?.[0];

    if (!feature) {
      return NextResponse.json({ councilName: null, boundary: null });
    }

    const attrs = feature.attributes || {};
    const councilName: string = attrs.councilname || attrs.lganame || "";

    // Convert rings from [lng, lat] to [lat, lng] for Leaflet
    let boundary: [number, number][] | null = null;
    if (feature.geometry?.rings?.[0]) {
      const ring = feature.geometry.rings[0] as number[][];
      // Simplify - take every Nth point to keep the boundary lightweight
      const step = Math.max(1, Math.floor(ring.length / 200));
      boundary = [];
      for (let i = 0; i < ring.length; i += step) {
        boundary.push([ring[i][1], ring[i][0]]);
      }
      // Ensure ring is closed
      if (boundary.length > 2) {
        const first = boundary[0];
        const last = boundary[boundary.length - 1];
        if (first[0] !== last[0] || first[1] !== last[1]) {
          boundary.push(first);
        }
      }
    }

    return NextResponse.json({ councilName, boundary });
  } catch (e: any) {
    return NextResponse.json({ error: e.message || "Failed to query LGA" }, { status: 500 });
  }
}
