// Test ABS Census API for tenure (G33) and family composition (G25)
// Using SA2 code for Sydney - Haymarket - The Rocks: 117011364

const SA2_CODE = "117011364";

async function testDataflow(name, id, keyPath) {
  const url = `https://data.api.abs.gov.au/rest/data/ABS,${id},1.0.0/${keyPath}?format=csv`;
  console.log(`\n=== ${name} (${id}) ===`);
  try {
    const res = await fetch(url);
    console.log(`Status: ${res.status}`);
    if (!res.ok) {
      console.log(`Error: ${await res.text().then(t => t.slice(0, 300))}`);
      return;
    }
    const csv = await res.text();
    const lines = csv.split("\n").filter(l => l.trim());
    console.log(`Lines: ${lines.length}`);
    for (let i = 0; i < Math.min(25, lines.length); i++) {
      console.log(lines[i]);
    }
  } catch (err) {
    console.log(`Fetch error: ${err.message}`);
  }
}

async function getStructure(id) {
  const url = `https://data.api.abs.gov.au/rest/datastructure/ABS/${id}?format=csv`;
  console.log(`\n=== Structure for ${id} ===`);
  try {
    const res = await fetch(url);
    console.log(`Status: ${res.status}`);
    if (!res.ok) {
      // Try JSON format
      const url2 = `https://data.api.abs.gov.au/rest/datastructure/ABS/${id}`;
      const res2 = await fetch(url2, {headers: {Accept: 'application/json'}});
      if (res2.ok) {
        const json = await res2.json();
        const dims = json?.data?.dataStructures?.[0]?.dataStructureComponents?.dimensionList?.dimensions;
        if (dims) {
          console.log("Dimensions:", dims.map(d => `${d.id}(pos:${d.position})`).join(", "));
        }
      } else {
        console.log(`Structure error: ${res2.status}`);
      }
      return;
    }
    const text = await res.text();
    console.log(text.slice(0, 500));
  } catch (err) {
    console.log(`Error: ${err.message}`);
  }
}

async function main() {
  // Try Domain's internal GraphQL/API that their suburb pages use
  console.log("=== Domain Suburb API ===");
  try {
    const r1 = await fetch(`https://www.domain.com.au/api/suburb-profile/markers/north-ryde-nsw-2113`, {
      headers: { "User-Agent": "Mozilla/5.0" }
    });
    console.log("Domain markers:", r1.status);
    if (r1.ok) console.log(await r1.text().then(t => t.slice(0, 300)));
  } catch(e) { console.log("Error:", e.message); }
  
  // Try realestate.com.au
  console.log("\n=== REA Suburb Data ===");
  try {
    const r2 = await fetch(`https://www.realestate.com.au/neighbourhoods/north+ryde-2113-nsw`, {
      headers: { "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36" }
    });
    console.log("REA Status:", r2.status);
    if (r2.ok) {
      const html = await r2.text();
      // Look for NEXT_DATA or embedded JSON
      const nextData = html.match(/<script id="__NEXT_DATA__"[^>]*>([\s\S]*?)<\/script>/);
      if (nextData) {
        const prices = nextData[1].match(/"median[^"]*?":\s*\d+/gi);
        console.log("Found NEXT_DATA, median fields:", prices?.slice(0, 10));
        // Extract house median specifically
        const houseMedian = nextData[1].match(/"medianSoldPrice":\s*(\d+)/);
        console.log("medianSoldPrice:", houseMedian?.[1]);
      }
      // Fallback - search entire HTML
      const allMedians = html.match(/"median[^"]*?":\s*\d{5,}/gi);
      console.log("All median values in page:", allMedians?.slice(0, 10));
    }
  } catch(e) { console.log("Error:", e.message); }
  
  // Try the Domain GraphQL endpoint (used by their SPA)
  console.log("\n=== Domain GraphQL ===");
  try {
    const r3 = await fetch("https://www.domain.com.au/graphql", {
      method: "POST",
      headers: { 
        "Content-Type": "application/json",
        "User-Agent": "Mozilla/5.0"
      },
      body: JSON.stringify({
        operationName: "suburbProfileQuery",
        variables: { suburb: "north-ryde", state: "nsw", postcode: "2113" },
        query: "query suburbProfileQuery($suburb: String!, $state: String!, $postcode: String!) { suburbProfile(suburb: $suburb, state: $state, postcode: $postcode) { medianSoldPrice { house unit } } }"
      })
    });
    console.log("Domain GraphQL:", r3.status);
    if (r3.ok) console.log(await r3.text().then(t => t.slice(0, 500)));
  } catch(e) { console.log("Error:", e.message); }
}

main();
