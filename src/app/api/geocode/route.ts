import { NextRequest, NextResponse } from "next/server";
import { verifyAuth } from "@/lib/auth";
import { webMercatorToWGS84 } from "@/lib/geo";

const ADDRESS_URL = "https://api.apps1.nsw.gov.au/planning/viewersf/V1/ePlanningApi/address";
const LOT_URL = "https://api.apps1.nsw.gov.au/planning/viewersf/V1/ePlanningApi/lot";

export async function GET(req: NextRequest) {
  const { response } = await verifyAuth(req);
  if (response) return response;

  const q = req.nextUrl.searchParams.get("q") || "";
  if (q.length < 3) return NextResponse.json([]);

  try {
    const addrRes = await fetch(`${ADDRESS_URL}?a=${encodeURIComponent(q)}&noOfRecords=6`);
    if (!addrRes.ok) return NextResponse.json([]);

    const addresses: { address: string; propId: number }[] = await addrRes.json();
    if (!addresses.length) return NextResponse.json([]);

    const seen = new Set<string>();
    const results: { display_name: string; lat: string; lon: string; propId: number }[] = [];

    for (const addr of addresses) {
      if (seen.has(addr.address)) continue;
      seen.add(addr.address);

      try {
        const lotRes = await fetch(`${LOT_URL}?propid=${addr.propId}`);
        if (lotRes.ok) {
          const lots = await lotRes.json();
          if (lots.length && lots[0].geometry?.rings?.[0]) {
            const ring = lots[0].geometry.rings[0] as number[][];
            const mx = ring.reduce((s, p) => s + p[0], 0) / ring.length;
            const my = ring.reduce((s, p) => s + p[1], 0) / ring.length;
            const { lat, lng } = webMercatorToWGS84(mx, my);
            results.push({ display_name: addr.address, lat: lat.toString(), lon: lng.toString(), propId: addr.propId });
            if (results.length >= 5) break;
            continue;
          }
        }
      } catch {
        // Lot lookup failed - try Nominatim fallback below
      }

      // Fallback: geocode this specific address via Nominatim when lot geometry unavailable
      try {
        const nomRes = await fetch(
          `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(addr.address + ", NSW, Australia")}&format=json&limit=1&countrycodes=au&addressdetails=1`,
          { headers: { "User-Agent": "NSWPlanningTool/1.0" } }
        );
        const nomData = await nomRes.json();
        if (nomData.length > 0) {
          results.push({ display_name: addr.address, lat: nomData[0].lat, lon: nomData[0].lon, propId: addr.propId });
        }
      } catch {
        // Skip if Nominatim also fails
      }

      if (results.length >= 5) break;
    }

    // Fallback to Nominatim if NSW geocoder returns nothing
    if (results.length === 0) {
      const nomRes = await fetch(
        `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(q + ", NSW, Australia")}&format=json&limit=5&countrycodes=au&addressdetails=1`,
        { headers: { "User-Agent": "NSWPlanningTool/1.0" } }
      );
      const nomData = await nomRes.json();
      return NextResponse.json(
        nomData
          .filter((r: Record<string, unknown>) => {
            const addr = r.address as Record<string, string> | undefined;
            return addr?.state?.includes("New South Wales");
          })
          .slice(0, 5)
      );
    }

    return NextResponse.json(results);
  } catch {
    return NextResponse.json([]);
  }
}
