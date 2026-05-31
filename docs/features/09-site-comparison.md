# Side-by-Side Site Comparison

**Points:** 8  
**Category:** Feature  
**Priority:** Medium (under Site Analysis)  

## What

Allow users to compare 2-3 properties side by side, showing their planning controls, hazards, connectivity, and development potential in parallel columns.

## Why

Investors often shortlist 3-5 sites and need to quickly compare feasibility. Currently they'd need to open multiple tabs and manually compare.

## UX Flow

1. User searches an address → sees the normal report
2. Clicks "Compare" button → address is added to comparison tray
3. Searches another address → clicks "Compare" again
4. Opens comparison view → side-by-side columns

### Comparison Tray
- Floating bar at bottom: "2 sites selected — [View Comparison]"
- Max 3 sites (more gets visually cluttered)
- Persisted in localStorage so survives page navigation

## Comparison View Layout

| Metric | Site A | Site B | Site C |
|--------|--------|--------|--------|
| Zone | R3 | R4 | MU1 |
| FSR | 0.75:1 | 2.5:1 | 3.0:1 |
| Height | 11m | 25m | 45m |
| Lot Area | 680m² | 450m² | 1200m² |
| Max GFA | 510m² | 1125m² | 3600m² |
| Heritage | No | No | Yes |
| Flood | No | Yes | No |
| Connectivity | 7/10 | 9/10 | 8/10 |
| Potential | 🟡 | 🟢 | 🔴 |

## Implementation

1. Store comparison list in state/localStorage
2. New route: `/compare`
3. Fetch planning data for all sites in parallel
4. Render in responsive grid (stack on mobile)
5. Highlight "winner" per row (optional)

## Acceptance Criteria

- [ ] Can add up to 3 sites to comparison
- [ ] Comparison view shows key metrics side by side
- [ ] Can remove sites from comparison
- [ ] Responsive — stacks vertically on mobile
- [ ] Data fetched fresh on comparison page load
