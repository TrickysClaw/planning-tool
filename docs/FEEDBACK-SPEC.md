# Feedback Implementation Spec

**Date:** 2026-06-14  
**Status:** Planned  
**Branch:** TBD (feature/feedback-round-1)

---

## 1. Rename "AI Property Insights" → "[Suburb] Market Insights"

**File:** `src/app/components/AISummaryCard.tsx`

**Current:** Heading reads `"AI Property Insights"` (lines 82, 93, 109)

**Change:**
- Accept a `suburb` prop (derived from address — extract suburb from address string)
- Replace all 3 occurrences of `"AI Property Insights"` with `"{suburb} Market Insights"` 
- E.g. for "34 Orlando Avenue, Mosman" → "Mosman Market Insights"
- Loading/error states also update heading

**Suburb extraction logic:**  
Parse suburb from address string (typically the second-to-last comma-separated part before state/postcode). If not parseable, fallback to "Market Insights".

---

## 2. Add Average Assessment Period to DA/CDC Stats

**File:** `src/app/components/NearbyActivityCard.tsx`

**Current:** Stats badges show: Total, Assessing, Determined, Value, Approval Rate (lines 173-195)

**Change:**
- Calculate average days from `lodgementDate` to `determinationDate` for all determined DAs/CDCs
- Add a new stat badge: "Avg Assessment: X days" (or "~X months")
- Only show when at least 3 determined items have both dates
- Formula: `avg(determinationDate - lodgementDate)` in calendar days
- Display in a badge matching existing style

**Example output:** `Avg Assessment: 87 days`

---

## 3. Make Constraints/Overlay Tabs More Prominent

**File:** `src/app/globals.css` (`.tab-btn` styles, line 276)  
**File:** `src/app/components/NearbyActivityCard.tsx` (tab rendering, line 142)

**Current:** Tabs are small 14px text with subtle background. Easy to miss.

**Changes:**
- Increase font-size from `0.875rem` to `0.9375rem` (15px)
- Add a bottom-border indicator for the active tab (2px solid accent) instead of/in addition to background
- Make inactive tabs slightly more visible (use `--text-secondary` instead of `--text-muted`)
- Add a subtle pill/badge count next to each tab label (already partially done)
- Consider adding a thin horizontal rule or separator above the tab row

**CSS updates to `.tab-btn`:**
```css
.tab-btn {
  font-size: 0.9375rem;
  font-weight: 600;
  color: var(--text-secondary);
  padding: 0.5rem 1rem;
  border-bottom: 2px solid transparent;
  border-radius: 0.5rem 0.5rem 0 0;
}
.tab-btn[data-active="true"] {
  background: var(--accent-subtle);
  color: var(--accent);
  border-bottom-color: var(--accent);
}
```

---

## 4. Rename Browser Tab / Brand to "Landlytic"

**Files:**
- `src/app/layout.tsx` (line 10) — metadata title
- `src/app/address/page.tsx` (line 455) — nav brand text "PlanView"

**Changes:**
- `layout.tsx`: Change `title: "PlanView"` → `title: "Landlytic"`
- `address/page.tsx`: Change the brand `<Link>` text from `"PlanView"` to `"Landlytic"`
- Check all other pages for "PlanView" references and update:
  - Homepage (`src/app/page.tsx`)
  - Compare page (`src/app/compare/page.tsx`)
  - Search page (`src/app/search/page.tsx`)
  - SSDA page (`src/app/ssda/page.tsx`)

---

## 5. Seniors Housing SEPP Recommendation

**File:** `src/app/components/LandInfoCard.tsx`

**Current:** Shows zone code and description (e.g. "R3: Medium density: townhouses, villas, manor houses") but no SEPP Housing for Seniors mention.

**Change:**  
Add a conditional recommendation banner when the zone is one of these Seniors Housing SEPP-eligible zones:

**Eligible zones:** `R1, R2, R3, R4, RU5, B1, B2, B3, B4, B5, B6, B7, B8, RE2, SP1, SP2`

**UI:** Below the metrics/overlays strip, show a highlighted info box:

```
🏠 Seniors Housing SEPP
This site's zoning (R3) may permit development under the State Environmental 
Planning Policy (Housing for Seniors and People with a Disability) 2004, subject 
to further requirements being met. Seek advice from a professional town planner.
```

**Styling:** Use info-style card (`--info-bg`, `--info-border`, `--info` text color)

**Logic:**
```typescript
const SENIORS_HOUSING_ZONES = ["R1","R2","R3","R4","RU5","B1","B2","B3","B4","B5","B6","B7","B8","RE2","SP1","SP2"];
const zoneBase = zoneCode?.replace(/\d*$/, "").replace(/\s.*/, "") + zoneCode?.match(/\d+/)?.[0];
// Normalize to check: e.g. "R3" from "R3 Medium Density Residential"
const showSeniorsHousing = SENIORS_HOUSING_ZONES.includes(zoneBase);
```

---

## 6. Investigate Address Search Bugs

**Files:** `src/app/api/geocode/route.ts`

**Problem:** "21 Ferndell Street South Granville" and "120 Beamish Street Campsie" — the app finds neighbouring addresses but won't locate these exact ones.

**Root Cause Investigation:**
- The NSW Planning API (`api.apps1.nsw.gov.au`) may not have these addresses indexed, or the lot lookup fails for their `propId`
- When lot geometry lookup fails (`lotRes` returns no lots or no geometry rings), the address is skipped
- The code skips addresses where `!lots.length || !lots[0].geometry?.rings?.[0]`

**Fix approach:**
1. When a lot geometry lookup fails, still return the address with coordinates from Nominatim fallback
2. Add a secondary attempt: if the NSW API finds the address but lot lookup fails, try to get coordinates from the address text via Nominatim
3. Don't silently skip — include results even without lot polygon (just won't have lot boundary on map)

**Specific code change:**
In the `for (const addr of addresses)` loop, when `lotRes` fails or returns no rings:
- Instead of `continue`, fall back to geocoding the address text
- Return the result with `lat/lon` from Nominatim but still include `propId` for other data lookups

---

## 7. Investigate DA Regression (34 Orlando Ave Mosman)

**Files:** `src/app/api/da/route.ts`

**Problem:** DA data that previously displayed for 34 Orlando Avenue Mosman no longer shows.

**Investigation needed:**
- Check if the NSW Planning Portal API endpoint has changed or now requires different parameters
- Test the DA API directly with Mosman coordinates
- Check if there's a radius/distance filter that's too restrictive
- Verify the property's coordinates resolve correctly (related to issue #6)

**Action:** Run manual test of DA API with Mosman coordinates to diagnose. If the external API changed, update the query parameters.

---

## 8. Constrain AI — No Unverified Claims (e.g. "has views")

**File:** `src/app/api/insights/route.ts` (SYSTEM_PROMPT, lines 16-105)

**Problem:** AI generated "has views" for 34 Orlando Ave Mosman which is false. The AI is making claims not supported by the data provided.

**Change:** Add an explicit rule to the SYSTEM_PROMPT:

Add after the existing CRITICAL RULES section:
```
5. NEVER claim physical attributes you cannot verify from data (views, aspect, elevation, 
   noise levels, natural light, proximity to parks etc.) unless this information is 
   explicitly present in the provided data. If data doesn't confirm it, don't state it.
6. Only reference data points that are explicitly provided. Do not infer physical 
   characteristics of the property or its surroundings that are not in the dataset.
```

This constrains the model to only make claims backed by the input data.

---

## 9. Show SSDA Major Projects on Address Page

**Files:**
- `src/app/address/page.tsx` — add SSDACard import and render
- `src/app/components/SSDACard.tsx` — already exists, takes `lga` prop

**Current:** SSDA is only accessible via the top nav "Major Projects" link which goes to `/ssda` (a separate page). Not shown on the address page itself.

**Change:**
- Import `SSDACard` on the address page
- Render it below the NearbyActivityCard section (in the left column)
- Pass `lga={data.councilName}` prop
- Wire up `onProjects` callback to add markers to the map (SSDA markers already supported in PlanningMapInner)

**Placement in address/page.tsx:**
```tsx
{/* After NearbyActivityCard section */}
<SSDACard lga={data.councilName} onProjects={handleSSDAProjects} />
```

---

## Implementation Order

1. **#4** — Rename to "Landlytic" (quick, low risk)
2. **#1** — Rename AI Insights heading (quick, low risk)
3. **#3** — Make tabs more prominent (CSS only)
4. **#8** — Constrain AI prompt (quick, prompt-only change)
5. **#5** — Seniors Housing SEPP recommendation (new logic + UI)
6. **#2** — Average assessment period calculation (new computation)
7. **#9** — SSDA on address page (integration of existing component)
8. **#6** — Address search fix (API logic change, needs testing)
9. **#7** — DA regression (investigation + potential API fix)

---

## Items NOT in Scope (per discussion)

- ~~Remove financial upside advice~~ — Owner disagrees, keeping as-is
- Domain API integration — Owner investigating separately
