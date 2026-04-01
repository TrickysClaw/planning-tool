import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  const lat = parseFloat(req.nextUrl.searchParams.get("lat") || "0");
  const lng = parseFloat(req.nextUrl.searchParams.get("lng") || "0");
  const url = `https://maps.six.nsw.gov.au/arcgis/rest/services/public/NSW_Cadastre/MapServer/9/query?where=1%3D1&outFields=*&resultRecordCount=1&f=json&geometry=${lng},${lat}&geometryType=esriGeometryPoint&inSR=4326&spatialRel=esriSpatialRelIntersects`;
  const res = await fetch(url);
  const data = await res.json();
  return NextResponse.json(data);
}
