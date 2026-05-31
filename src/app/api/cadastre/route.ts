import { NextRequest, NextResponse } from "next/server";

/**
 * Calculate lot area from WGS84 ring geometry using Shoelace formula (m²)
 */
function calculateGeodesicArea(rings: number[][][]): number {
  const ring = rings[0];
  if (!ring || ring.length < 3) return 0;
  const midLat = ring.reduce((s, [, y]) => s + y, 0) / ring.length;
  const mPerDegLng = 111320 * Math.cos(midLat * Math.PI / 180);
  const mPerDegLat = 110540;

  let area = 0;
  for (let i = 0; i < ring.length - 1; i++) {
    const x1 = ring[i][0] * mPerDegLng;
    const y1 = ring[i][1] * mPerDegLat;
    const x2 = ring[i + 1][0] * mPerDegLng;
    const y2 = ring[i + 1][1] * mPerDegLat;
    area += x1 * y2 - x2 * y1;
  }
  return Math.round(Math.abs(area / 2));
}

export async function GET(req: NextRequest) {
  const lat = parseFloat(req.nextUrl.searchParams.get("lat") || "0");
  const lng = parseFloat(req.nextUrl.searchParams.get("lng") || "0");

  // Request geometry in WGS84 (outSR=4326) so we can compute geodesic area accurately
  const url = `https://maps.six.nsw.gov.au/arcgis/rest/services/public/NSW_Cadastre/MapServer/9/query?where=1%3D1&outFields=*&returnGeometry=true&resultRecordCount=1&f=json&geometry=${lng},${lat}&geometryType=esriGeometryPoint&inSR=4326&outSR=4326&spatialRel=esriSpatialRelIntersects`;

  const res = await fetch(url);
  const data = await res.json();

  // Compute accurate lot area from polygon geometry
  if (data.features?.length > 0) {
    const feat = data.features[0];
    if (feat.geometry?.rings?.length) {
      feat.attributes.computedArea = calculateGeodesicArea(feat.geometry.rings);
    }
  }

  return NextResponse.json(data);
}
