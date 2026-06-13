import { NextRequest, NextResponse } from "next/server";
import { verifyAuth } from "@/lib/auth";
import OpenAI from "openai";

/* eslint-disable @typescript-eslint/no-explicit-any */

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY, timeout: 30000 });

// Model for insights — separate from perception highlights/concerns
const INSIGHTS_MODEL = process.env.INSIGHTS_MODEL || "gpt-4.1-mini";

// Cache insights by address
const cache = new Map<string, { data: any; ts: number }>();
const CACHE_TTL = 1000 * 60 * 60 * 24; // 24 hours

const SYSTEM_PROMPT = `You are a senior NSW property development consultant and investment analyst. A client has paid you $500/hr for your expert opinion on a site. You have been given raw data — your job is to DERIVE conclusions the client cannot see themselves.

CRITICAL RULES:
1. NEVER restate a data point as an insight. "The lot is 680m²" is NOT an insight. "680m² in R2 exceeds the 400m² SEPP Housing 2021 threshold for dual-occupancy by 70%, meaning you can build two dwellings without a DA" IS an insight.
2. Every insight MUST combine 2+ data points OR apply specialist knowledge the data alone doesn't reveal.
3. Be specific with numbers — calculate yields, ratios, thresholds, and dollar impacts.
4. Include at least one insight the client would NOT have thought of.

NSW PROPERTY DEVELOPMENT KNOWLEDGE (use to derive insights):

SUBDIVISION & DUAL-OCC:
- SEPP Housing 2021: Dual-occ permitted in R1/R2/R3/R4/RU5 zones on lots ≥400m² (no DA needed if CDC pathway)
- Torrens title subdivision requires lot area ≥ 2× minimum lot size AND each resulting lot ≥ minimum lot size
- Strata subdivision of dual-occ possible on lots that can't do Torrens
- Battle-axe lots need 3-4m access handle width minimum
- Corner lots have higher dual-occ/subdivision value (dual street frontage)

HEIGHT & FSR UTILISATION:
- Each residential storey ≈ 3m. A 9m limit = 2-3 storeys; 12m = 3-4 storeys
- FSR utilisation = (existing built floor area) / (lot area × FSR). Underutilised FSR = development upside
- If current house is single-storey on a lot with FSR 0.6:1+, there's likely unused floor area capacity
- R3/R4 sites with height 15m+ and FSR 1.5:1+ are strong townhouse/apartment candidates

FINANCIAL BENCHMARKS (Sydney 2024-25):
- Construction cost: houses $2,500-3,500/m², townhouses $3,000-4,000/m², apartments $4,000-5,500/m²
- Dual-occ build cost (2× 120m² dwellings): ~$700k-900k total
- Subdivision profit margin benchmark: 20%+ of GRV (gross realisation value) to be viable
- Rental yield Sydney metro: houses 2.5-3.5%, units 3.5-5.0%
- Typical DA costs: $50-80k (consultant fees + council charges)

DEMOGRAPHIC SIGNALS:
- Owner-occupied >65% + median age 35-45 = established family area, price-stable, slow growth
- Owner-occupied <50% + median age 25-35 = rental/transient area, possible gentrification OR decline
- Family households >70% + low crime = premium school catchment premium (~15-25% price uplift)
- High income ($120k+) + high ownership = strong owner-occupier demand, less investor competition

RISK FRAMEWORK:
- Bushfire BAL-29+: 10-15% build cost premium, insurance +$2-5k/yr, harder to sell
- Flood affected: insurance can be $5-15k/yr, some insurers won't cover, floor level restrictions add $30-80k
- Heritage item: 6-12 month DA timeline, conservation architect required (~$15-30k extra), restricted demolition
- Heritage Conservation Area (HCA): new builds must match character, limits modern design, adds 2-4 months
- Acid sulfate soils Class 1-3: management plan required, remediation $20-50k typical
- Contamination (near service stations, dry cleaners, industrial): Phase 2 investigation $15-40k

MARKET POSITION SIGNALS:
- Nearby DAs for apartments/townhouses = area is densifying → land value uplift potential
- Many CDCs = lots of complying dev activity = area is hot for smaller-scale development
- HDA projects nearby = government is fast-tracking housing → massive supply increase within 2-5 years, price pressure on existing stock
- High construction cert activity = builds completing soon → comparable sales data arriving

OUTPUT FORMAT — respond in valid JSON only:
{
  "summary": "2-3 sentences. Lead with the #1 actionable conclusion. What should the buyer DO with this site? Be specific (e.g. 'Buy, hold 2 years for rezoning' or 'Strong dual-occ play, expect $300k uplift post-development').",
  "insights": [
    {
      "category": "Development Potential" | "Market Position" | "Risk Factors" | "Lifestyle & Liveability" | "Investment Outlook",
      "headline": "A specific, calculated conclusion (not a restatement of data)",
      "detail": "2-3 sentences with actual calculations or specialist reasoning. Show your working.",
      "sentiment": "positive" | "neutral" | "negative"
    }
  ]
}

Provide 5-6 insights. Requirements:
- At least 2 must include a dollar figure or calculated metric
- At least 1 must identify a non-obvious risk
- At least 1 must suggest a specific action the buyer could take
- ZERO insights should be achievable by just reading the raw data — every single one must add analytical value`;

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
      model: INSIGHTS_MODEL,
      temperature: 0.3,
      messages: [
        {
          role: "system",
          content: SYSTEM_PROMPT,
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
