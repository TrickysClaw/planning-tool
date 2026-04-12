export interface CouncilEntry {
  name: string;
  lat: number;
  lng: number;
  radius: number; // km approx extent
}

export const councils: CouncilEntry[] = [
  { name: "THE HILLS SHIRE COUNCIL", lat: -33.688, lng: 150.986, radius: 15 },
  { name: "BLACKTOWN CITY COUNCIL", lat: -33.771, lng: 150.906, radius: 12 },
  { name: "CITY OF PARRAMATTA COUNCIL", lat: -33.815, lng: 151.003, radius: 8 },
  { name: "The Council of the Shire of Hornsby", lat: -33.630, lng: 151.098, radius: 14 },
  { name: "PENRITH CITY COUNCIL", lat: -33.751, lng: 150.694, radius: 15 },
  { name: "LIVERPOOL CITY COUNCIL", lat: -33.920, lng: 150.923, radius: 12 },
  { name: "CAMPBELLTOWN CITY COUNCIL", lat: -34.065, lng: 150.814, radius: 12 },
  { name: "SUTHERLAND SHIRE COUNCIL", lat: -34.031, lng: 151.087, radius: 12 },
  { name: "RANDWICK CITY COUNCIL", lat: -33.918, lng: 151.241, radius: 5 },
  { name: "COUNCIL OF THE CITY OF SYDNEY", lat: -33.870, lng: 151.208, radius: 6 },
  { name: "NORTHERN BEACHES COUNCIL", lat: -33.720, lng: 151.270, radius: 14 },
  { name: "BAYSIDE COUNCIL", lat: -33.960, lng: 151.170, radius: 7 },
  { name: "CUMBERLAND COUNCIL", lat: -33.830, lng: 150.940, radius: 7 },
  { name: "CANTERBURY-BANKSTOWN COUNCIL", lat: -33.920, lng: 151.050, radius: 10 },
  { name: "INNER WEST COUNCIL", lat: -33.880, lng: 151.140, radius: 5 },
  { name: "BURWOOD COUNCIL", lat: -33.877, lng: 151.104, radius: 3 },
  { name: "STRATHFIELD MUNICIPAL COUNCIL", lat: -33.875, lng: 151.082, radius: 3 },
  { name: "NORTH SYDNEY COUNCIL", lat: -33.837, lng: 151.207, radius: 4 },
  { name: "LANE COVE MUNICIPAL COUNCIL", lat: -33.815, lng: 151.167, radius: 4 },
  { name: "WILLOUGHBY CITY COUNCIL", lat: -33.800, lng: 151.195, radius: 5 },
  { name: "KU-RING-GAI COUNCIL", lat: -33.727, lng: 151.144, radius: 8 },
  { name: "RYDE CITY COUNCIL", lat: -33.812, lng: 151.107, radius: 5 },
  { name: "FAIRFIELD CITY COUNCIL", lat: -33.870, lng: 150.880, radius: 8 },
  { name: "WOOLLAHRA MUNICIPAL COUNCIL", lat: -33.886, lng: 151.252, radius: 3 },
  { name: "WAVERLEY COUNCIL", lat: -33.897, lng: 151.264, radius: 4 },
  { name: "MOSMAN MUNICIPAL COUNCIL", lat: -33.829, lng: 151.244, radius: 3 },
  { name: "HAWKESBURY CITY COUNCIL", lat: -33.580, lng: 150.760, radius: 25 },
  { name: "CAMDEN COUNCIL", lat: -34.054, lng: 150.697, radius: 14 },
  { name: "WOLLONDILLY SHIRE COUNCIL", lat: -34.180, lng: 150.600, radius: 20 },
  { name: "GEORGES RIVER COUNCIL", lat: -33.960, lng: 151.100, radius: 6 },
  { name: "CITY OF CANADA BAY COUNCIL", lat: -33.860, lng: 151.120, radius: 4 },
  { name: "LAKE MACQUARIE CITY COUNCIL", lat: -33.050, lng: 151.600, radius: 18 },
  { name: "NEWCASTLE CITY COUNCIL", lat: -32.928, lng: 151.776, radius: 10 },
  { name: "CENTRAL COAST COUNCIL", lat: -33.420, lng: 151.340, radius: 20 },
  { name: "WOLLONGONG CITY COUNCIL", lat: -34.424, lng: 150.893, radius: 15 },
  { name: "SHELLHARBOUR CITY COUNCIL", lat: -34.580, lng: 150.860, radius: 10 },
];

function haversineKm(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

/** Return council names to query — nearest + any within 10km */
export function getCouncilsForLocation(lat: number, lng: number): string[] {
  const distances = councils.map((c) => ({
    name: c.name,
    dist: haversineKm(lat, lng, c.lat, c.lng),
  }));
  distances.sort((a, b) => a.dist - b.dist);
  const result = new Set<string>();
  // Always include nearest
  if (distances.length) result.add(distances[0].name);
  // Include any within 10km
  for (const d of distances) {
    if (d.dist <= 10) result.add(d.name);
  }
  return Array.from(result);
}

export { haversineKm };
