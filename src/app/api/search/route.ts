import { NextRequest, NextResponse } from "next/server";

/* ───────────────────────────────────────────────────────────
   /api/search — Property Site Search
   Queries NSW ePlanning & Cadastre APIs for lots matching criteria.
   ─────────────────────────────────────────────────────────── */

const EPLANNING_BASE =
  "https://mapprod3.environment.nsw.gov.au/arcgis/rest/services/Planning/EPI_Primary_Planning_Layers/MapServer";

const CADASTRE_BASE =
  "https://maps.six.nsw.gov.au/arcgis/rest/services/public/NSW_Cadastre/MapServer";

// ePlanning layer IDs
const LAYER_ZONING = 2;
const LAYER_LOT_SIZE = 4;
const LAYER_HEIGHT = 5;
const LAYER_FSR = 6;
const LAYER_HERITAGE = 8;

// Cadastre layer IDs
const CADASTRE_LOTS = 9;

interface SearchParams {
  suburb?: string;
  bbox?: { xmin: number; ymin: number; xmax: number; ymax: number };
  zones?: string[];
  lotSizeMin?: number;
  lotSizeMax?: number;
  excludeHeritage?: boolean;
}

/**
 * Build a bounding box around a suburb centroid (approx 1.5km radius)
 */
function suburbBBox(lat: number, lng: number, radiusKm = 1.5) {
  const dLat = radiusKm / 111.32;
  const dLng = radiusKm / (111.32 * Math.cos((lat * Math.PI) / 180));
  return {
    xmin: lng - dLng,
    ymin: lat - dLat,
    xmax: lng + dLng,
    ymax: lat + dLat,
  };
}

/**
 * Query ArcGIS REST layer with spatial + attribute filters
 */
async function queryLayer(
  baseUrl: string,
  layerId: number,
  bbox: { xmin: number; ymin: number; xmax: number; ymax: number },
  where = "1=1",
  outFields = "*",
  returnGeometry = true,
  maxRecords = 500
): Promise<any> {
  const params = new URLSearchParams({
    where,
    geometry: `${bbox.xmin},${bbox.ymin},${bbox.xmax},${bbox.ymax}`,
    geometryType: "esriGeometryEnvelope",
    inSR: "4326",
    spatialRel: "esriSpatialRelIntersects",
    outFields,
    returnGeometry: String(returnGeometry),
    outSR: "4326",
    f: "json",
    resultRecordCount: String(maxRecords),
  });

  const url = `${baseUrl}/${layerId}/query?${params}`;
  const res = await fetch(url, { next: { revalidate: 300 } });
  if (!res.ok) return { features: [] };
  return res.json();
}

/**
 * Convert ArcGIS ring coordinates to centroid [lat, lng]
 */
function ringCentroid(rings: number[][][]): [number, number] {
  const ring = rings[0];
  if (!ring || ring.length === 0) return [0, 0];
  let sumX = 0, sumY = 0;
  for (const [x, y] of ring) {
    sumX += x;
    sumY += y;
  }
  return [sumY / ring.length, sumX / ring.length];
}

/**
 * Calculate approximate lot frontage from ring geometry (shortest road-facing side)
 * Simplified: returns the length of the shortest side > 5m as proxy for frontage
 */
function estimateFrontage(rings: number[][][]): number {
  const ring = rings[0];
  if (!ring || ring.length < 3) return 0;
  const edges: number[] = [];
  for (let i = 0; i < ring.length - 1; i++) {
    const [x1, y1] = ring[i];
    const [x2, y2] = ring[i + 1];
    const dLng = (x2 - x1) * 111320 * Math.cos(((y1 + y2) / 2) * Math.PI / 180);
    const dLat = (y2 - y1) * 110540;
    const length = Math.sqrt(dLng * dLng + dLat * dLat);
    if (length > 3) edges.push(length);
  }
  edges.sort((a, b) => a - b);
  // Frontage is typically the shortest meaningful edge (the road-facing side)
  // For most rectangular lots, the shorter dimension is the frontage
  return edges.length > 0 ? Math.round(edges[0] * 10) / 10 : 0;
}

/**
 * Calculate lot area from ring geometry using Shoelace formula (m²)
 */
function calculateArea(rings: number[][][]): number {
  const ring = rings[0];
  if (!ring || ring.length < 3) return 0;
  let area = 0;
  const midLat = ring.reduce((s, [, y]) => s + y, 0) / ring.length;
  const mPerDegLng = 111320 * Math.cos(midLat * Math.PI / 180);
  const mPerDegLat = 110540;

  for (let i = 0; i < ring.length - 1; i++) {
    const x1 = ring[i][0] * mPerDegLng;
    const y1 = ring[i][1] * mPerDegLat;
    const x2 = ring[i + 1][0] * mPerDegLng;
    const y2 = ring[i + 1][1] * mPerDegLat;
    area += x1 * y2 - x2 * y1;
  }
  return Math.abs(area / 2);
}

export async function GET(req: NextRequest) {
  const sp = req.nextUrl.searchParams;
  const lat = parseFloat(sp.get("lat") || "0");
  const lng = parseFloat(sp.get("lng") || "0");
  const radiusKm = parseFloat(sp.get("radius") || "1.5");
  const zonesRaw = sp.get("zones") || "";
  const lotMin = parseFloat(sp.get("lotMin") || "0");
  const lotMax = parseFloat(sp.get("lotMax") || "999999");
  const frontageMin = parseFloat(sp.get("frontageMin") || "0");
  const excludeHeritage = sp.get("excludeHeritage") === "true";

  if (!lat || !lng) {
    return NextResponse.json({ error: "lat and lng required" }, { status: 400 });
  }

  const bbox = suburbBBox(lat, lng, radiusKm);
  const zones = zonesRaw ? zonesRaw.split(",").map(z => z.trim()) : [];

  try {
    // Step 1: Query Cadastre lots layer for individual lots in the area
    // shape_Area is in Web Mercator m² (distorted at Sydney latitude by ~44%)
    // Scale filter values to match server-side distortion: actual_area * (1/cos²(lat))
    const distortionFactor = 1 / Math.pow(Math.cos(lat * Math.PI / 180), 2);
    const serverLotMin = Math.round(lotMin * distortionFactor);
    const serverLotMax = Math.round(lotMax * distortionFactor);
    const areaWhere = lotMax < 999999
      ? `shape_Area >= ${serverLotMin} AND shape_Area <= ${serverLotMax}`
      : lotMin > 0
      ? `shape_Area >= ${serverLotMin}`
      : "1=1";

    const cadastreResult = await queryLayer(
      CADASTRE_BASE,
      CADASTRE_LOTS,
      bbox,
      areaWhere,
      "*",
      true,
      500
    );

    if (!cadastreResult.features?.length) {
      return NextResponse.json({ results: [], count: 0 });
    }

    // Step 2: Get lot centroids and compute area/frontage
    const lots = cadastreResult.features
      .filter((f: any) => f.geometry?.rings?.length)
      .map((f: any) => {
        const [centLat, centLng] = ringCentroid(f.geometry.rings);
        // Always compute geodesic area from WGS84 rings (shape_Area is distorted)
        const area = calculateArea(f.geometry.rings);
        const frontage = estimateFrontage(f.geometry.rings);
        return {
          lat: centLat,
          lng: centLng,
          area,
          frontage,
          rings: f.geometry.rings,
          lotId: f.attributes?.lotidstring || "",
        };
      })
      .filter((l: any) => {
        // Apply frontage filter
        if (frontageMin > 0 && l.frontage < frontageMin) return false;
        // Verify geodesic area is within requested range
        if (lotMin > 0 && l.area < lotMin) return false;
        if (lotMax < 999999 && l.area > lotMax) return false;
        return true;
      });

    if (!lots.length) {
      return NextResponse.json({ results: [], count: 0 });
    }

    // Step 3: If zones specified, query zoning layer and filter lots by zone
    let results: any[] = lots;
    if (zones.length > 0) {
      const zoneWhere = `SYM_CODE IN (${zones.map(z => `'${z}'`).join(",")})`;
      const zoningResult = await queryLayer(
        EPLANNING_BASE,
        LAYER_ZONING,
        bbox,
        zoneWhere,
        "SYM_CODE,LAY_CLASS",
        true,
        1000
      );

      if (!zoningResult.features?.length) {
        return NextResponse.json({ results: [], count: 0 });
      }

      // Build zone polygons for spatial check
      const zonePolygons = zoningResult.features
        .filter((f: any) => f.geometry?.rings?.[0])
        .map((f: any) => ({
          ring: f.geometry.rings[0],
          code: f.attributes?.SYM_CODE || "",
          label: f.attributes?.LAY_CLASS || "",
        }));

      // Filter lots whose centroid falls within a matching zone polygon
      results = lots.map((lot: any) => {
        const matchedZone = zonePolygons.find((zp: any) =>
          pointInPolygon(lot.lat, lot.lng, zp.ring)
        );
        if (!matchedZone) return null;
        return { ...lot, zone: matchedZone.code, zoneLabel: matchedZone.label };
      }).filter(Boolean);
    } else {
      // No zone filter — query zoning for each lot's centroid (batch by querying the bbox)
      const zoningResult = await queryLayer(
        EPLANNING_BASE,
        LAYER_ZONING,
        bbox,
        "1=1",
        "SYM_CODE,LAY_CLASS",
        true,
        1000
      );

      const zonePolygons = (zoningResult.features || [])
        .filter((f: any) => f.geometry?.rings?.[0])
        .map((f: any) => ({
          ring: f.geometry.rings[0],
          code: f.attributes?.SYM_CODE || "",
          label: f.attributes?.LAY_CLASS || "",
        }));

      results = lots.map((lot: any) => {
        const matchedZone = zonePolygons.find((zp: any) =>
          pointInPolygon(lot.lat, lot.lng, zp.ring)
        );
        return { ...lot, zone: matchedZone?.code || "Unknown", zoneLabel: matchedZone?.label || "" };
      });
    }

    // Step 4: If excludeHeritage, filter out heritage lots
    if (excludeHeritage && results.length > 0) {
      const heritageResult = await queryLayer(
        EPLANNING_BASE,
        LAYER_HERITAGE,
        bbox,
        "1=1",
        "OBJECTID",
        true,
        1000
      );
      if (heritageResult.features?.length) {
        const heritagePolys = heritageResult.features
          .filter((f: any) => f.geometry?.rings?.[0])
          .map((f: any) => f.geometry.rings[0]);

        results = results.filter((r: any) => {
          return !heritagePolys.some((poly: number[][]) => pointInPolygon(r.lat, r.lng, poly));
        });
      }
    }

    // Sort by area descending
    results.sort((a: any, b: any) => b.area - a.area);

    return NextResponse.json({
      results: results.slice(0, 200),
      count: results.length,
      bbox,
    });
  } catch (err: any) {
    console.error("Search API error:", err);
    return NextResponse.json({ error: "Search failed", detail: err.message }, { status: 500 });
  }
}

/**
 * Simple point-in-polygon check (ray casting)
 */
function pointInPolygon(lat: number, lng: number, polygon: number[][]): boolean {
  let inside = false;
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const xi = polygon[i][0], yi = polygon[i][1];
    const xj = polygon[j][0], yj = polygon[j][1];
    const intersect = ((yi > lat) !== (yj > lat)) &&
      (lng < (xj - xi) * (lat - yi) / (yj - yi) + xi);
    if (intersect) inside = !inside;
  }
  return inside;
}
