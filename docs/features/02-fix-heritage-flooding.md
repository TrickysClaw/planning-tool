# Fix Heritage & Flooding Data Inconsistencies

**Points:** 3 each (6 total)  
**Category:** Data Quality  
**Priority:** High  

## Heritage Issues

### Problem
Heritage data is sometimes incorrect — properties show as heritage-listed when they aren't, or miss heritage items that exist.

### Investigation
- [ ] Check `/api/planning` response — which layer provides heritage data?
- [ ] Verify we're querying the correct LEP heritage layer (not just DCP)
- [ ] Check if Heritage Conservation Areas (HCAs) are conflated with individual items
- [ ] Cross-reference against [NSW Heritage Inventory](https://www.hms.heritage.nsw.gov.au/)

### Potential Fixes
- Distinguish between **heritage item** (individually listed) and **HCA** (area)
- Query both state and local heritage registers
- Show confidence level or source attribution

---

## Flooding Issues

### Problem
Flood data shown is inconsistent with what council flood maps show. Some properties in known flood zones show as clear, and vice versa.

### Investigation
- [ ] Check `/api/hazard` — what flood dataset are we querying?
- [ ] Is it the 1-in-100-year ARI or a different return period?
- [ ] Are we using the correct Flood Planning Level (FPL) layer?
- [ ] Compare against council flood studies for 2-3 known addresses
- [ ] Check spatial accuracy — are we querying at the lot centroid or boundary?

### Potential Fixes
- Use lot polygon for intersection rather than point query
- Query multiple flood layers (PMF, 1% AEP, 5% AEP)
- Add source attribution ("Based on [Council] Flood Study [Year]")
- Flag when flood data is unavailable for an area rather than showing "no flood risk"

## Acceptance Criteria

- [ ] Heritage status matches NSW Heritage Inventory for 5 test addresses
- [ ] Clearly distinguish Heritage Item vs HCA vs no heritage
- [ ] Flood results consistent with council flood maps for 5 test addresses
- [ ] Source/confidence indicator shown to user
