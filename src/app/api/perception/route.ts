import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// Simple in-memory cache to avoid repeated API calls for the same suburb
const cache = new Map<string, { data: any; ts: number }>();
const CACHE_TTL = 1000 * 60 * 60 * 24; // 24 hours

export async function GET(req: NextRequest) {
  const suburb = req.nextUrl.searchParams.get("suburb")?.trim();
  if (!suburb) {
    return NextResponse.json({ error: "suburb parameter required" }, { status: 400 });
  }

  const key = suburb.toLowerCase();

  // Check cache
  const cached = cache.get(key);
  if (cached && Date.now() - cached.ts < CACHE_TTL) {
    return NextResponse.json(cached.data);
  }

  try {
    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      temperature: 0.4,
      response_format: { type: "json_object" },
      messages: [
        {
          role: "system",
          content: `You are a Sydney real estate analyst providing suburb perception reports for property investors and developers. 
Return a JSON object with this EXACT structure:
{
  "suburb": "Suburb Name",
  "sentiment": "positive" | "neutral" | "negative",
  "sentimentScore": number between -1 and 1,
  "crimeRate": "low" | "moderate" | "high",
  "crimeIndex": number (incidents per 100k population, Sydney avg ~80),
  "medianIncome": number (annual household income AUD),
  "medianHousePrice": number (AUD, null if unknown),
  "demographics": {
    "medianAge": number,
    "familyPercentage": number (0-100),
    "ownerOccupied": number (0-100)
  },
  "highlights": [5 strings — positive aspects for investors/residents],
  "concerns": [3-5 strings — genuine risks, negatives, or red flags. Be honest and blunt. Every suburb has real problems.],
  "investorInsight": string (3-4 sentences. Be BRUTALLY HONEST. Mention specific risks like oversupply, council pushback on DAs, declining yields, strata saturation, or poor capital growth. If the suburb is genuinely poor for investment, say so. Do NOT default to optimism. Compare to better-performing alternatives where relevant. End with a clear verdict: strong buy / hold / avoid for development.),
  "sources": [list of data sources you drew from e.g. "ABS Census 2021", "BOCSAR Crime Stats", "Domain.com.au"]
}

Base your analysis on:
- ABS Census data (demographics, income, housing)
- BOCSAR NSW crime statistics
- Real estate market data (Domain, CoreLogic)
- Community sentiment from Reddit, local forums, news
- Infrastructure & transport proximity
- School catchments and amenities
- Recent DA approval/refusal rates in the LGA
- Rental yield trends and vacancy rates

CRITICAL INSTRUCTIONS:
- Be brutally honest. Do NOT sugarcoat. Every suburb has real downsides — state them clearly.
- The "investorInsight" must include at least ONE specific risk or warning, even for premium suburbs.
- Concerns should be substantive (e.g. "council regularly refuses medium-density DAs" or "rental yields below 3% make cashflow negative") not generic fluff.
- If a suburb is overpriced relative to fundamentals, say so. If yields are poor, say so. If there's oversupply risk from nearby development, say so.
- All monetary values in AUD.`
        },
        {
          role: "user",
          content: `Provide a comprehensive perception analysis for the Sydney suburb: ${suburb}, NSW, Australia.`
        }
      ],
    });

    const content = completion.choices[0]?.message?.content;
    if (!content) {
      return NextResponse.json({ error: "No response from AI" }, { status: 502 });
    }

    const data = JSON.parse(content);

    // Cache the result
    cache.set(key, { data, ts: Date.now() });

    return NextResponse.json(data);
  } catch (err: any) {
    console.error("Perception API error:", err?.message || err);
    return NextResponse.json(
      { error: "Failed to generate perception analysis", detail: err?.message },
      { status: 500 }
    );
  }
}
