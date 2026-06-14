# Feature: Property Comparison

## Overview

Compare two properties side-by-side using a slider overlay that layers the same address page components on top of each other. The user drags a slider left/right to reveal more of Property A or Property B. AI insights generate a single comparative analysis rather than two separate summaries.

---

## UX Flow

### Entry Points

1. **From History Sidebar** — A new "Compare" row at the top. Click it, then pick two properties from your history.
2. **From Address Page** — A "Compare" button appears in the top bar when viewing a property. Clicking it enters compare mode: the current property is locked as Property A, and the search bar prompts for Property B.
3. **Direct URL** — `/compare?latA=...&lngA=...&qA=...&latB=...&lngB=...&qB=...`

### Compare Mode Layout

```
┌─────────────────────────────────────────────────────────┐
│  Top Bar: [History] PlanView [SearchA | vs | SearchB]   │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  ┌─────────────────────┬──────────────────────────────┐ │
│  │                     │                              │ │
│  │   Property A        │ ← SLIDER →  Property B      │ │
│  │   (left side)       │             (right side)     │ │
│  │                     │                              │ │
│  │   Same components   │   Same components            │ │
│  │   color: Blue       │   color: Amber               │ │
│  │                     │                              │ │
│  └─────────────────────┴──────────────────────────────┘ │
│                                                         │
│  ┌─────────────────────────────────────────────────────┐ │
│  │  AI Comparative Insights (single card, full width)  │ │
│  └─────────────────────────────────────────────────────┘ │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

### Slider Behaviour

- **Implementation**: CSS `clip-path` on two absolutely positioned layers. The slider handle sits between them.
- **Default position**: 50/50 split.
- **Drag**: Moves the clip boundary left/right. Left layer clips with `inset(0 ${100-pos}% 0 0)`, right with `inset(0 0 0 ${pos}%)`.
- **Mobile**: Vertical swipe or toggle button to switch between A/B (slider is awkward on small screens).
- **Both layers scroll in sync** — they share the same scroll position so sections align.

### Color Coding

| Property | Accent Color | Badge | Border highlight |
|----------|-------------|-------|-----------------|
| A (left) | Blue `#3B82F6` | "A" pill | Left border blue |
| B (right) | Amber `#F59E0B` | "B" pill | Left border amber |

Each card/section gets a subtle colored left border and a small A/B pill badge in the top-right so users always know which property they're looking at, even when the slider is fully to one side.

---

## AI Comparative Insights

Instead of two separate AI insight cards, one unified card spans full width below the slider:

### Prompt Structure

```
You are comparing two NSW properties for a developer/investor.

PROPERTY A: {snapshotA}
PROPERTY B: {snapshotB}

Generate a comparative analysis with these categories:
1. Development Potential — which site offers better yield/feasibility
2. Risk Profile — compare hazards, approval complexity
3. Market Position — demographics, demand, pricing
4. Investment Outlook — which is the stronger play and why
5. Verdict — clear recommendation with reasoning
```

### Display

```
┌──────────────────────────────────────────────────────────┐
│ ✨ AI Comparative Insights                    GPT-4.1    │
├──────────────────────────────────────────────────────────┤
│                                                          │
│ "Property B offers 3x the GFA potential but Property A   │
│  has significantly lower risk and faster approval path"  │
│                                                          │
│ ┌─────────────────────┐  ┌─────────────────────────────┐│
│ │ 🏗 Dev Potential     │  │ 📊 Market Position          ││
│ │                     │  │                             ││
│ │ A: 300m² GFA, CDC   │  │ A: $154k income, low crime  ││
│ │ B: 1000m² GFA, DA   │  │ B: $98k income, med crime   ││
│ │                     │  │                             ││
│ │ Winner: B (scale)   │  │ Winner: A (demographics)    ││
│ └─────────────────────┘  └─────────────────────────────┘│
│                                                          │
│ ┌─────────────────────┐  ┌─────────────────────────────┐│
│ │ ⚠️ Risk Profile      │  │ 💰 Investment Outlook       ││
│ │                     │  │                             ││
│ │ A: No hazards ✓     │  │ A: Low risk, modest return  ││
│ │ B: Flood + heritage │  │ B: High risk, high return   ││
│ │                     │  │                             ││
│ │ Winner: A (clean)   │  │ Depends on risk appetite    ││
│ └─────────────────────┘  └─────────────────────────────┘│
│                                                          │
│ 🏆 Verdict: ...                                          │
└──────────────────────────────────────────────────────────┘
```

Each category card uses blue/amber text for the respective property values.

---

## History Sidebar Updates

```
┌────────────────────────────┐
│ 🕐 Search History          │
├────────────────────────────┤
│ ┌────────────────────────┐ │  ← NEW
│ │ ⚖️  Compare Properties  │ │
│ │ Pick two to compare    │ │
│ └────────────────────────┘ │
├────────────────────────────┤
│ 12 Smith St, Ryde      R2 │
│ 2h ago · 3x               │
│                            │
│ 8 Solent Cct, Norwest  R4 │
│ 5h ago · 1x               │
│ ...                        │
└────────────────────────────┘
```

### Compare Mode in Sidebar

When "Compare Properties" is clicked:
1. Sidebar enters selection mode — each entry gets a checkbox
2. User ticks exactly 2 entries
3. "Compare" button activates → navigates to `/compare?...`
4. Recent comparisons could be stored as a separate list (future enhancement)

---

## Technical Architecture

### New Files

| File | Purpose |
|------|---------|
| `src/app/compare/page.tsx` | Compare page (wrapper + dual fetch) |
| `src/app/components/CompareSlider.tsx` | The clip-path slider overlay |
| `src/app/components/CompareInsightsCard.tsx` | Comparative AI insights |
| `src/app/api/insights/compare/route.ts` | API endpoint for comparative AI |

### Data Flow

```
/compare?latA&lngA&qA&latB&lngB&qB
         │
         ├── fetchData(A) ──→ all 10 APIs ──→ dataA
         ├── fetchData(B) ──→ all 10 APIs ──→ dataB
         │
         ├── Both rendered in parallel layers
         │   └── CompareSlider wraps both
         │
         └── POST /api/insights/compare
             body: { snapshotA, snapshotB }
             └── Single LLM call → comparative analysis
```

### CompareSlider Component

```tsx
interface CompareSliderProps {
  leftContent: React.ReactNode;   // Property A rendered
  rightContent: React.ReactNode;  // Property B rendered
}

// Implementation:
// - Two absolute-positioned divs
// - clip-path controlled by slider position state
// - Draggable handle in the middle
// - Synchronized scroll via shared ref
```

### Shared Fetch Logic

Extract `fetchData` from the address page into a shared hook:

```tsx
// src/lib/usePropertyData.ts
export function usePropertyData() {
  // Returns { data, loading, coords, markers, fetchData }
  // Used by both /address and /compare pages
}
```

This avoids duplicating the 10-API parallel fetch + marker processing logic.

### URL Structure

```
/compare?latA=-33.8&lngA=151.1&qA=12+Smith+St&latB=-33.7&lngB=150.9&qB=8+Solent+Cct
```

### Compare Insights API

`POST /api/insights/compare`

```json
{
  "addressA": "12 Smith St, Ryde",
  "addressB": "8 Solent Cct, Norwest",
  "siteDataA": { /* full data object A */ },
  "siteDataB": { /* full data object B */ }
}
```

Response: same structure as current insights but with comparative framing.

---

## Edge Cases

| Scenario | Handling |
|----------|----------|
| Same property compared to itself | Block with "Pick a different property" |
| One property fails to load | Show error on that side, other side still renders |
| Mobile (<768px) | Replace slider with tab toggle (A / B / Compare) |
| Very different page heights | Shorter side pads to match taller side |
| User wants to swap A/B | Swap button in top bar |

---

## Implementation Order

1. **Extract `usePropertyData` hook** from address page (refactor, no new features)
2. **Build `CompareSlider` component** (clip-path + drag handle + sync scroll)
3. **Create `/compare` page** using the hook twice + slider
4. **Build comparative insights API** (`/api/insights/compare`)
5. **Build `CompareInsightsCard`** with color-coded categories
6. **Update History Sidebar** with compare mode (checkbox selection)
7. **Add "Compare" button** to address page top bar
8. **Mobile responsive** — tab toggle fallback

---

## Open Questions

1. **Should comparisons be saved to Supabase?** (e.g., `comparisons` table with `property_a_id`, `property_b_id`, comparative insights cached)
2. **Limit to 2 properties or allow 3+?** Slider works for 2. More than 2 would need a different UI.
3. **Should the map show both properties?** Could zoom out to show both pins with a connecting line.
4. **Cost**: Comparative insight = 1 LLM call with 2x the context tokens. Acceptable?
