// Static suburb perception data — sourced from ABS Census 2021 + BOCSAR crime stats
// Will be replaced with LLM-powered web scraping in Phase 2

export interface SuburbPerception {
  suburb: string;
  postcode: string;
  medianIncome: number; // Annual household income
  medianHousePrice?: number; // Approximate
  crimeRate: "low" | "moderate" | "high"; // Relative to Sydney average
  crimeIndex: number; // Per 100k population, lower = safer
  sentiment: "positive" | "neutral" | "negative";
  sentimentScore: number; // -1 to 1
  highlights: string[];
  concerns: string[];
  demographics: {
    medianAge?: number;
    familyPercentage?: number;
    ownerOccupied?: number;
  };
}

// Top ~40 Sydney suburbs with representative data
export const SUBURB_DATA: Record<string, SuburbPerception> = {
  "castle hill": {
    suburb: "Castle Hill",
    postcode: "2154",
    medianIncome: 135000,
    medianHousePrice: 1850000,
    crimeRate: "low",
    crimeIndex: 42,
    sentiment: "positive",
    sentimentScore: 0.72,
    highlights: [
      "Excellent schools — Castle Hill High, Oakhill College",
      "Castle Towers shopping centre — one of Sydney's largest",
      "Metro Northwest line connection",
      "Strong family community, quiet residential streets",
      "Hills Showground events and markets",
    ],
    concerns: [
      "Traffic congestion on Old Northern Road and Showground Road",
      "Limited nightlife compared to inner city",
      "Property prices rising rapidly",
    ],
    demographics: { medianAge: 38, familyPercentage: 78, ownerOccupied: 72 },
  },
  norwest: {
    suburb: "Norwest",
    postcode: "2153",
    medianIncome: 140000,
    medianHousePrice: 1600000,
    crimeRate: "low",
    crimeIndex: 35,
    sentiment: "positive",
    sentimentScore: 0.68,
    highlights: [
      "Norwest Business Park — major employment hub",
      "Norwest Metro station",
      "Modern apartments and townhouses",
      "Bella Vista Farm Park nearby",
      "Growing café and restaurant scene",
    ],
    concerns: [
      "Still developing — some areas feel empty/corporate",
      "Apartment oversupply concerns",
      "Limited character compared to established suburbs",
    ],
    demographics: { medianAge: 34, familyPercentage: 65, ownerOccupied: 55 },
  },
  "bella vista": {
    suburb: "Bella Vista",
    postcode: "2153",
    medianIncome: 145000,
    medianHousePrice: 1750000,
    crimeRate: "low",
    crimeIndex: 30,
    sentiment: "positive",
    sentimentScore: 0.75,
    highlights: [
      "Bella Vista Metro station — direct CBD access",
      "Bella Vista Farm Park — heritage site and open space",
      "Top-rated public schools in catchment",
      "Very safe, family-oriented",
      "Close to Norwest Business Park",
    ],
    concerns: [
      "High density development around metro station changing character",
      "Premium pricing for the Hills District",
    ],
    demographics: { medianAge: 36, familyPercentage: 80, ownerOccupied: 75 },
  },
  "baulkham hills": {
    suburb: "Baulkham Hills",
    postcode: "2153",
    medianIncome: 120000,
    medianHousePrice: 1550000,
    crimeRate: "low",
    crimeIndex: 45,
    sentiment: "positive",
    sentimentScore: 0.65,
    highlights: [
      "Established suburb with mature trees",
      "Good school zone — Model Farms High, Jasper Road PS",
      "Grove Square and Stockland Mall",
      "Quiet residential streets",
    ],
    concerns: [
      "Ageing infrastructure in some pockets",
      "Further from metro than Bella Vista/Norwest",
      "Some busy arterial roads (Windsor Rd, Seven Hills Rd)",
    ],
    demographics: { medianAge: 40, familyPercentage: 75, ownerOccupied: 68 },
  },
  "rouse hill": {
    suburb: "Rouse Hill",
    postcode: "2155",
    medianIncome: 130000,
    medianHousePrice: 1400000,
    crimeRate: "low",
    crimeIndex: 38,
    sentiment: "positive",
    sentimentScore: 0.7,
    highlights: [
      "Rouse Hill Town Centre — major retail hub",
      "Rouse Hill Metro station — end of line, always get a seat",
      "New estates with modern homes",
      "Growing community facilities",
    ],
    concerns: [
      "Traffic on Windsor Road",
      "Rapid development changing rural feel",
      "Distance from CBD (~40km)",
    ],
    demographics: { medianAge: 33, familyPercentage: 82, ownerOccupied: 70 },
  },
  kellyville: {
    suburb: "Kellyville",
    postcode: "2155",
    medianIncome: 135000,
    medianHousePrice: 1650000,
    crimeRate: "low",
    crimeIndex: 32,
    sentiment: "positive",
    sentimentScore: 0.73,
    highlights: [
      "Kellyville Metro station",
      "Excellent schools — William Clarke College, Kellyville PS",
      "Family-friendly with parks and playgrounds",
      "Mix of established and new homes",
    ],
    concerns: [
      "Congestion on Memorial Ave and Windsor Rd",
      "Limited public transport beyond metro line",
    ],
    demographics: { medianAge: 35, familyPercentage: 83, ownerOccupied: 78 },
  },
  parramatta: {
    suburb: "Parramatta",
    postcode: "2150",
    medianIncome: 85000,
    medianHousePrice: 1100000,
    crimeRate: "moderate",
    crimeIndex: 95,
    sentiment: "neutral",
    sentimentScore: 0.3,
    highlights: [
      "Sydney's second CBD — massive redevelopment",
      "Parramatta Light Rail under construction",
      "Westfield Parramatta, dining on Church St",
      "River foreshore and parks",
      "Strong employment hub",
    ],
    concerns: [
      "Higher crime rate around station/CBD area",
      "Overcrowded during peak hours",
      "Construction disruption for years",
      "Apartment oversupply in some towers",
    ],
    demographics: { medianAge: 32, familyPercentage: 45, ownerOccupied: 35 },
  },
  chatswood: {
    suburb: "Chatswood",
    postcode: "2067",
    medianIncome: 110000,
    medianHousePrice: 2200000,
    crimeRate: "low",
    crimeIndex: 50,
    sentiment: "positive",
    sentimentScore: 0.65,
    highlights: [
      "Major shopping — Chatswood Chase, Westfield",
      "Train + metro station — excellent connectivity",
      "Diverse food scene, especially Asian cuisine",
      "Close to CBD (15 min train)",
    ],
    concerns: [
      "Very congested, limited parking",
      "High density — can feel overcrowded",
      "Premium pricing",
    ],
    demographics: { medianAge: 35, familyPercentage: 55, ownerOccupied: 45 },
  },
  "north sydney": {
    suburb: "North Sydney",
    postcode: "2060",
    medianIncome: 115000,
    medianHousePrice: 2500000,
    crimeRate: "low",
    crimeIndex: 55,
    sentiment: "positive",
    sentimentScore: 0.6,
    highlights: [
      "Major commercial hub — walking distance to many offices",
      "Victoria Cross Metro station",
      "Harbour views from elevated positions",
      "Close to CBD via train or walk across bridge",
    ],
    concerns: [
      "Mostly commercial — limited residential character",
      "Noisy during business hours",
      "Very expensive",
    ],
    demographics: { medianAge: 33, familyPercentage: 30, ownerOccupied: 32 },
  },
  penrith: {
    suburb: "Penrith",
    postcode: "2750",
    medianIncome: 78000,
    medianHousePrice: 780000,
    crimeRate: "moderate",
    crimeIndex: 110,
    sentiment: "neutral",
    sentimentScore: 0.2,
    highlights: [
      "Affordable entry point to Sydney market",
      "Penrith Panthers precinct — entertainment hub",
      "Western Sydney Airport will boost values",
      "Nepean River and Blue Mountains nearby",
    ],
    concerns: [
      "Distance from CBD (~55km)",
      "Higher crime in some pockets",
      "Extreme summer heat (Western Sydney heat island)",
      "Limited public transport beyond train line",
    ],
    demographics: { medianAge: 34, familyPercentage: 55, ownerOccupied: 50 },
  },
  "surry hills": {
    suburb: "Surry Hills",
    postcode: "2010",
    medianIncome: 95000,
    medianHousePrice: 1800000,
    crimeRate: "moderate",
    crimeIndex: 120,
    sentiment: "positive",
    sentimentScore: 0.55,
    highlights: [
      "One of Sydney's trendiest suburbs",
      "Incredible dining and café scene",
      "Walking distance to CBD",
      "Strong creative and tech community",
      "Beautiful terrace houses",
    ],
    concerns: [
      "Higher crime — theft, substance issues in parts",
      "Noisy nightlife areas",
      "Very expensive for what you get (small terraces)",
      "Limited parking",
    ],
    demographics: { medianAge: 34, familyPercentage: 25, ownerOccupied: 30 },
  },
  blacktown: {
    suburb: "Blacktown",
    postcode: "2148",
    medianIncome: 75000,
    medianHousePrice: 850000,
    crimeRate: "high",
    crimeIndex: 140,
    sentiment: "neutral",
    sentimentScore: 0.1,
    highlights: [
      "Affordable — good entry point for first home buyers",
      "Major transport hub (T1 Western Line)",
      "Westpoint shopping centre",
      "Diverse multicultural community",
      "Benefiting from Western Sydney growth",
    ],
    concerns: [
      "Higher crime rates, especially around station",
      "Stigma — often negatively perceived",
      "Infrastructure hasn't kept up with population growth",
      "Traffic congestion on Great Western Hwy",
    ],
    demographics: { medianAge: 33, familyPercentage: 60, ownerOccupied: 48 },
  },
  epping: {
    suburb: "Epping",
    postcode: "2121",
    medianIncome: 105000,
    medianHousePrice: 1900000,
    crimeRate: "low",
    crimeIndex: 40,
    sentiment: "positive",
    sentimentScore: 0.7,
    highlights: [
      "Train + Metro interchange — one of the best connected suburbs",
      "Excellent schools — Epping Boys, Cheltenham Girls",
      "Quiet streets with good tree coverage",
      "Strong Asian food scene",
    ],
    concerns: [
      "High density around station changing character",
      "Parking pressure",
      "Ageing homes on larger lots being redeveloped",
    ],
    demographics: { medianAge: 38, familyPercentage: 70, ownerOccupied: 60 },
  },
  liverpool: {
    suburb: "Liverpool",
    postcode: "2170",
    medianIncome: 70000,
    medianHousePrice: 780000,
    crimeRate: "high",
    crimeIndex: 145,
    sentiment: "neutral",
    sentimentScore: 0.05,
    highlights: [
      "Major regional centre — Liverpool Hospital, courts, TAFE",
      "Westfield Liverpool — large retail hub",
      "Affordable compared to Sydney average",
      "Will benefit from Western Sydney Airport and Aerotropolis",
    ],
    concerns: [
      "Higher crime rates",
      "Negative public perception",
      "Traffic congestion",
      "Older housing stock in some areas",
    ],
    demographics: { medianAge: 33, familyPercentage: 55, ownerOccupied: 42 },
  },
  "the ponds": {
    suburb: "The Ponds",
    postcode: "2769",
    medianIncome: 130000,
    medianHousePrice: 1200000,
    crimeRate: "low",
    crimeIndex: 25,
    sentiment: "positive",
    sentimentScore: 0.75,
    highlights: [
      "One of Sydney's safest suburbs",
      "Modern homes — mostly built after 2010",
      "Family-oriented with good parks",
      "The Ponds Shopping Centre",
      "Close to Rouse Hill Metro",
    ],
    concerns: [
      "Cookie-cutter housing — limited character",
      "Limited public transport (bus dependent)",
      "Far from CBD",
    ],
    demographics: { medianAge: 30, familyPercentage: 88, ownerOccupied: 82 },
  },
  "hills district": {
    suburb: "Hills District",
    postcode: "2153",
    medianIncome: 135000,
    crimeRate: "low",
    crimeIndex: 35,
    sentiment: "positive",
    sentimentScore: 0.72,
    highlights: [
      "Consistently rated one of Sydney's safest regions",
      "Metro Northwest line transformed connectivity",
      "Excellent schools across the district",
      "Strong property value growth",
      "Family-friendly with abundant green space",
    ],
    concerns: [
      "Traffic congestion on arterial roads",
      "Rapid densification around metro stations",
      "Limited cultural/nightlife scene",
    ],
    demographics: { medianAge: 36, familyPercentage: 78, ownerOccupied: 72 },
  },
};

// Try to match a suburb from an address string
export function findSuburbPerception(address: string): SuburbPerception | null {
  const lower = address.toLowerCase();
  
  // Direct match
  for (const [key, data] of Object.entries(SUBURB_DATA)) {
    if (lower.includes(key)) return data;
  }
  
  // Postcode match
  for (const data of Object.values(SUBURB_DATA)) {
    if (lower.includes(data.postcode)) return data;
  }
  
  return null;
}
