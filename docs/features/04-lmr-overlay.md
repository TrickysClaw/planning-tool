# LMR (Low-Mid Rise) Overlay Layer

**Points:** 5  
**Category:** Feature  
**Priority:** Medium-High  

## What is LMR?

The NSW Low and Mid-Rise Housing Policy (effective 2024) allows additional housing types in certain residential zones near transport and town centres, overriding some local council controls.

**Reference:** [NSW LMR Viewer](https://www.planning.nsw.gov.au/policy-and-legislation/housing/low-and-mid-rise-housing)

## What to Show

- Whether the property falls within an LMR-eligible area
- Which LMR tier applies (if any):
  - **Tier 1** — Dual occupancies, manor houses, multi-dwelling housing (within 800m of rail/metro)
  - **Tier 2** — Residential flat buildings up to 6 storeys (within 400m of stations in high-demand areas)
- What the LMR policy permits that the underlying LEP/zone might not
- Effective date (some provisions are staged)

## Implementation Approach

1. **Data source** — Check if NSW Planning Portal or SEED has a WFS/WMS layer for LMR boundaries
2. **Spatial query** — Point-in-polygon check against LMR boundaries
3. **UI** — Add to BuildSummaryCard as a prominent badge/callout ("LMR Eligible — Tier 1")
4. **Map** — Optional overlay on PlanningMap showing the LMR boundary

## Acceptance Criteria

- [ ] Properties within LMR zones correctly identified
- [ ] Tier level displayed (1 or 2)
- [ ] Brief explanation of what LMR allows
- [ ] Non-LMR properties show nothing (no false positives)
