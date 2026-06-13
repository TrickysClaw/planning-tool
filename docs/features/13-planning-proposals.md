# Planning Proposals (Rezonings) Nearby

**Points:** 5  
**Category:** Feature  
**Priority:** High  

## What are Planning Proposals?

A Planning Proposal (PP) is a request to amend an LEP — typically to rezone land, increase height/FSR limits, or enable new land uses. They go through the NSW Gateway process and can take 1-3 years to finalise.

For property investors, an active planning proposal nearby is one of the strongest leading indicators of value change — land can appreciate 2-5x if a rezoning is approved.

## What to Show

- Active planning proposals within ~2km of the searched property
- For each proposal:
  - **Address/area** affected
  - **Current zoning → Proposed zoning** (e.g. R2 → R4)
  - **Proposed changes** — new height, FSR, permitted uses
  - **Status** — Gateway determination, public exhibition, finalisation
  - **Proponent** — council-led vs private (developer-initiated)
  - **PP number** and link to NSW Planning Portal
  - **Timeline** — lodgement date, estimated completion

## Data Source

**NSW Planning Portal — Planning Proposals Register**

Primary endpoint (public ArcGIS MapServer):
```
https://mapprod3.environment.nsw.gov.au/arcgis/rest/services/Planning/Planning_Proposals/MapServer
```

Layers:
- Layer 0: Planning Proposal boundaries (polygons)
- Layer 1: Planning Proposal points (centroid markers)

Query approach: Spatial query (buffer around searched lat/lng) to find proposals within radius.

Attributes available:
- `PP_NUMBER` — Planning Proposal reference
- `PP_NAME` — Name/title
- `LGA` — Local Government Area
- `STATUS` — Current status in the Gateway process
- `ZONE_PROPOSED` — Proposed zoning (if applicable)
- `HEIGHT_PROPOSED` — Proposed height
- `FSR_PROPOSED` — Proposed FSR
- `LODGEMENT_DATE` — When lodged
- `GATEWAY_DATE` — Gateway determination date
- `EXHIBITION_START` / `EXHIBITION_END`
- `PROPONENT` — Who initiated it

Alternative/supplementary: NSW Planning Portal PP Tracker
```
https://www.planningportal.nsw.gov.au/proposaltracker
```

## Implementation Approach

### 1. API Route: `/api/proposals`

```
GET /api/proposals?lat=-33.79&lng=151.13&radius=2000
```

Steps:
1. Buffer query against Planning Proposals MapServer (Layer 0)
2. Use `esriGeometryPoint` with `distance` and `units=esriSRUnit_Meter`
3. Return proposals sorted by distance
4. Filter to active proposals only (exclude finalised/withdrawn)

Response shape:
```json
{
  "proposals": [
    {
      "ppNumber": "PP-2024-1234",
      "name": "123 Main St Rezoning",
      "lga": "Ryde",
      "status": "Gateway Determination",
      "currentZoning": "R2",
      "proposedZoning": "R4",
      "proposedHeight": "21m",
      "proposedFSR": "1.5:1",
      "proponent": "Private",
      "lodgementDate": "2024-03-15",
      "exhibitionStart": "2024-08-01",
      "exhibitionEnd": "2024-09-15",
      "distance": 450,
      "lat": -33.791,
      "lng": 151.132,
      "link": "https://www.planningportal.nsw.gov.au/proposaltracker/PP-2024-1234"
    }
  ],
  "count": 3
}
```

### 2. Component: `PlanningProposalsCard`

Location: Below HDA card, above NearbyActivityCard (or as a tab within activity)

UI structure:
- Header with count badge: "Planning Proposals (3)"
- Each proposal as an expandable card showing:
  - PP name + number
  - Status badge (colour-coded by stage)
  - Zoning change arrow: `R2 → R4`
  - Height/FSR changes if applicable
  - Distance from searched property
  - "View on Portal" link
- Map integration: Add markers for proposals (distinct colour — purple?)

Status stages (colour coding):
- 🔵 Pre-Gateway — early stage
- 🟡 Gateway Determined — approved to proceed
- 🟠 Public Exhibition — community consultation
- 🟢 Finalised — approved and gazetted
- 🔴 Withdrawn / Refused

### 3. Map Markers

- Colour: `proposal-active` (purple/violet) for in-progress
- Colour: `proposal-finalised` (green) for recently completed
- Show proposal boundary polygon if available (semi-transparent overlay)

### 4. Address Page Integration

- Add to parallel fetch in `fetchData()`
- Pass results to map as `proposalMarkers`
- Display card in left column between HDA and NearbyActivityCard

## Acceptance Criteria

- [ ] Properties near active rezonings show the proposals with correct data
- [ ] Status is accurately mapped from the ArcGIS layer attributes
- [ ] Distance is calculated and displayed
- [ ] Clicking a proposal opens the NSW Planning Portal tracker
- [ ] Map shows proposal locations with distinct marker colour
- [ ] Empty state: "No active planning proposals within 2km" message
- [ ] Performance: Spatial query completes within 3s

## Edge Cases

- Some proposals cover large areas (whole precincts) — may need to clip/summarise
- Proposals can be superseded or merged — use latest status only
- Rural areas may have no proposals — graceful empty state
- Some proposals are council-wide (e.g. housekeeping amendments) — may want to filter these out as low-relevance

## Future Enhancements

- Alert/notification when a new PP is lodged near a saved property
- Historical proposals (completed rezonings) to show value uplift trajectory
- Integration with Build Summary: "If PP-2024-1234 is approved, this lot could support X storeys"
