# EP&A Act References

**Points:** 3  
**Category:** Feature  
**Priority:** Medium  

## What

Link relevant sections of the Environmental Planning and Assessment Act 1979 (EP&A Act) based on the property's zoning and planning controls.

## Why

Sophisticated users (planners, developers, lawyers) want quick access to the legal basis for what's shown. Casual users benefit from understanding "why" a control exists.

## Implementation

### Mapping
Create a static mapping of:
- Zone code → relevant EP&A Act Part/Section
- Development type → relevant assessment pathway (Part 4 / Part 5)
- Key terms → Act section (e.g., "complying development" → s4.27)

### UI
- Add a small "Legal basis" or "EP&A Act" expandable section to BuildSummaryCard
- Show 2-3 most relevant sections with links to legislation.nsw.gov.au
- Example: "R3 Medium Density Residential — assessed under EP&A Act Part 4, Division 4.3"

### Links
- Base URL: `https://legislation.nsw.gov.au/view/html/inforce/current/act-1979-203`
- Sections can be linked via anchor: `#sec.4.15`

## Acceptance Criteria

- [ ] 2-3 relevant Act sections shown per property
- [ ] Links open correct section on legislation.nsw.gov.au
- [ ] Covers the main zones (R2, R3, R4, MU1, B1, B2, IN1)
- [ ] Graceful fallback for unknown zones
