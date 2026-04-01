import { NextRequest, NextResponse } from "next/server";

const BASE = "https://mapprod3.environment.nsw.gov.au/arcgis/rest/services/ePlanning/Planning_Portal_Hazard/MapServer";

async function queryLayer(layer: number, lat: number, lng: number) {
  const url = `${BASE}/${layer}/query?where=1%3D1&outFields=*&resultRecordCount=1&f=json&geometry=${lng},${lat}&geometryType=esriGeometryPoint&inSR=4326&spatialRel=esriSpatialRelIntersects`;
  const res = await fetch(url);
  return res.json();
}

export async function GET(req: NextRequest) {
  const lat = parseFloat(req.nextUrl.searchParams.get("lat") || "0");
  const lng = parseFloat(req.nextUrl.searchParams.get("lng") || "0");
  const [bushfire, flood] = await Promise.all([queryLayer(229, lat, lng), queryLayer(230, lat, lng)]);
  return NextResponse.json({ bushfire, flood });
}
