import { NextRequest, NextResponse } from "next/server";
import { verifyAuth } from "@/lib/auth";
import OpenAI from "openai";

/* eslint-disable @typescript-eslint/no-explicit-any */

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY, timeout: 30000 });

// Cache insights by address
const cache = new Map<string, { data: any; ts: number }>();
const CACHE_TTL = 1000 * 60 * 60 * 24; // 24 hours

export async function POST(request: NextRequest) {
  const { response } = await verifyAuth(request);
  if (response) return response;

  const body = await request.json();
  const { address, siteData } = body;

  if (!address || !siteData) {
    return NextResponse.json({ error: "address and siteData are required" }, { status: 400 });
  }

  // Check cache
  const cacheKey = address.toLowerCase().trim();
  const cached = cache.get(cacheKey);
  if (cached && Date.now() - cached.ts < CACHE_TTL) {
    return NextResponse.json(cached.data);
  }

  // Build a comprehensive context string from all the collected data
  const context = buildContext(address, siteData);

  try {
    const response = await openai.chat.completions.create({
      model: "gpt-4.1-mini",
      temperature: 0.3,
      messages: [
        {
          role: "system",
          content: `You are an expert Australian property analyst and urban planner. You are given comprehensive data about a property/site in NSW, Australia. Your job is to synthesize ALL the data into actionable insights for a property buyer or developer.

RULES:
- Be direct, specific, and practical. No fluff.
- Reference actual numbers from the data (prices, areas, ratios, distances).
- Identify opportunities and risks that aren't immediately obvious from the raw data alone.
- Consider how different data points interact (e.g. zoning + lot size = subdivision potential, or crime + demographics = area trajectory).
- Write for someone making a financial decision — they want to know: Can I build here? Is it a good investment? What are the hidden risks/opportunities?

OUTPUT FORMAT — respond in valid JSON only:
{
  "summary": "A 2-3 sentence executive summary of the property. What it is, what makes it notable, and the single most important thing a buyer should know.",
  "insights": [
    {
      "category": "Development Potential" | "Market Position" | "Risk Factors" | "Lifestyle & Liveability" | "Investment Outlook",
      "headline": "A bold, specific one-line insight (e.g. 'Dual-occ potential on 680m² R2 lot')",
      "detail": "2-3 sentences explaining the insight with specific data references.",
      "sentiment": "positive" | "neutral" | "negative"
    }
  ]
}

Provide 4-6 insights covering different categories. At least one must be about risk.`,
        },
        {
          role: "user",
          content: context,
        },
      ],
    });

    const raw = response.choices[0]?.message?.content || "";
    // Extract JSON from potential markdown code fences
    const jsonStr = raw.replace(/```json\s*/, "").replace(/```\s*$/, "").trim();
    const result = JSON.parse(jsonStr);

    // Cache it
    cache.set(cacheKey, { data: result, ts: Date.now() });

    return NextResponse.json(result);
  } catch (err: any) {
    console.error("Insights API error:", err);
    return NextResponse.json({ error: "Failed to generate insights" }, { status: 500 });
  }
}

function buildContext(address: string, data: any): string {
  const parts: string[] = [`PROPERTY: ${address}`];

  // Planning controls
  const planning = data.planning?.results || [];
  const zoning = planning.find((r: any) => r.layerName === "Land Zoning");
  const hob = planning.find((r: any) => r.layerName === "Height of Buildings");
  const fsr = planning.find((r: any) => r.layerName === "Floor Space Ratio");
  const mls = planning.find((r: any) => r.layerName === "Minimum Lot Size");
  const heritage = planning.find((r: any) => r.layerName === "Heritage");

  if (zoning) parts.push(`ZONING: ${zoning.attributes?.SYM_CODE || "Unknown"} — ${zoning.attributes?.LAY_CLASS || ""}`);
  if (hob) parts.push(`HEIGHT LIMIT: ${hob.attributes?.LAY_CLASS || "N/A"}`);
  if (fsr) parts.push(`FSR: ${fsr.attributes?.LAY_CLASS || "N/A"}`);
  if (mls) parts.push(`MINIMUM LOT SIZE: ${mls.attributes?.LAY_CLASS || "N/A"}`);
  if (heritage) parts.push(`HERITAGE: ${heritage.attributes?.LAY_CLASS || "Listed"}`);

  // Cadastre / lot info
  const lot = data.cadastre?.features?.[0]?.attributes;
  if (lot) {
    if (lot.cadid) parts.push(`LOT ID: ${lot.cadid}`);
    if (lot.area) parts.push(`LOT AREA: ${lot.area}m²`);
    if (lot.frontage) parts.push(`FRONTAGE: ${lot.frontage}m`);
  }

  // Council
  if (data.councilName) parts.push(`COUNCIL: ${data.councilName}`);

  // Hazards
  const hazard = data.hazard;
  if (hazard) {
    const bushfire = hazard.bushfire?.features?.length > 0;
    const flood = hazard.flood?.features?.length > 0;
    if (bushfire) parts.push(`BUSHFIRE: Property is bushfire prone (${hazard.bushfire.features[0]?.attributes?.Category || "mapped"})`);
    if (flood) parts.push(`FLOOD: Property is flood affected`);
    if (!bushfire && !flood) parts.push("HAZARDS: None identified (no bushfire or flood mapping)");
  }

  // Perception / demographics
  const perc = data.perception;
  if (perc && !perc.error) {
    parts.push(`SUBURB SENTIMENT: ${perc.sentiment} (score: ${perc.sentimentScore})`);
    parts.push(`CRIME: ${perc.crimeRate} (${perc.crimeIndex} incidents/yr)`);
    if (perc.medianIncome) parts.push(`MEDIAN HOUSEHOLD INCOME: $${perc.medianIncome.toLocaleString()}/yr`);
    if (perc.medianHousePrice) parts.push(`MEDIAN HOUSE PRICE: $${perc.medianHousePrice.toLocaleString()}`);
    if (perc.demographics?.medianAge) parts.push(`MEDIAN AGE: ${perc.demographics.medianAge}`);
    if (perc.demographics?.familyPercentage) parts.push(`FAMILY HOUSEHOLDS: ${perc.demographics.familyPercentage}%`);
    if (perc.demographics?.ownerOccupied) parts.push(`OWNER-OCCUPIED: ${perc.demographics.ownerOccupied}%`);
    if (perc.highlights?.length) parts.push(`HIGHLIGHTS: ${perc.highlights.join("; ")}`);
    if (perc.concerns?.length) parts.push(`CONCERNS: ${perc.concerns.join("; ")}`);
  }

  // Nearby DAs
  const das = data.da?.results || [];
  if (das.length > 0) {
    parts.push(`NEARBY DAs: ${das.length} applications within radius`);
    const recentDAs = das.slice(0, 5).map((d: any) =>
      `- ${d.description || d.type?.join(", ") || "Unknown"} (${d.status || "N/A"}, cost: $${(d.costOfDevelopment || 0).toLocaleString()})`
    );
    parts.push(recentDAs.join("\n"));
  }

  // CDCs
  const cdcs = data.cdc?.results || [];
  if (cdcs.length > 0) {
    parts.push(`NEARBY CDCs: ${cdcs.length} complying development certificates`);
  }

  // CCs
  const ccs = data.cc?.results || [];
  if (ccs.length > 0) {
    parts.push(`NEARBY CONSTRUCTION CERTIFICATES: ${ccs.length}`);
  }

  // HDA
  const hda = data.hda || [];
  if (hda.length > 0) {
    parts.push(`HDA PROJECTS NEARBY: ${hda.length} Housing Delivery Authority proposals in vicinity`);
  }

  return parts.join("\n");
}
