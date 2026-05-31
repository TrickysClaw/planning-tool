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

// LGAs that have published flood planning data to the state layer (as of 2026)
const FLOOD_DATA_LGAS = new Set([
  "BATHURST REGIONAL", "CLARENCE VALLEY", "FORBES", "HORNSBY",
  "MID-WESTERN REGIONAL", "TAMWORTH REGIONAL", "WENTWORTH",
  "WINGECARRIBEE", "WOLLONGONG", "YASS VALLEY",
]);

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
  const lat = parseFloat(req.nextUrl.searchParams.get("lat") || "0");
  const lng = parseFloat(req.nextUrl.searchParams.get("lng") || "0");

  const [bushfire, flood, landslide, acidSulfate, keySites, councilName] = await Promise.all([
    queryLayer(HAZARD_BASE, 229, lat, lng),
    queryLayer(HAZARD_BASE, 230, lat, lng),
    queryLayer(HAZARD_BASE, 232, lat, lng),
    identifyLayer(PROTECTION_BASE, "234", lat, lng),
    identifyLayer(DCP_BASE, "226", lat, lng),
    getCouncilName(lat, lng),
  ]);

  const lgaUpper = councilName?.toUpperCase().replace(/\s*CITY\s*|\s*COUNCIL\s*/gi, "").trim() || "";
  const floodDataAvailable = FLOOD_DATA_LGAS.has(lgaUpper) || 
    [...FLOOD_DATA_LGAS].some(l => lgaUpper.includes(l) || l.includes(lgaUpper));

  return NextResponse.json({
    bushfire,
    flood,
    floodDataAvailable,
    landslide,
    acidSulfate: acidSulfate.results || [],
    keySites: keySites.results || [],
  });
}
