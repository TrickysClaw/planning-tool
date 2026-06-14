export interface PropertySnapshot {
  address: string;
  lat: number;
  lng: number;
  zone: string;
  zoneName: string;
  lep: string | null;
  councilName: string | null;
  lotDP: string | null;
  lotArea: number | null;
  frontage: number | null;
  depth: number | null;
  hob: number | null;
  fsr: number | null;
  minLotSize: number | null;
  maxGFA: number | null;
  hazards: {
    bushfire: boolean;
    flood: boolean;
    landslide: boolean;
    acidSulfate: boolean;
    heritage: boolean;
    keySite: boolean;
  };
  perception: {
    sentiment: string;
    crimeRate: string;
    medianIncome: number | null;
    medianHousePrice: number | null;
  } | null;
  nearbyDAs: number;
  nearbyCDCs: number;
  nearbyCCs: number;
  hdaProjects: number;
  searchedAt: string; // ISO timestamp
}

/** Build a curated snapshot from the raw API responses */
export function buildPropertySnapshot(
  address: string,
  lat: number,
  lng: number,
  raw: {
    planning: any;
    hazard: any;
    cadastre: any;
    councilName: string;
    perception: any;
    da: any;
    cdc: any;
    cc: any;
    hda: any[];
  }
): PropertySnapshot {
  const results = raw.planning?.results || [];
  const find = (name: string) => results.find((r: any) => r.layerName === name)?.attributes || {};

  const zoning = find("Land Zoning");
  const heightData = find("Height of Building");
  const fsrData = find("Floor Space Ratio");
  const lotSizeData = find("Lot Size");
  const heritage = find("Heritage");

  const cad = raw.cadastre?.features?.[0]?.attributes || {};
  const lotArea = cad.computedArea || cad.planlotarea || null;
  const heightM = parseFloat(heightData.MAX_B_H);
  const fsrNum = parseFloat(fsrData.FSR);
  const effectiveLot = lotArea && lotArea > 0 ? Math.round(lotArea) : 600;

  const bush = raw.hazard?.bushfire?.features || [];
  const flood = raw.hazard?.flood?.features || [];
  const landslide = raw.hazard?.landslide?.features || [];
  const acidSulfate = raw.hazard?.acidSulfate?.features || [];
  const keySites = raw.hazard?.keySites?.features || [];

  const perc = raw.perception;

  return {
    address,
    lat,
    lng,
    zone: zoning.SYM_CODE || "",
    zoneName: zoning.LAY_CLASS || "",
    lep: zoning.EPI_NAME || null,
    councilName: raw.councilName || zoning.LGA_NAME || null,
    lotDP: cad.lotnumber ? `Lot ${cad.lotnumber} / DP ${cad.plannumber}` : null,
    lotArea: lotArea ? Math.round(lotArea) : null,
    frontage: cad.lotFrontage ? Math.round(cad.lotFrontage) : null,
    depth: cad.lotDepth ? Math.round(cad.lotDepth) : null,
    hob: !isNaN(heightM) ? heightM : null,
    fsr: !isNaN(fsrNum) ? fsrNum : null,
    minLotSize: lotSizeData.LOT_SIZE ? parseFloat(lotSizeData.LOT_SIZE) : null,
    maxGFA: !isNaN(fsrNum) ? Math.round(fsrNum * effectiveLot) : null,
    hazards: {
      bushfire: bush.length > 0,
      flood: flood.length > 0,
      landslide: landslide.length > 0,
      acidSulfate: acidSulfate.length > 0,
      heritage: !!(heritage.LABEL || heritage.HER_NAME),
      keySite: keySites.length > 0,
    },
    perception: perc ? {
      sentiment: perc.sentiment || "unknown",
      crimeRate: perc.crimeRate || "unknown",
      medianIncome: perc.medianIncome || null,
      medianHousePrice: perc.medianHousePrice || null,
    } : null,
    nearbyDAs: (raw.da?.results || []).length,
    nearbyCDCs: (raw.cdc?.results || []).length,
    nearbyCCs: (raw.cc?.results || []).length,
    hdaProjects: (raw.hda || []).length,
    searchedAt: new Date().toISOString(),
  };
}
