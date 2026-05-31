# Minimum Width & Frontage Display

**Points:** 3  
**Category:** Feature  
**Priority:** Medium-High  

## Problem

Developers and investors need to know the **minimum width** of a lot (not just area) because many DCP controls require minimum frontage for duplexes, townhouses, and multi-dwelling housing.

Currently we show lot area and estimated frontage from the cadastre API, but:
- The frontage estimate may not be the actual street frontage
- Minimum width (narrowest point) is not shown
- DCP minimum frontage requirements are not compared against

## Implementation

### Data
- We already get lot polygon rings from `/api/cadastre`
- Calculate minimum bounding rectangle to derive width vs depth
- Identify the street-facing edge (shortest edge touching a road, or use bearing)

### Algorithm
1. Get lot polygon coordinates
2. Compute the minimum-width rotated bounding box (rotating calipers or simplified)
3. The shorter dimension = approximate minimum width
4. Street frontage = edge closest to road centreline (or just the shortest edge facing the address point)

### UI Changes
- Add "Min Width" to BuildSummaryCard alongside current lot area
- Add "Street Frontage" as a separate metric
- Optionally flag: "Meets minimum frontage for [duplex/townhouse/RFB]" based on DCP

## Acceptance Criteria

- [ ] Minimum width calculated from lot polygon
- [ ] Street frontage shown in BuildSummaryCard
- [ ] Values are reasonable (manual check against 5 known lots)
- [ ] Comparison against DCP frontage requirements where data available
