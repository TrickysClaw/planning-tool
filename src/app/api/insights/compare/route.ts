import { NextRequest, NextResponse } from "next/server";
import { verifyAuth } from "@/lib/auth";
import OpenAI from "openai";

/* eslint-disable @typescript-eslint/no-explicit-any */

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY, timeout: 45000 });
const MODEL = process.env.INSIGHTS_MODEL || "gpt-4.1-mini";

const cache = new Map<string, { data: any; ts: number }>();
const CACHE_TTL = 1000 * 60 * 60 * 24;

const SYSTEM_PROMPT = `You are a senior NSW property development consultant. A client is comparing two sites to decide which to buy. You have been given raw data for both. Your job is to compare them head-to-head across key dimensions.

CRITICAL RULES:
1. NEVER just restate data. Calculate differences, ratios, and implications.
2. Every comparison must lead to a conclusion about which site wins that category and WHY.
3. Use specific numbers — dollar figures, percentages, yield calculations.
4. The verdict must give a clear recommendation with reasoning, acknowledging tradeoffs.

Use the same NSW property development knowledge as your standard analysis (subdivision thresholds, construction costs, demographic signals, risk framework, etc).

OUTPUT FORMAT - respond in valid JSON only:
{
  "summary": "2-3 sentences. Lead with the clear winner and why. If it depends on buyer type, say so (e.g. 'Property A for low-risk income, Property B for high-growth speculation').",
  "categories": [
    {
      "name": "Development Potential" | "Risk Profile" | "Market Position" | "Investment Outlook" | "Actionable Strategy",
      "headline": "One-line comparative conclusion",
      "propertyA": "2-3 sentences on Property A's position in this category with specific numbers",
      "propertyB": "2-3 sentences on Property B's position in this category with specific numbers",
      "winner": "A" | "B" | "Tie",
      "reasoning": "Why one wins — must reference a specific metric or calculation"
    }
  ],
  "verdict": {
    "winner": "A" | "B" | "Depends",
    "headline": "Clear recommendation in one line",
    "detail": "3-4 sentences. If 'Depends', explain for which buyer type each property is better."
  }
}

Provide exactly 5 categories. Requirements:
- At least 2 categories must include dollar figures or calculated metrics
- The verdict must be decisive (avoid wishy-washy "both are good")
- If one property clearly dominates, say so plainly`;

export async function POST(request: NextRequest) {
  const { response } = await verifyAuth(request);
  if (response) return response;

  const body = await request.json();
  const { addressA, addressB, siteDataA, siteDataB } = body;

  if (!addressA || !addressB || !siteDataA || !siteDataB) {
    return NextResponse.json({ error: "Both properties are required" }, { status: 400 });
  }

  // Check cache
  const cacheKey = `${addressA.toLowerCase().trim()}|${addressB.toLowerCase().trim()}`;
  const cached = cache.get(cacheKey);
  if (cached && Date.now() - cached.ts < CACHE_TTL) {
    return NextResponse.json(cached.data);
  }

  const context = `PROPERTY A: ${buildContext(addressA, siteDataA)}\n\n---\n\nPROPERTY B: ${buildContext(addressB, siteDataB)}`;

  try {
    const result = await openai.chat.completions.create({
      model: MODEL,
      temperature: 0.3,
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: context },
      ],
    });

    const raw = result.choices[0]?.message?.content || "";
    const jsonStr = raw.replace(/```json\s*/, "").replace(/```\s*$/, "").trim();
    const parsed = JSON.parse(jsonStr);

    cache.set(cacheKey, { data: parsed, ts: Date.now() });
    return NextResponse.json(parsed);
  } catch (err: any) {
    console.error("Compare insights error:", err);
    return NextResponse.json({ error: "Failed to generate comparison" }, { status: 500 });
  }
}

function buildContext(address: string, data: any): string {
  const parts: string[] = [address];

  const planning = data.planning?.results || [];
  const zoning = planning.find((r: any) => r.layerName === "Land Zoning");
  const hob = planning.find((r: any) => r.layerName === "Height of Buildings");
  const fsr = planning.find((r: any) => r.layerName === "Floor Space Ratio");
  const mls = planning.find((r: any) => r.layerName === "Minimum Lot Size");
  const heritage = planning.find((r: any) => r.layerName === "Heritage");

  if (zoning) parts.push(`Zone: ${zoning.attributes?.SYM_CODE || "?"} - ${zoning.attributes?.LAY_CLASS || ""}`);
  if (hob) parts.push(`Height: ${hob.attributes?.LAY_CLASS || "N/A"}`);
  if (fsr) parts.push(`FSR: ${fsr.attributes?.LAY_CLASS || "N/A"}`);
  if (mls) parts.push(`Min Lot Size: ${mls.attributes?.LAY_CLASS || "N/A"}`);
  if (heritage) parts.push(`Heritage: ${heritage.attributes?.LAY_CLASS || "Listed"}`);

  const lot = data.cadastre?.features?.[0]?.attributes;
  if (lot) {
    if (lot.computedArea || lot.planlotarea) parts.push(`Lot Area: ${Math.round(lot.computedArea || lot.planlotarea)}m²`);
    if (lot.lotFrontage) parts.push(`Frontage: ${Math.round(lot.lotFrontage)}m`);
    if (lot.lotDepth) parts.push(`Depth: ${Math.round(lot.lotDepth)}m`);
  }

  if (data.councilName) parts.push(`Council: ${data.councilName}`);

  const hazard = data.hazard;
  if (hazard) {
    const flags: string[] = [];
    if (hazard.bushfire?.features?.length > 0) flags.push("Bushfire prone");
    if (hazard.flood?.features?.length > 0) flags.push("Flood affected");
    if (hazard.landslide?.features?.length > 0) flags.push("Landslide risk");
    if (hazard.acidSulfate?.features?.length > 0) flags.push("Acid sulfate soils");
    parts.push(flags.length > 0 ? `Hazards: ${flags.join(", ")}` : "Hazards: None");
  }

  const perc = data.perception;
  if (perc && !perc.error) {
    if (perc.crimeRate) parts.push(`Crime: ${perc.crimeRate}`);
    if (perc.medianIncome) parts.push(`Median Income: $${perc.medianIncome.toLocaleString()}/yr`);
    if (perc.medianHousePrice) parts.push(`Median House Price: $${perc.medianHousePrice.toLocaleString()}`);
    if (perc.demographics?.familyPercentage) parts.push(`Families: ${perc.demographics.familyPercentage}%`);
    if (perc.demographics?.ownerOccupied) parts.push(`Owner-occupied: ${perc.demographics.ownerOccupied}%`);
  }

  const das = data.da?.results || [];
  const cdcs = data.cdc?.results || [];
  const ccs = data.cc?.results || [];
  parts.push(`Nearby: ${das.length} DAs, ${cdcs.length} CDCs, ${ccs.length} CCs`);

  const hda = data.hda || [];
  if (hda.length > 0) parts.push(`HDA Projects: ${hda.length} nearby`);

  return parts.join("\n");
}
