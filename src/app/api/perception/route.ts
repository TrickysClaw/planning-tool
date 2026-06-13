import { NextRequest, NextResponse } from "next/server";
import { verifyAuth } from "@/lib/auth";
import OpenAI from "openai";
import { createAdminClient } from "@/lib/supabase";

/* eslint-disable @typescript-eslint/no-explicit-any */

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY, timeout: 10000 });

// Cache results — real data doesn't change often
const cache = new Map<string, { data: any; ts: number }>();
const CACHE_TTL = 1000 * 60 * 60 * 24 * 7; // 7 days

// ABS randomly perturbs counts below ~50 for privacy. Data from SA2s with
// very few dwellings/households is statistically meaningless (e.g. national parks).
const MIN_DWELLING_THRESHOLD = 50;

/**
 * Get SA2 region code and name from coordinates via ABS geospatial service
 */
async function getSA2FromCoords(lat: number, lng: number): Promise<{ code: string; name: string } | null> {
  const params = new URLSearchParams({
    geometry: `${lng},${lat}`,
    geometryType: "esriGeometryPoint",
    inSR: "4326",
    spatialRel: "esriSpatialRelIntersects",
    outFields: "sa2_code_2021,sa2_name_2021",
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
    if (data?.error) return null;
    const attrs = data?.features?.[0]?.attributes;
    if (!attrs) return null;
    return { code: attrs.sa2_code_2021, name: attrs.sa2_name_2021 };
  } catch {
    return null;
  }
}

/**
 * Extract state code from SA2 code (first digit: 1=NSW, 2=VIC, 3=QLD, etc.)
 */
function getStateFromSA2(sa2Code: string): string {
  return sa2Code.charAt(0);
}

/**
 * Fetch ABS Census 2021 G02 data (Selected Medians and Averages) for an SA2 region.
 * Uses the ABS Data API (free, no key needed).
 * MEDAVG codes: 1=Median age, 4=Median household income/wk, 5=Mortgage/mo, 6=Rent/wk
 */
async function getABSCensusData(sa2Code: string): Promise<{
  medianAge: number | null;
  medianWeeklyIncome: number | null;
  medianMonthlyMortgage: number | null;
  medianWeeklyRent: number | null;
}> {
  try {
    const state = getStateFromSA2(sa2Code);
    const url = `https://data.api.abs.gov.au/rest/data/ABS,C21_G02_SA2,1.0.0/.${sa2Code}.SA2.${state}?format=csv`;
    const res = await fetch(url, { next: { revalidate: 86400 } });

    if (!res.ok) {
      return { medianAge: null, medianWeeklyIncome: null, medianMonthlyMortgage: null, medianWeeklyRent: null };
    }

    const csv = await res.text();
    const lines = csv.split("\n").filter(l => l.trim());
    // CSV: DATAFLOW,MEDAVG,REGION,REGION_TYPE,STATE,TIME_PERIOD,OBS_VALUE
    const values = new Map<string, number>();
    for (const line of lines.slice(1)) {
      const cols = line.split(",");
      const code = cols[1]?.trim();
      const val = parseFloat(cols[cols.length - 1]?.trim() || "");
      if (code && !isNaN(val)) values.set(code, val);
    }

    // MEDAVG 8 = average household size. Values < 1.0 indicate non-residential SA2s
    // (national parks, industrial zones, etc.) where medians are meaningless.
    const avgHouseholdSize = values.get("8") ?? 0;
    if (avgHouseholdSize < 1.0) {
      return { medianAge: null, medianWeeklyIncome: null, medianMonthlyMortgage: null, medianWeeklyRent: null };
    }

    return {
      medianAge: values.get("1") ?? null,           // MEDAVG 1: Median age
      medianWeeklyIncome: values.get("4") ?? null,  // MEDAVG 4: Median household income/wk
      medianMonthlyMortgage: values.get("5") ?? null, // MEDAVG 5: Mortgage repayment/mo
      medianWeeklyRent: values.get("6") ?? null,    // MEDAVG 6: Rent/wk
    };
  } catch (err) {
    console.error("ABS Census G02 fetch error:", err);
    return { medianAge: null, medianWeeklyIncome: null, medianMonthlyMortgage: null, medianWeeklyRent: null };
  }
}

/**
 * Fetch ABS Census 2021 G37 data (Tenure Type by Dwelling Structure) for owner-occupied %.
 * TENLLD codes: 1=Owned outright, 2=Owned with mortgage, _T=Total
 * We use STRD=_T (all dwelling types) for totals.
 */
async function getABSTenureData(sa2Code: string): Promise<number | null> {
  try {
    const state = getStateFromSA2(sa2Code);
    // Fetch only total dwelling structure (_T): all tenure types
    const url = `https://data.api.abs.gov.au/rest/data/ABS,C21_G37_SA2,1.0.0/._T.${sa2Code}.SA2.${state}?format=csv`;
    const res = await fetch(url, { next: { revalidate: 86400 } });
    if (!res.ok) return null;

    const csv = await res.text();
    const lines = csv.split("\n").filter(l => l.trim());
    // CSV: DATAFLOW,TENLLD,STRD,REGION,REGION_TYPE,STATE,TIME_PERIOD,OBS_VALUE
    const values = new Map<string, number>();
    for (const line of lines.slice(1)) {
      const cols = line.split(",");
      const tenlld = cols[1]?.trim();
      const val = parseFloat(cols[cols.length - 1]?.trim() || "");
      if (tenlld && !isNaN(val)) values.set(tenlld, val);
    }

    const ownedOutright = values.get("1") ?? 0;
    const ownedMortgage = values.get("2") ?? 0;
    const total = values.get("_T");
    if (!total || total < MIN_DWELLING_THRESHOLD) return null;

    // Validate: parts should not exceed total (ABS perturbation artefact)
    if (ownedOutright + ownedMortgage > total) return null;

    return Math.round(((ownedOutright + ownedMortgage) / total) * 100);
  } catch (err) {
    console.error("ABS Tenure fetch error:", err);
    return null;
  }
}

/**
 * Fetch ABS Census 2021 G33 data (Household Composition) for family %.
 * HHCD codes: 1_2=Family households, _T=Total
 * We use HIND=_T (all income levels) for totals.
 */
async function getABSFamilyData(sa2Code: string): Promise<number | null> {
  try {
    const state = getStateFromSA2(sa2Code);
    // Fetch total income (_T) by household composition
    const url = `https://data.api.abs.gov.au/rest/data/ABS,C21_G33_SA2,1.0.0/_T..${sa2Code}.SA2.${state}?format=csv`;
    const res = await fetch(url, { next: { revalidate: 86400 } });
    if (!res.ok) return null;

    const csv = await res.text();
    const lines = csv.split("\n").filter(l => l.trim());
    // CSV: DATAFLOW,HIND,HHCD,REGION,REGION_TYPE,STATE,TIME_PERIOD,OBS_VALUE
    const values = new Map<string, number>();
    for (const line of lines.slice(1)) {
      const cols = line.split(",");
      const hhcd = cols[2]?.trim();
      const val = parseFloat(cols[cols.length - 1]?.trim() || "");
      if (hhcd && !isNaN(val)) values.set(hhcd, val);
    }

    const familyHouseholds = values.get("1_2");
    const total = values.get("_T");
    if (!total || total < MIN_DWELLING_THRESHOLD || familyHouseholds === undefined) return null;

    // Validate: parts should not exceed total
    if (familyHouseholds > total) return null;

    return Math.round((familyHouseholds / total) * 100);
  } catch (err) {
    console.error("ABS Family data fetch error:", err);
    return null;
  }
}

/**
 * Fetch median house price from Domain API (free tier: 500 calls/day).
 * Requires DOMAIN_API_KEY env var. Returns null if not configured or fails.
 * Sign up free at https://developer.domain.com.au/
 */
async function getDomainMedianPrice(suburb: string, postcode: string, state: string = "NSW"): Promise<{
  medianHousePrice: number | null;
  medianUnitPrice: number | null;
} | null> {
  const apiKey = process.env.DOMAIN_API_KEY;
  if (!apiKey) return null;

  try {
    const res = await fetch(
      `https://api.domain.com.au/v1/suburbPerformanceStatistics?state=${state}&suburb=${encodeURIComponent(suburb)}&postcode=${postcode}&propertyCategory=house&chronologicalSpan=12&tUnit=month`,
      {
        headers: { "X-Api-Key": apiKey },
        next: { revalidate: 86400 * 7 }, // Cache 7 days
      }
    );
    if (!res.ok) return null;
    const data = await res.json();
    const houseMedian = data?.series?.seriesInfo?.[0]?.values?.medianSoldPrice ?? null;

    // Also get unit prices
    const unitRes = await fetch(
      `https://api.domain.com.au/v1/suburbPerformanceStatistics?state=${state}&suburb=${encodeURIComponent(suburb)}&postcode=${postcode}&propertyCategory=unit&chronologicalSpan=12&tUnit=month`,
      {
        headers: { "X-Api-Key": apiKey },
        next: { revalidate: 86400 * 7 },
      }
    );
    let unitMedian: number | null = null;
    if (unitRes.ok) {
      const unitData = await unitRes.json();
      unitMedian = unitData?.series?.seriesInfo?.[0]?.values?.medianSoldPrice ?? null;
    }

    return { medianHousePrice: houseMedian, medianUnitPrice: unitMedian };
  } catch {
    return null;
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

// NSW median suburb crime incidents (computed from BOCSAR 2025 suburb data)
const NSW_MEDIAN_SUBURB_INCIDENTS = 50;

interface CrimeData {
  suburb: string;
  totalIncidents: number;
  assault: number;
  breakEnter: number;
  theft: number;
  maliciousDamage: number;
  drugOffences: number;
  domesticViolence: number;
  robbery: number;
  source: "suburb" | "lga";
}

/**
 * Look up BOCSAR crime data from Supabase by suburb name (preferred)
 * Falls back to LGA-level data if suburb not found
 */
async function lookupCrimeBySuburb(suburbName: string, councilName: string | null): Promise<CrimeData | null> {
  const supabase = createAdminClient();

  // Try suburb-level lookup first (most accurate)
  let { data } = await supabase
    .from("bocsar_crime_suburb")
    .select("*")
    .ilike("suburb", suburbName)
    .limit(1);

  // Fallback: pattern match on suburb name
  if (!data || data.length === 0) {
    ({ data } = await supabase
      .from("bocsar_crime_suburb")
      .select("*")
      .ilike("suburb", `%${suburbName}%`)
      .limit(1));
  }

  if (data && data.length > 0) {
    const row = data[0];
    return {
      suburb: row.suburb,
      totalIncidents: row.total_incidents,
      assault: row.assault,
      breakEnter: row.break_enter,
      theft: row.theft,
      maliciousDamage: row.malicious_damage,
      drugOffences: row.drug_offences,
      domesticViolence: row.domestic_violence,
      robbery: row.robbery,
      source: "suburb",
    };
  }

  // Fallback: LGA-level data if suburb not found
  if (!councilName) return null;
  const lgaName = extractLGAName(councilName);

  ({ data } = await supabase
    .from("bocsar_crime")
    .select("*")
    .ilike("lga", lgaName)
    .limit(1));

  if (!data || data.length === 0) {
    ({ data } = await supabase
      .from("bocsar_crime")
      .select("*")
      .ilike("lga", `%${lgaName}%`)
      .limit(1));
  }

  if (!data || data.length === 0) return null;

  const row = data[0];
  return {
    suburb: row.lga,
    totalIncidents: row.total_incidents,
    assault: row.assault,
    breakEnter: row.break_enter,
    theft: row.theft,
    maliciousDamage: row.malicious_damage,
    drugOffences: row.drug_offences,
    domesticViolence: row.domestic_violence,
    robbery: row.robbery,
    source: "lga",
  };
}

/**
 * Extract short LGA name from full council name
 */
function extractLGAName(councilName: string): string {
  let name = councilName.trim();
  name = name.replace(/\s*(CITY|SHIRE|MUNICIPAL|REGIONAL)?\s*COUNCIL$/i, "");
  name = name.replace(/^(CITY|SHIRE)\s+OF\s+/i, "");
  name = name.trim();
  return name.split(/[\s-]+/).map((w, i) => {
    const lower = w.toLowerCase();
    if (i > 0 && ["of", "the", "and"].includes(lower)) return lower;
    return w.charAt(0).toUpperCase() + w.slice(1).toLowerCase();
  }).join(name.includes("-") ? "-" : " ");
}

/**
 * Classify suburb crime level based on total incidents/year
 * Thresholds based on BOCSAR 2025 NSW suburb data distribution
 */
function classifyCrime(incidents: number): "very low" | "low" | "moderate" | "high" | "very high" {
  if (incidents <= 50) return "very low";
  if (incidents <= 200) return "low";
  if (incidents <= 500) return "moderate";
  if (incidents <= 1000) return "high";
  return "very high";
}

export async function GET(req: NextRequest) {
  const { response } = await verifyAuth(req);
  if (response) return response;

  const suburbParam = req.nextUrl.searchParams.get("suburb")?.trim();
  const lat = parseFloat(req.nextUrl.searchParams.get("lat") || "");
  const lng = parseFloat(req.nextUrl.searchParams.get("lng") || "");

  if (!suburbParam) {
    return NextResponse.json({ error: "suburb parameter required" }, { status: 400 });
  }

  // Extract postcode and suburb name from the address/suburb parameter
  const postcodeMatch = suburbParam.match(/(\d{4})\s*$/);
  const postcode = postcodeMatch?.[1] || null;
  // Extract suburb: everything AFTER the street type keyword, before postcode
  // e.g. "25A FORD STREET NORTH RYDE 2113" → "NORTH RYDE"
  const streetTypePattern = /\b(?:STREET|ST|ROAD|RD|AVENUE|AVE|DRIVE|DR|LANE|LN|COURT|CT|PLACE|PL|CRESCENT|CRES|WAY|BOULEVARD|BLVD|PARADE|PDE|CIRCUIT|CCT|CLOSE|CL|TERRACE|TCE)\b\s*/i;
  const streetTypeIdx = suburbParam.search(streetTypePattern);
  let suburb: string;
  if (streetTypeIdx >= 0) {
    // Take everything after the street type, remove postcode
    const afterStreetType = suburbParam.slice(streetTypeIdx).replace(streetTypePattern, "").replace(/\s*\d{4}\s*$/, "").trim();
    suburb = afterStreetType || suburbParam;
  } else {
    // No street type found — might already be just a suburb name
    suburb = suburbParam.replace(/^\d+\w?\s+/, "").replace(/\s*\d{4}\s*$/, "").trim() || suburbParam;
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
    let ownerOccupiedPct: number | null = null;
    let familyPct: number | null = null;
    let domainPrices: Awaited<ReturnType<typeof getDomainMedianPrice>> = null;

    if (!isNaN(lat) && !isNaN(lng)) {
      [sa2Info, councilName] = await Promise.all([
        getSA2FromCoords(lat, lng),
        getCouncilName(lat, lng),
      ]);

      if (sa2Info) {
        [censusData, ownerOccupiedPct, familyPct] = await Promise.all([
          getABSCensusData(sa2Info.code),
          getABSTenureData(sa2Info.code),
          getABSFamilyData(sa2Info.code),
        ]);
      }
    }

    // Domain API for median house prices (optional — requires DOMAIN_API_KEY)
    if (postcode) {
      domainPrices = await getDomainMedianPrice(suburb, postcode);
    }

    // Crime data from BOCSAR via Supabase (suburb-level preferred, LGA fallback)
    const crimeData = await lookupCrimeBySuburb(suburb, councilName);

    // === STEP 2: Build verified facts ===
    const medianAnnualIncome = censusData?.medianWeeklyIncome
      ? Math.round(censusData.medianWeeklyIncome * 52)
      : null;

    const factsSummary = [
      censusData?.medianAge ? `Median age: ${censusData.medianAge}` : null,
      medianAnnualIncome ? `Median household income: $${medianAnnualIncome.toLocaleString()}/yr` : null,
      censusData?.medianWeeklyRent ? `Median rent: $${censusData.medianWeeklyRent}/wk` : null,
      censusData?.medianMonthlyMortgage ? `Median mortgage: $${censusData.medianMonthlyMortgage}/mo` : null,
      ownerOccupiedPct !== null ? `Owner-occupied: ${ownerOccupiedPct}%` : null,
      familyPct !== null ? `Family households: ${familyPct}%` : null,
      domainPrices?.medianHousePrice ? `Median house price: $${domainPrices.medianHousePrice.toLocaleString()} (Domain)` : null,
      domainPrices?.medianUnitPrice ? `Median unit price: $${domainPrices.medianUnitPrice.toLocaleString()} (Domain)` : null,
      crimeData ? `Crime: ${crimeData.totalIncidents} incidents/year in ${crimeData.suburb} (${crimeData.source === 'suburb' ? 'suburb-level' : 'LGA-level'} data). Level: ${classifyCrime(crimeData.totalIncidents)}. NSW median suburb: ${NSW_MEDIAN_SUBURB_INCIDENTS}` : null,
      crimeData ? `Assault: ${crimeData.assault}, Break & enter: ${crimeData.breakEnter}, Theft: ${crimeData.theft}, DV: ${crimeData.domesticViolence}, Robbery: ${crimeData.robbery}` : null,
      councilName ? `Council: ${councilName}` : null,
    ].filter(Boolean).join("\n");

    // === STEP 3: AI interprets data + draws on training knowledge of public opinion ===
    const completion = await openai.chat.completions.create({
      model: "gpt-4.1-mini",
      temperature: 0.4,
      response_format: { type: "json_object" },
      messages: [
        {
          role: "system",
          content: `You summarise how people feel about living in Australian suburbs. You receive verified statistics and must combine them with your knowledge of what residents say online (Reddit r/sydney, r/AusProperty, Whirlpool forums, local Facebook groups, news articles).

Return JSON:
{
  "sentiment": "positive" | "neutral" | "negative",
  "sentimentScore": number between -1.0 and 1.0,
  "highlights": [3-5 strings],
  "concerns": [3-5 strings],
  "medianHousePrice": number or null
}

HIGHLIGHTS = things locals genuinely like about day-to-day life there.
CONCERNS = things locals genuinely complain about day-to-day life there.

GOOD highlights examples:
- "Quiet leafy streets, feels safe walking at night"
- "Great cafe scene along the main strip"
- "Close to bushwalking trails and national parks"
- "Strong community vibe, neighbours actually talk to each other"
- "Kids can walk to school without crossing major roads"
- "Fast train to the city, under 30 minutes"

BAD highlights (NEVER write these):
- "Strong capital growth potential" (investment)
- "High median income indicates affluent demographics" (economic)
- "Low vacancy rates" (investment)
- "Well-positioned for future infrastructure" (marketing)

GOOD concerns examples:
- "Traffic on Pennant Hills Road is brutal at peak hour"
- "Not much nightlife, dead after 9pm"
- "Aircraft noise from the flight path"
- "Limited parking around the station"
- "Feels isolated without a car"
- "Construction noise from new developments everywhere"

BAD concerns (NEVER write these):
- "High entry price point for buyers" (economic)
- "Rental yields below average" (investment)
- "Market saturation from new apartments" (investment)

Each highlight/concern must be under 15 words, written like a real person talking, not a report.
Only include medianHousePrice if NOT already in the verified data.`
        },
        {
          role: "user",
          content: `Suburb: ${suburb}, NSW, Australia.

VERIFIED DATA:
${factsSummary || "Limited data available."}

What do people who live here (or have lived here) actually say about it?`
        }
      ],
    });

    const aiContent = completion.choices[0]?.message?.content;
    if (!aiContent) {
      return NextResponse.json({ error: "No response from AI" }, { status: 502 });
    }

    const ai = JSON.parse(aiContent);

    // === STEP 4: Combine verified facts + AI interpretation ===
    const housePriceVerified = !!domainPrices?.medianHousePrice;
    const medianHousePrice = domainPrices?.medianHousePrice || ai.medianHousePrice || null;

    const result = {
      suburb: sa2Info?.name || suburb,
      sentiment: ai.sentiment,
      sentimentScore: ai.sentimentScore,
      crimeRate: crimeData ? classifyCrime(crimeData.totalIncidents) : (ai.crimeRate || "moderate"),
      crimeIndex: crimeData?.totalIncidents || null,
      medianIncome: medianAnnualIncome || null,
      medianHousePrice,
      medianUnitPrice: domainPrices?.medianUnitPrice || null,
      demographics: {
        medianAge: censusData?.medianAge || null,
        familyPercentage: familyPct ?? null,
        ownerOccupied: ownerOccupiedPct ?? null,
      },
      highlights: ai.highlights,
      concerns: ai.concerns,
      sources: [
        censusData?.medianAge ? "ABS Census 2021 (verified)" : null,
        crimeData ? `BOCSAR NSW Crime Statistics 2025 - ${crimeData.source === 'suburb' ? 'suburb' : 'LGA'} level (verified)` : null,
        ownerOccupiedPct !== null ? "ABS Census 2021 G37 Tenure (verified)" : null,
        familyPct !== null ? "ABS Census 2021 G33 Household Composition (verified)" : null,
        housePriceVerified ? "Domain.com.au median sold price (verified)" : "AI market estimate (house price)",
      ].filter(Boolean),
      // Transparency: tell the frontend what's verified vs estimated
      dataQuality: {
        incomeVerified: !!medianAnnualIncome,
        crimeVerified: !!crimeData,
        demographicsVerified: !!censusData?.medianAge,
        ownerOccupiedVerified: ownerOccupiedPct !== null,
        familyPercentageVerified: familyPct !== null,
        housePriceVerified,
        housePriceEstimated: !housePriceVerified,
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
