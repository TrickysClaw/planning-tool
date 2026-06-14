import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import OpenAI from "openai";

/* eslint-disable @typescript-eslint/no-explicit-any */

let _openai: OpenAI | null = null;
function getOpenAI() {
  if (!_openai) _openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY, timeout: 30000 });
  return _openai;
}

// Model for insights - separate from perception highlights/concerns
const INSIGHTS_MODEL = process.env.INSIGHTS_MODEL || "gpt-5.4-mini";

// Cache insights by address
const cache = new Map<string, { data: any; ts: number }>();
const CACHE_TTL = 1000 * 60 * 60 * 24; // 24 hours

const SYSTEM_PROMPT = `You are a senior NSW property development consultant and investment analyst. A client has paid you $500/hr for your expert opinion on a site. You have been given raw data - your job is to DERIVE conclusions the client cannot see themselves.

CRITICAL RULES:
1. NEVER restate a data point as an insight. "The lot is 680m²" is NOT an insight. "680m² in R2 exceeds the 400m² SEPP Housing 2021 threshold for dual-occupancy by 70%, meaning you can build two dwellings without a DA" IS an insight.
2. Every insight MUST combine 2+ data points OR apply specialist knowledge the data alone doesn't reveal.
3. Be specific with numbers - calculate yields, ratios, thresholds, and dollar impacts.
4. Include at least one insight the client would NOT have thought of.
5. NEVER claim physical attributes you cannot verify from the provided data (views, aspect, elevation, noise levels, natural light, proximity to specific landmarks, streetscape character etc.) unless this information is EXPLICITLY present in the data. If data doesn't confirm it, don't state it.
6. Only reference facts that are explicitly provided in the dataset. Do not infer or assume physical characteristics of the property or its surroundings.

NSW PROPERTY DEVELOPMENT KNOWLEDGE (use to derive insights):

SUBDIVISION & DUAL-OCC:
- SEPP Housing 2021: Dual-occ permitted in R1/R2/R3/R4/RU5 zones on lots ≥400m² (no DA needed if CDC pathway)
- Torrens title subdivision requires lot area ≥ 2�- minimum lot size AND each resulting lot ≥ minimum lot size
- Strata subdivision of dual-occ possible on lots that can't do Torrens
- Battle-axe lots need 3-4m access handle width minimum
- Corner lots have higher dual-occ/subdivision value (dual street frontage)

HEIGHT & FSR UTILISATION:
- Each residential storey ≈ 3m. A 9m limit = 2-3 storeys; 12m = 3-4 storeys
- FSR utilisation = (existing built floor area) / (lot area �- FSR). Underutilised FSR = development upside
- If current house is single-storey on a lot with FSR 0.6:1+, there's likely unused floor area capacity
- R3/R4 sites with height 15m+ and FSR 1.5:1+ are strong townhouse/apartment candidates

FINANCIAL BENCHMARKS (Sydney 2024-25):
- Construction cost: houses $2,500-3,500/m², townhouses $3,000-4,000/m², apartments $4,000-5,500/m²
- Dual-occ build cost (2�- 120m² dwellings): ~$700k-900k total
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

OUTPUT FORMAT - respond in valid JSON only:
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
- At least 1 must suggest a specific action the client could take
- ZERO insights should be achievable by just reading the raw data - every single one must add analytical value`;

// Match free-text role to known prompt overlay keys
function matchRoleToKey(role: string): string | null {
  const r = role.toLowerCase();
  if (r.includes("owner") || r.includes("homeowner") || r.includes("home buyer")) return "property_owner";
  if (r.includes("develop")) return "developer";
  if (r.includes("invest") || r.includes("buyer")) return "investor";
  if (r.includes("planner") || r.includes("planning")) return "town_planner";
  if (r.includes("project manag") || r.includes("pm") || r.includes("construction")) return "project_manager";
  return null;
}

// Role-specific prompt overlays
const ROLE_PROMPTS: Record<string, string> = {
  property_owner: `CLIENT CONTEXT: This client is a PROPERTY OWNER - they likely already own this site or are considering purchasing it for personal use/long-term hold. Focus on:
- What can they DO with their land right now (subdivide, add a granny flat, dual-occ)?
- What permissions/approvals pathway is simplest?
- What's the uplift potential if they develop vs sell as-is?
- What risks could affect their property value?
- Think like their trusted advisor helping them unlock hidden value from their own asset.
Frame the summary as what they should DO with their property.`,

  developer: `CLIENT CONTEXT: This client is a PROPERTY DEVELOPER - they're evaluating this site as a development opportunity for profit. Focus on:
- Feasibility: what's the highest-and-best-use development? (dual-occ, townhouses, apartments?)
- Numbers: GRV, construction cost estimates, profit margin potential
- Planning pathway: DA vs CDC, likely assessment timeframe, council disposition
- Competition: what are nearby developers doing? Is this area already saturated?
- Risk-adjusted return: what could go wrong and what's the downside exposure?
Frame the summary as a go/no-go recommendation with expected profit range.`,

  investor: `CLIENT CONTEXT: This client is a PROPERTY INVESTOR - they're evaluating this site for capital growth and/or rental yield. Focus on:
- Yield analysis: estimated rental return vs purchase price
- Capital growth signals: demographic trends, infrastructure pipeline, rezoning potential
- Risk factors that could erode returns (supply glut, strata issues, insurance costs)
- Comparable investment alternatives in the area
- Hold period recommendation and exit strategy
Frame the summary as an investment thesis with expected ROI timeframe.`,

  town_planner: `CLIENT CONTEXT: This client is a TOWN PLANNER - they need technical planning analysis for a client assessment or pre-DA advice. Focus on:
- Development standards compliance: height, FSR, setbacks, lot size thresholds
- Applicable SEPPs and their override effects on LEP controls
- Likely merit assessment issues and precedent from nearby DAs
- Clause 4.6 variation potential if controls are constraining
- Council's demonstrated position based on nearby determination patterns
Frame the summary as a professional planning opinion on development feasibility.`,

  project_manager: `CLIENT CONTEXT: This client is a PROJECT MANAGER - they need to understand scope, timeline, and coordination requirements. Focus on:
- Likely approval pathway and realistic timeline (pre-DA, DA, CC stages)
- Key consultants needed (heritage, traffic, arborist, geotech etc.) based on site constraints
- Construction complexity signals from the site and nearby builds
- Staging opportunities and critical path items
- Budget risk factors and contingency recommendations
Frame the summary as a project brief highlighting scope, timeline risks, and coordination needs.`,
};

function getSupabaseFromRequest(request: NextRequest) {
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return request.cookies.getAll(); },
        setAll() { /* read-only */ },
      },
    }
  );
}

export async function POST(request: NextRequest) {
  const supabase = getSupabaseFromRequest(request);
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  // Fetch user profile for role-based prompt
  const { data: profile } = await supabase
    .from("profiles")
    .select("role, goal")
    .eq("id", user.id)
    .single();

  const body = await request.json();
  const { address, siteData } = body;

  if (!address || !siteData) {
    return NextResponse.json({ error: "address and siteData are required" }, { status: 400 });
  }

  // Check cache (include role in key so different roles get different insights)
  const userRole = (profile?.role || "investor").toLowerCase().trim();
  const cacheKey = `${address.toLowerCase().trim()}::${userRole}`;
  const cached = cache.get(cacheKey);
  if (cached && Date.now() - cached.ts < CACHE_TTL) {
    return NextResponse.json(cached.data);
  }

  // Build a comprehensive context string from all the collected data
  const context = buildContext(address, siteData);

  // Build system prompt with role-specific overlay
  let systemPrompt = SYSTEM_PROMPT;
  // Match free-text role to known overlays, or inject directly
  const roleKey = matchRoleToKey(userRole);
  const roleOverlay = roleKey ? ROLE_PROMPTS[roleKey] : null;
  if (roleOverlay) {
    systemPrompt += `\n\n${roleOverlay}`;
  } else if (userRole) {
    systemPrompt += `\n\nCLIENT CONTEXT: This client describes themselves as a "${profile?.role}". Tailor your insights to what would be most relevant and actionable for someone in that role.`;
  }
  if (profile?.goal) {
    systemPrompt += `\n\nCLIENT'S STATED GOAL: "${profile.goal}" — tailor your analysis and recommendations to help them achieve this specific objective.`;
  }

  try {
    const response = await getOpenAI().chat.completions.create({
      model: INSIGHTS_MODEL,
      temperature: 0.3,
      messages: [
        {
          role: "system",
          content: systemPrompt,
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

  if (zoning) parts.push(`ZONING: ${zoning.attributes?.SYM_CODE || "Unknown"} - ${zoning.attributes?.LAY_CLASS || ""}`);
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
    const recentDAs = das.slice(0, 10).map((d: any) => {
      const details = [d.status || "N/A", `cost: $${(d.costOfDevelopment || 0).toLocaleString()}`];
      if (d.dwellings) details.push(`${d.dwellings} dwellings`);
      if (d.storeys) details.push(`${d.storeys} storeys`);
      if (d.lodgementDate) details.push(`lodged: ${d.lodgementDate.slice(0, 10)}`);
      if (d.determinationDate) details.push(`determined: ${d.determinationDate.slice(0, 10)}`);
      if (d.distance) details.push(`${d.distance}m away`);
      return `- ${d.description || d.type?.join(", ") || "Unknown"} (${details.join(", ")})`;
    });
    parts.push(recentDAs.join("\n"));
  }

  // CDCs
  const cdcs = data.cdc?.results || [];
  if (cdcs.length > 0) {
    parts.push(`NEARBY CDCs: ${cdcs.length} complying development certificates`);
    const recentCDCs = cdcs.slice(0, 5).map((d: any) => {
      const details = [d.status || "N/A", `cost: $${(d.costOfDevelopment || 0).toLocaleString()}`];
      if (d.dwellings) details.push(`${d.dwellings} dwellings`);
      if (d.storeys) details.push(`${d.storeys} storeys`);
      if (d.lodgementDate) details.push(`lodged: ${d.lodgementDate.slice(0, 10)}`);
      if (d.distance) details.push(`${d.distance}m away`);
      return `- ${d.description || d.type?.join(", ") || "Unknown"} (${details.join(", ")})`;
    });
    parts.push(recentCDCs.join("\n"));
  }

  // CCs
  const ccs = data.cc?.results || [];
  if (ccs.length > 0) {
    parts.push(`NEARBY CONSTRUCTION CERTIFICATES: ${ccs.length}`);
    const recentCCs = ccs.slice(0, 5).map((d: any) => {
      const details = [d.status || "N/A", `cost: $${(d.costOfDevelopment || 0).toLocaleString()}`];
      if (d.units) details.push(`${d.units} units`);
      if (d.storeys) details.push(`${d.storeys} storeys`);
      if (d.proposedFloorArea) details.push(`${d.proposedFloorArea}m² proposed`);
      if (d.proposedUse) details.push(`use: ${d.proposedUse}`);
      if (d.determinationDate) details.push(`determined: ${d.determinationDate.slice(0, 10)}`);
      if (d.distance) details.push(`${d.distance}m away`);
      return `- ${d.description || d.type?.join(", ") || "Unknown"} (${details.join(", ")})`;
    });
    parts.push(recentCCs.join("\n"));
  }

  // HDA
  const hda = data.hda || [];
  if (hda.length > 0) {
    parts.push(`HDA PROJECTS NEARBY: ${hda.length} Housing Delivery Authority proposals in vicinity`);
    const hdaDetails = hda.slice(0, 5).map((p: any) => {
      const details: string[] = [];
      if (p.type) details.push(p.type);
      if (p.dwellings) details.push(`${p.dwellings} dwellings`);
      if (p.outcome) details.push(`outcome: ${p.outcome}`);
      if (p.recommendation) details.push(`recommendation: ${p.recommendation}`);
      if (p.distance) details.push(`${p.distance}m away`);
      return `- ${p.address || p.description || "Unknown"} (${details.join(", ")})`;
    });
    parts.push(hdaDetails.join("\n"));
  }

  return parts.join("\n");
}
