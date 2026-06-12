import { NextRequest, NextResponse } from "next/server";
import { verifyAuth } from "@/lib/auth";
import { parse } from "node-html-parser";

const LGA_MAP: Record<string, number> = {
  "Albury City":1,"Armidale Regional":2,"Ballina Shire":3,"Balranald Shire":4,"Bathurst Regional":5,
  "Bayside":6,"Bega Valley Shire":7,"Bellingen Shire":8,"Berrigan Shire":9,"Blacktown":10,
  "Bland Shire":11,"Blayney Shire":12,"Blue Mountains":13,"Bogan Shire":14,"Bourke Shire":15,
  "Brewarrina Shire":16,"Burwood":17,"Byron Shire":18,"Cabonne":19,"Camden":20,
  "Campbelltown":21,"Canterbury-Bankstown":22,"Carrathool Shire":23,"Central Coast":24,
  "Central Darling Shire":25,"Cessnock City":26,"City of Canada Bay":27,"City of Parramatta":28,
  "City of Ryde":29,"City of Sydney":30,"Clarence Valley":31,"Cobar Shire":32,
  "Coffs Harbour City":33,"Coolamon Shire":34,"Coonamble Shire":35,"Cowra Shire":36,
  "Dubbo Regional":37,"Cumberland":38,"Dungog Shire":39,"Edward River":40,
  "Eurobodalla Shire":41,"Fairfield City":43,"Federation":44,"Forbes Shire":45,
  "Georges River":46,"Gilgandra Shire":47,"Glen Innes Severn":48,"Goulburn Mulwaree":49,
  "Greater Hume Shire":50,"Griffith City":51,"Gunnedah Shire":52,"Gwydir Shire":53,
  "Hawkesbury City":54,"Hay Shire":55,"Hilltops":56,"Hornsby Shire":57,"Hunters Hill":58,
  "Inner West":59,"Inverell Shire":60,"Junee Shire":61,"Kempsey Shire":62,"Kiama Municipal":63,
  "Ku-ring-gai":64,"Kyogle":65,"Lachlan Shire":66,"Lake Macquarie City":68,"Lane Cove":67,
  "Leeton Shire":69,"Lismore City":70,"Liverpool City":71,"Liverpool Plains Shire":72,
  "Lithgow City":73,"Lockhart Shire":74,"Maitland City":75,"Mid-Coast":76,
  "Mid-Western Regional":77,"Mosman Municipal":78,"Murray River":79,"Murrumbidgee":80,
  "Muswellbrook Shire":81,"Nambucca Valley":82,"Narrabri Shire":83,"Narrandera Shire":84,
  "Narromine Shire":85,"Newcastle City":86,"Oberon":87,"North Sydney":88,"Northern Beaches":89,
  "Orange City":90,"Parkes Shire":91,"Port Macquarie-Hastings":92,"Penrith":93,
  "Port Stephens":94,"Queanbeyan-Palerang Regional":95,"Randwick City":97,"Richmond Valley":98,
  "Shellharbour City":99,"Shoalhaven City":100,"Singleton":101,"Snowy Monaro Regional":102,
  "Snowy Valleys":103,"Strathfield":104,"Sutherland Shire":105,"Tamworth Regional":106,
  "Temora Shire":107,"Tenterfield Shire":108,"The Hills Shire":109,"Tweed Shire":110,
  "Upper Hunter Shire":111,"Upper Lachlan Shire":112,"Uralla Shire":113,"Wagga Wagga City":114,
  "Walcha":115,"Walgett Shire":116,"Warren Shire":117,"Warrumbungle Shire":118,
  "Weddin Shire":119,"Waverley":120,"Wentworth Shire":121,"Wingecarribee Shire":122,
  "Willoughby City":123,"Wollondilly Shire":124,"Wollongong City":125,"Woollahra Municipal":127,
  "Yass Valley":128,
};

interface SSDAProject {
  caseId: string;
  status: string;
  assessmentType: string;
  lga: string;
  title: string;
  address: string;
  detailUrl: string;
}

function parseProjectsFromHTML(html: string): SSDAProject[] {
  const root = parse(html);
  const cards = root.querySelectorAll(".card");
  const projects: SSDAProject[] = [];

  for (const card of cards) {
    const caseId = card.querySelector(".field-field-case-id")?.text.trim() || "";
    const title = card.querySelector(".card__title")?.text.trim() || "";
    if (!caseId && !title) continue;

    const linkEl = card.querySelector(".field-node-link a") || card.querySelector("a[href*='/major-projects/projects/']");
    const sub = card.querySelector(".card__sub")?.text.trim() || "";
    const tagEl = card.querySelector(".tag--blue, .tag--green, .tag--red, .tag--orange, .tag--grey, .tag");
    const caseType = card.querySelector(".field-field-case-type")?.text.trim() || "";

    let address = "";
    const pinEl = card.querySelector(".icon--pin");
    if (pinEl?.parentNode) {
      address = pinEl.parentNode.text.replace(pinEl.text, "").trim();
    }

    projects.push({
      caseId,
      status: tagEl?.text.trim() || "Unknown",
      assessmentType: caseType,
      lga: sub,
      title,
      address,
      detailUrl: linkEl?.getAttribute("href") || "",
    });
  }

  return projects;
}

function findLgaNumber(lgaName: string): number | null {
  if (LGA_MAP[lgaName]) return LGA_MAP[lgaName];
  const lower = lgaName.toLowerCase();
  for (const [name, num] of Object.entries(LGA_MAP)) {
    if (name.toLowerCase() === lower) return num;
    if (name.toLowerCase().includes(lower) || lower.includes(name.toLowerCase())) return num;
  }
  return null;
}

async function scrapeProjects(lgaNum: number): Promise<SSDAProject[]> {
  const allProjects: SSDAProject[] = [];
  const baseUrl = `https://www.planningportal.nsw.gov.au/major-projects/projects?lga=${lgaNum}`;

  try {
    const res = await fetch(baseUrl, {
      headers: { "User-Agent": "Mozilla/5.0 (compatible; PlanningTool/1.0)" },
    });
    if (!res.ok) return allProjects;
    allProjects.push(...parseProjectsFromHTML(await res.text()));
  } catch {
    return allProjects;
  }

  for (let page = 1; page <= 2; page++) {
    try {
      const res = await fetch(`${baseUrl}&_wrapper_format=drupal_ajax&page=${page}`, {
        headers: { "User-Agent": "Mozilla/5.0 (compatible; PlanningTool/1.0)", Accept: "application/json" },
      });
      if (!res.ok) break;
      const json = await res.json();
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

export async function GET(req: NextRequest) {
  const { response } = await verifyAuth(req);
  if (response) return response;

  const lgaParam = req.nextUrl.searchParams.get("lga") || "";
  if (!lgaParam) {
    return NextResponse.json({ projects: [], error: "LGA parameter required" }, { status: 400 });
  }

  const lgaNum = findLgaNumber(lgaParam);
  if (!lgaNum) {
    return NextResponse.json({ projects: [], error: `Unknown LGA: ${lgaParam}` });
  }

  const projects = await scrapeProjects(lgaNum);
  return NextResponse.json({ projects, lga: lgaParam });
}
