import { NextRequest, NextResponse } from "next/server";
import { HDA_PROJECTS } from "../../data/hdaProjects";

function extractSuburb(address: string): string | null {
  // Address format: "56 RIVERBRAE AVENUE RIVERSTONE 2765"
  // Extract suburb = word(s) before the 4-digit postcode
  const m = address.match(/([A-Z][A-Z\s]+?)\s+\d{4}$/i);
  if (m) return m[1].trim();
  // Fallback: last word before any trailing number
  const parts = address.trim().split(/\s+/);
  if (parts.length >= 2) {
    // Walk backwards past postcode
    let i = parts.length - 1;
    if (/^\d{4}$/.test(parts[i])) i--;
    if (i >= 0) return parts[i];
  }
  return null;
}

export async function GET(req: NextRequest) {
  const address = req.nextUrl.searchParams.get("address") || "";
  if (!address) return NextResponse.json({ projects: [] });

  const suburb = extractSuburb(address);
  if (!suburb) return NextResponse.json({ projects: [] });

  const suburbLower = suburb.toLowerCase();

  const matches = HDA_PROJECTS.filter((p) => {
    const pSuburb = (p.suburb || "").toLowerCase();
    const pAddress = (p.address || "").toLowerCase();
    return (
      pSuburb.includes(suburbLower) ||
      suburbLower.includes(pSuburb) ||
      pAddress.includes(suburbLower)
    );
  });

  // Sort by briefing_date desc
  matches.sort((a, b) => (b.briefing_date || "").localeCompare(a.briefing_date || ""));

  return NextResponse.json({ projects: matches, suburb });
}
