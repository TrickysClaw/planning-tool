import { NextRequest, NextResponse } from "next/server";
import { verifyAuth } from "@/lib/auth";
import OpenAI from "openai";
import { lookupCrime, classifyCrime, SYDNEY_AVERAGE_RATE } from "@/data/bocsarCrime";

/* eslint-disable @typescript-eslint/no-explicit-any */

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY, timeout: 10000 });

// Cache results — real data doesn't change often
const cache = new Map<string, { data: any; ts: number }>();
const CACHE_TTL = 1000 * 60 * 60 * 24 * 7; // 7 days

/**
 * Get SA2 region code and name from coordinates via ABS geospatial service
 */
async function getSA2FromCoords(lat: number, lng: number): Promise<{ code: string; name: string } | null> {
  const params = new URLSearchParams({
    geometry: `${lng},${lat}`,
    geometryType: "esriGeometryPoint",
    inSR: "4326",
    spatialRel: "esriSpatialRelIntersects",
    outFields: "SA2_CODE21,SA2_NAME21",
    returnGeometry: "false",
    f: "json",
  });
  try {
    const res = await fetch(
      `https://geo.abs.gov.au/arcgis/rest/services/ASGS2021/SA2/MapServer/0/query?${params}`,
      { next: { revalidate: 86400 } }
    );
    if (!res.ok) return null;
    const data = await res.json();
    const attrs = data?.features?.[0]?.attributes;
    if (!attrs) return null;
    return { code: attrs.SA2_CODE21, name: attrs.SA2_NAME21 };
  } catch {
    return null;
  }
}

/**
 * Fetch ABS Census 2021 data for an SA2 region.
 * Uses the ABS Data API (free, no key needed).
 * Dataflow: C21_G02_SA2 — Selected Medians and Averages
 */
async function getABSCensusData(sa2Code: string): Promise<{
  medianAge: number | null;
  medianWeeklyIncome: number | null;
  medianMonthlyMortgage: number | null;
  medianWeeklyRent: number | null;
}> {
  try {
    const url = `https://data.api.abs.gov.au/rest/data/ABS,C21_G02_SA2,1.0.0/${sa2Code}..?format=csv&labels=both`;
    const res = await fetch(url, { next: { revalidate: 86400 } });

    if (!res.ok) {
      return { medianAge: null, medianWeeklyIncome: null, medianMonthlyMortgage: null, medianWeeklyRent: null };
    }

    const csv = await res.text();
    const lines = csv.split("\n").filter(l => l.trim());

    let medianAge: number | null = null;
    let medianWeeklyIncome: number | null = null;
    let medianMonthlyMortgage: number | null = null;
    let medianWeeklyRent: number | null = null;

    for (const line of lines) {
      const lower = line.toLowerCase();
      const value = parseFloat(line.split(",").pop()?.trim() || "");
      if (isNaN(value)) continue;

      if (lower.includes("median_age") || lower.includes("median age")) {
        medianAge = value;
      } else if (lower.includes("median_tot_hhd_inc_wkly") || lower.includes("median total household income")) {
        medianWeeklyIncome = value;
      } else if (lower.includes("median_mortgage") || lower.includes("median mortgage")) {
        medianMonthlyMortgage = value;
      } else if (lower.includes("median_rent") || lower.includes("median rent")) {
        medianWeeklyRent = value;
      }
    }

    return { medianAge, medianWeeklyIncome, medianMonthlyMortgage, medianWeeklyRent };
  } catch (err) {
    console.error("ABS Census fetch error:", err);
    return { medianAge: null, medianWeeklyIncome: null, medianMonthlyMortgage: null, medianWeeklyRent: null };
  }
}

/**
 * Get council name from coordinates
 */
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
  const { response } = await verifyAuth(req);
  if (response) return response;

  const suburb = req.nextUrl.searchParams.get("suburb")?.trim();
  const lat = parseFloat(req.nextUrl.searchParams.get("lat") || "");
  const lng = parseFloat(req.nextUrl.searchParams.get("lng") || "");

  if (!suburb) {
    return NextResponse.json({ error: "suburb parameter required" }, { status: 400 });
  }

  const cacheKey = `${suburb.toLowerCase()}-${lat || ""}-${lng || ""}`;
  const cached = cache.get(cacheKey);
  if (cached && Date.now() - cached.ts < CACHE_TTL) {
    return NextResponse.json(cached.data);
  }

  try {
    // === STEP 1: Gather REAL data from authoritative sources ===
    let sa2Info: { code: string; name: string } | null = null;
    let censusData: Awaited<ReturnType<typeof getABSCensusData>> | null = null;
    let councilName: string | null = null;

    if (!isNaN(lat) && !isNaN(lng)) {
      [sa2Info, councilName] = await Promise.all([
        getSA2FromCoords(lat, lng),
        getCouncilName(lat, lng),
      ]);

      if (sa2Info) {
        censusData = await getABSCensusData(sa2Info.code);
      }
    }

    // Crime data from BOCSAR static lookup
    const crimeData = councilName ? lookupCrime(councilName) : null;

    // === STEP 2: Build verified facts ===
    const medianAnnualIncome = censusData?.medianWeeklyIncome
      ? Math.round(censusData.medianWeeklyIncome * 52)
      : null;

    const factsSummary = [
      censusData?.medianAge ? `Median age: ${censusData.medianAge}` : null,
      medianAnnualIncome ? `Median household income: $${medianAnnualIncome.toLocaleString()}/yr` : null,
      censusData?.medianWeeklyRent ? `Median rent: $${censusData.medianWeeklyRent}/wk` : null,
      censusData?.medianMonthlyMortgage ? `Median mortgage: $${censusData.medianMonthlyMortgage}/mo` : null,
      crimeData ? `Crime rate: ${crimeData.totalRate} per 100k (Sydney avg: ${SYDNEY_AVERAGE_RATE}). Level: ${classifyCrime(crimeData.totalRate)}` : null,
      crimeData ? `Assault: ${crimeData.assault}/100k, Break & enter: ${crimeData.breakEnter}/100k, DV: ${crimeData.domesticViolence}/100k` : null,
      councilName ? `Council: ${councilName}` : null,
    ].filter(Boolean).join("\n");

    // === STEP 3: AI provides QUALITATIVE interpretation only ===
    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      temperature: 0.5,
      response_format: { type: "json_object" },
      messages: [
        {
          role: "system",
          content: `You are a Sydney property investment analyst. You will be given VERIFIED statistics about a suburb from ABS Census and BOCSAR crime data. Your job is to INTERPRET these facts — provide qualitative insights only.

Return JSON with this EXACT structure:
{
  "sentiment": "positive" | "neutral" | "negative",
  "sentimentScore": number between -1 and 1,
  "highlights": [5 strings — positive aspects for investors/residents],
  "concerns": [3-5 strings — genuine risks. Be brutally honest.],
  "investorInsight": string (3-4 sentences. Honest assessment. End with: strong buy / hold / avoid for development.),
  "medianHousePrice": number or null (your best estimate in AUD),
  "ownerOccupied": number (0-100 estimate),
  "familyPercentage": number (0-100 estimate)
}

RULES:
- Do NOT invent income, crime, or age numbers — those are provided as verified facts.
- Only provide qualitative interpretation and market estimates.
- Be brutally honest. Every suburb has real downsides.
- Concerns must be substantive (council DA hostility, oversupply, poor yields, traffic).`
        },
        {
          role: "user",
          content: `Interpret this data for: ${suburb}, NSW, Australia.

VERIFIED DATA (ABS Census 2021 + BOCSAR Crime Stats):
${factsSummary || "Limited verified data available. Provide your best qualitative assessment but flag uncertainty."}

Give your qualitative interpretation.`
        }
      ],
    });

    const aiContent = completion.choices[0]?.message?.content;
    if (!aiContent) {
      return NextResponse.json({ error: "No response from AI" }, { status: 502 });
    }

    const ai = JSON.parse(aiContent);

    // === STEP 4: Combine verified facts + AI interpretation ===
    const result = {
      suburb: sa2Info?.name || suburb,
      sentiment: ai.sentiment,
      sentimentScore: ai.sentimentScore,
      crimeRate: crimeData ? classifyCrime(crimeData.totalRate) : (ai.crimeRate || "moderate"),
      crimeIndex: crimeData?.totalRate || null,
      medianIncome: medianAnnualIncome || null,
      medianHousePrice: ai.medianHousePrice || null,
      demographics: {
        medianAge: censusData?.medianAge || null,
        familyPercentage: ai.familyPercentage || null,
        ownerOccupied: ai.ownerOccupied || null,
      },
      highlights: ai.highlights,
      concerns: ai.concerns,
      investorInsight: ai.investorInsight,
      sources: [
        censusData?.medianAge ? "ABS Census 2021 (verified)" : null,
        crimeData ? "BOCSAR NSW Crime Statistics (verified)" : null,
        "AI market interpretation",
      ].filter(Boolean),
      // Transparency: tell the frontend what's verified vs estimated
      dataQuality: {
        incomeVerified: !!medianAnnualIncome,
        crimeVerified: !!crimeData,
        demographicsVerified: !!censusData?.medianAge,
        housePriceEstimated: true,
      },
    };

    cache.set(cacheKey, { data: result, ts: Date.now() });
    return NextResponse.json(result);
  } catch (err: any) {
    console.error("Perception API error:", err?.message || err);
    return NextResponse.json(
      { error: "Failed to generate perception analysis", detail: err?.message },
      { status: 500 }
    );
  }
}
