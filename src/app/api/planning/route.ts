import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  const lat = parseFloat(req.nextUrl.searchParams.get("lat") || "0");
  const lng = parseFloat(req.nextUrl.searchParams.get("lng") || "0");
  const url = `https://mapprod3.environment.nsw.gov.au/arcgis/rest/services/Planning/EPI_Primary_Planning_Layers/MapServer/identify?geometry=${lng},${lat}&geometryType=esriGeometryPoint&sr=4326&layers=all&tolerance=2&mapExtent=${lng - 0.01},${lat - 0.01},${lng + 0.01},${lat + 0.01}&imageDisplay=600,550,96&returnGeometry=false&f=json`;
  const res = await fetch(url);
  const data = await res.json();
  return NextResponse.json(data);
}
