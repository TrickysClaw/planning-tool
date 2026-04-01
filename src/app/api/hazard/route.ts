import { NextRequest, NextResponse } from "next/server";

const HAZARD_BASE = "https://mapprod3.environment.nsw.gov.au/arcgis/rest/services/ePlanning/Planning_Portal_Hazard/MapServer";
const PROTECTION_BASE = "https://mapprod3.environment.nsw.gov.au/arcgis/rest/services/ePlanning/Planning_Portal_Protection/MapServer";
const DCP_BASE = "https://mapprod3.environment.nsw.gov.au/arcgis/rest/services/ePlanning/Planning_Portal_Development_Control/MapServer";

async function queryLayer(base: string, layer: number, lat: number, lng: number) {
  const url = `${base}/${layer}/query?where=1%3D1&outFields=*&resultRecordCount=1&f=json&geometry=${lng},${lat}&geometryType=esriGeometryPoint&inSR=4326&spatialRel=esriSpatialRelIntersects`;
  try {
    const res = await fetch(url);
    return res.json();
  } catch {
    return { features: [] };
  }
}

async function identifyLayer(base: string, layers: string, lat: number, lng: number) {
  const url = `${base}/identify?geometry=${lng},${lat}&geometryType=esriGeometryPoint&sr=4326&layers=all:${layers}&tolerance=2&mapExtent=${lng - 0.01},${lat - 0.01},${lng + 0.01},${lat + 0.01}&imageDisplay=600,550,96&returnGeometry=false&f=json`;
  try {
    const res = await fetch(url);
    return res.json();
  } catch {
    return { results: [] };
  }
}

export async function GET(req: NextRequest) {
  const lat = parseFloat(req.nextUrl.searchParams.get("lat") || "0");
  const lng = parseFloat(req.nextUrl.searchParams.get("lng") || "0");

  const [bushfire, flood, landslide, acidSulfate, keySites] = await Promise.all([
    queryLayer(HAZARD_BASE, 229, lat, lng),
    queryLayer(HAZARD_BASE, 230, lat, lng),
    queryLayer(HAZARD_BASE, 232, lat, lng),
    identifyLayer(PROTECTION_BASE, "234", lat, lng),
    identifyLayer(DCP_BASE, "226", lat, lng),
  ]);

  return NextResponse.json({
    bushfire,
    flood,
    landslide,
    acidSulfate: acidSulfate.results || [],
    keySites: keySites.results || [],
  });
}
