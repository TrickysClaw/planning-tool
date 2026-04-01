import { NextRequest, NextResponse } from "next/server";

// NSW Planning Portal geocoder — resolves exact street addresses with property IDs
const ADDRESS_URL = "https://api.apps1.nsw.gov.au/planning/viewersf/V1/ePlanningApi/address";
const LOT_URL = "https://api.apps1.nsw.gov.au/planning/viewersf/V1/ePlanningApi/lot";

function webMercatorToWGS84(x: number, y: number): { lat: number; lng: number } {
  const lng = (x * 180) / 20037508.34;
  const lat = (Math.atan(Math.exp((y * Math.PI) / 20037508.34)) * 360) / Math.PI - 90;
  return { lat, lng };
}

export async function GET(req: NextRequest) {
  const q = req.nextUrl.searchParams.get("q") || "";
  if (q.length < 3) return NextResponse.json([]);

  try {
    // Step 1: Get address suggestions from NSW Planning Portal
    const addrRes = await fetch(`${ADDRESS_URL}?a=${encodeURIComponent(q)}&noOfRecords=6`);
    if (!addrRes.ok) return NextResponse.json([]);
    const addresses: { address: string; propId: number; GURASID: number }[] = await addrRes.json();
    if (!addresses.length) return NextResponse.json([]);

    // Step 2: For each unique propId, get the lot geometry centroid
    const seen = new Set<string>();
    const results = [];

    for (const addr of addresses) {
      // Deduplicate by address string (not propId — 25 and 25A are different addresses on same lot)
      if (seen.has(addr.address)) continue;
      seen.add(addr.address);

      try {
        const lotRes = await fetch(`${LOT_URL}?propid=${addr.propId}`);
        if (!lotRes.ok) continue;
        const lots = await lotRes.json();
        if (!lots.length || !lots[0].geometry?.rings?.[0]) continue;

        const ring = lots[0].geometry.rings[0] as number[][];
        const xs = ring.map((p) => p[0]);
        const ys = ring.map((p) => p[1]);
        const mx = xs.reduce((a, b) => a + b, 0) / xs.length;
        const my = ys.reduce((a, b) => a + b, 0) / ys.length;
        const { lat, lng } = webMercatorToWGS84(mx, my);

        results.push({
          display_name: addr.address,
          lat: lat.toString(),
          lon: lng.toString(),
          propId: addr.propId,
        });
      } catch {
        // Skip this property if lot lookup fails
      }

      if (results.length >= 5) break;
    }

    // Fallback to Nominatim if NSW geocoder returns nothing
    if (results.length === 0) {
      const nomUrl = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(q + ", NSW, Australia")}&format=json&limit=5&countrycodes=au&addressdetails=1`;
      const nomRes = await fetch(nomUrl, { headers: { "User-Agent": "NSWPlanningTool/1.0" } });
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
