import { NextRequest, NextResponse } from "next/server";
import { parse } from "node-html-parser";

// In-memory cache
const cache = new Map<string, { data: SSDAProject[]; timestamp: number }>();
const CACHE_TTL = 3600000; // 1 hour

function getCached(lgaNum: number): SSDAProject[] | null {
  const entry = cache.get(String(lgaNum));
  if (!entry || Date.now() - entry.timestamp > CACHE_TTL) return null;
  return entry.data;
}

function setCache(lgaNum: number, data: SSDAProject[]) {
  cache.set(String(lgaNum), { data, timestamp: Date.now() });
}

// LGA name → number mapping (all 128)
const LGA_MAP: Record<string, number> = {
  "Albury City": 1,
  "Armidale Regional": 2,
  "Ballina Shire": 3,
  "Balranald Shire": 4,
  "Bathurst Regional": 5,
  "Bayside": 6,
  "Bega Valley Shire": 7,
  "Bellingen Shire": 8,
  "Berrigan Shire": 9,
  "Blacktown": 10,
  "Bland Shire": 11,
  "Blayney Shire": 12,
  "Blue Mountains": 13,
  "Bogan Shire": 14,
  "Bourke Shire": 15,
  "Brewarrina Shire": 16,
  "Burwood": 17,
  "Byron Shire": 18,
  "Cabonne": 19,
  "Camden": 20,
  "Campbelltown": 21,
  "Canterbury-Bankstown": 22,
  "Carrathool Shire": 23,
  "Central Coast": 24,
  "Central Darling Shire": 25,
  "Cessnock City": 26,
  "City of Canada Bay": 27,
  "City of Parramatta": 28,
  "City of Ryde": 29,
  "City of Sydney": 30,
  "Clarence Valley": 31,
  "Cobar Shire": 32,
  "Coffs Harbour City": 33,
  "Coolamon Shire": 34,
  "Coonamble Shire": 35,
  "Cowra Shire": 36,
  "Dubbo Regional": 37,
  "Cumberland": 38,
  "Dungog Shire": 39,
  "Edward River": 40,
  "Eurobodalla Shire": 41,
  "Fairfield City": 43,
  "Federation": 44,
  "Forbes Shire": 45,
  "Georges River": 46,
  "Gilgandra Shire": 47,
  "Glen Innes Severn": 48,
  "Goulburn Mulwaree": 49,
  "Greater Hume Shire": 50,
  "Griffith City": 51,
  "Gunnedah Shire": 52,
  "Gwydir Shire": 53,
  "Hawkesbury City": 54,
  "Hay Shire": 55,
  "Hilltops": 56,
  "Hornsby Shire": 57,
  "Hunters Hill": 58,
  "Inner West": 59,
  "Inverell Shire": 60,
  "Junee Shire": 61,
  "Kempsey Shire": 62,
  "Kiama Municipal": 63,
  "Ku-ring-gai": 64,
  "Kyogle": 65,
  "Lachlan Shire": 66,
  "Lane Cove": 67,
  "Lake Macquarie City": 68,
  "Leeton Shire": 69,
  "Lismore City": 70,
  "Liverpool City": 71,
  "Liverpool Plains Shire": 72,
  "Lithgow City": 73,
  "Lockhart Shire": 74,
  "Maitland City": 75,
  "Mid-Coast": 76,
  "Mid-Western Regional": 77,
  "Mosman Municipal": 78,
  "Murray River": 79,
  "Murrumbidgee": 80,
  "Muswellbrook Shire": 81,
  "Nambucca Valley": 82,
  "Narrabri Shire": 83,
  "Narrandera Shire": 84,
  "Narromine Shire": 85,
  "Newcastle City": 86,
  "Oberon": 87,
  "North Sydney": 88,
  "Northern Beaches": 89,
  "Orange City": 90,
  "Parkes Shire": 91,
  "Port Macquarie-Hastings": 92,
  "Penrith": 93,
  "Port Stephens": 94,
  "Queanbeyan-Palerang Regional": 95,
  "Randwick City": 97,
  "Richmond Valley": 98,
  "Shellharbour City": 99,
  "Shoalhaven City": 100,
  "Singleton": 101,
  "Snowy Monaro Regional": 102,
  "Snowy Valleys": 103,
  "Strathfield": 104,
  "Sutherland Shire": 105,
  "Tamworth Regional": 106,
  "Temora Shire": 107,
  "Tenterfield Shire": 108,
  "The Hills Shire": 109,
  "Tweed Shire": 110,
  "Upper Hunter Shire": 111,
  "Upper Lachlan Shire": 112,
  "Uralla Shire": 113,
  "Wagga Wagga City": 114,
  "Walcha": 115,
  "Walgett Shire": 116,
  "Warren Shire": 117,
  "Warrumbungle Shire": 118,
  "Weddin Shire": 119,
  "Waverley": 120,
  "Wentworth Shire": 121,
  "Wingecarribee Shire": 122,
  "Willoughby City": 123,
  "Wollondilly Shire": 124,
  "Wollongong City": 125,
  "Woollahra Municipal": 127,
  "Yass Valley": 128,
};

interface SSDAProject {
  caseId: string;
  status: string;
  assessmentType: string;
  lga: string;
  title: string;
  address: string;
  detailUrl: string;
  coords?: { lat: number; lng: number } | null;
}

function parseProjectsFromHTML(html: string): SSDAProject[] {
  const root = parse(html);
  const cards = root.querySelectorAll(".card");
  const projects: SSDAProject[] = [];

  for (const card of cards) {
    const caseIdEl = card.querySelector(".field-field-case-id");
    const titleEl = card.querySelector(".card__title");
    const linkEl = card.querySelector(".field-node-link a") || card.querySelector("a[href*='/major-projects/projects/']");
    const subEl = card.querySelector(".card__sub");

    // Status from tag classes
    let status = "Unknown";
    const tagEl = card.querySelector(".tag--blue, .tag--green, .tag--red, .tag--orange, .tag--grey, .tag");
    if (tagEl) status = tagEl.text.trim();

    // Assessment type
    const caseTypeEl = card.querySelector(".field-field-case-type");

    // Address - look for icon--pin
    let address = "";
    const pinEl = card.querySelector(".icon--pin");
    if (pinEl) {
      const parent = pinEl.parentNode;
      if (parent) address = parent.text.replace(pinEl.text, "").trim();
    }

    const caseId = caseIdEl?.text.trim() || "";
    const title = titleEl?.text.trim() || "";
    if (!caseId && !title) continue;

    projects.push({
      caseId,
      status,
      assessmentType: caseTypeEl?.text.trim() || "",
      lga: subEl?.text.trim() || "",
      title,
      address,
      detailUrl: linkEl?.getAttribute("href") || "",
    });
  }

  return projects;
}

async function scrapeProjects(lgaNum: number): Promise<SSDAProject[]> {
  const allProjects: SSDAProject[] = [];
  const baseUrl = `https://www.planningportal.nsw.gov.au/major-projects/projects?lga=${lgaNum}`;

  // Page 0: regular HTML
  try {
    const res = await fetch(baseUrl, {
      headers: { "User-Agent": "Mozilla/5.0 (compatible; PlanningTool/1.0)" },
    });
    if (!res.ok) return allProjects;
    const html = await res.text();
    allProjects.push(...parseProjectsFromHTML(html));
  } catch {
    return allProjects;
  }

  // Pages 1-2: AJAX
  for (let page = 1; page <= 2; page++) {
    try {
      const res = await fetch(
        `${baseUrl}&_wrapper_format=drupal_ajax&page=${page}`,
        {
          headers: {
            "User-Agent": "Mozilla/5.0 (compatible; PlanningTool/1.0)",
            "Accept": "application/json",
          },
        }
      );
      if (!res.ok) break;
      const json = await res.json();
      // Find the insert command with HTML data
      const insertCmd = json.find((cmd: { command?: string; data?: string }) => cmd.command === "insert" && cmd.data);
      if (!insertCmd?.data) break;
      const projects = parseProjectsFromHTML(insertCmd.data);
      if (projects.length === 0) break;
      allProjects.push(...projects);
    } catch {
      break;
    }
  }

  return allProjects;
}

function findLgaNumber(lgaName: string): number | null {
  // Direct match
  if (LGA_MAP[lgaName]) return LGA_MAP[lgaName];

  // Case-insensitive partial match
  const lower = lgaName.toLowerCase();
  for (const [name, num] of Object.entries(LGA_MAP)) {
    if (name.toLowerCase() === lower) return num;
    if (name.toLowerCase().includes(lower) || lower.includes(name.toLowerCase())) return num;
  }
  return null;
}

export async function GET(req: NextRequest) {
  const lgaParam = req.nextUrl.searchParams.get("lga") || "";

  if (!lgaParam) {
    return NextResponse.json({ projects: [], error: "LGA parameter required" }, { status: 400 });
  }

  const lgaNum = findLgaNumber(lgaParam);
  if (!lgaNum) {
    return NextResponse.json({ projects: [], error: `Unknown LGA: ${lgaParam}` });
  }

  // Check cache
  const cached = getCached(lgaNum);
  if (cached) {
    return NextResponse.json({ projects: cached, lga: lgaParam, cached: true });
  }

  const projects = await scrapeProjects(lgaNum);
  
  // Geocode up to 5 projects with addresses
  const withAddr = projects.filter(p => p.address);
  const toGeocode = withAddr.slice(0, 5);
  await Promise.all(
    toGeocode.map(async (p) => {
      try {
        const res = await fetch(
          `https://api.apps1.nsw.gov.au/planning/viewersf/V1/ePlanningApi/address?a=${encodeURIComponent(p.address)}&noOfRecords=1`
        );
        if (!res.ok) return;
        const data = await res.json();
        if (!data.length) return;
        const lotRes = await fetch(
          `https://api.apps1.nsw.gov.au/planning/viewersf/V1/ePlanningApi/lot?propid=${data[0].propId}`
        );
        if (!lotRes.ok) return;
        const lots = await lotRes.json();
        if (!lots.length || !lots[0]?.geometry?.rings?.[0]) return;
        const ring = lots[0].geometry.rings[0] as number[][];
        const xs = ring.map((pt: number[]) => pt[0]);
        const ys = ring.map((pt: number[]) => pt[1]);
        const mx = xs.reduce((a: number, b: number) => a + b, 0) / xs.length;
        const my = ys.reduce((a: number, b: number) => a + b, 0) / ys.length;
        const lngCoord = (mx * 180) / 20037508.34;
        const latCoord = (Math.atan(Math.exp((my * Math.PI) / 20037508.34)) * 360) / Math.PI - 90;
        (p as any).coords = { lat: latCoord, lng: lngCoord };
      } catch { /* ignore */ }
    })
  );

  if (projects.length > 0) {
    setCache(lgaNum, projects);
  }

  return NextResponse.json({ projects, lga: lgaParam, cached: false });
}
