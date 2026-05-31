# LGA Approval Difficulty Rating

**Points:** 3  
**Category:** Feature  
**Priority:** Medium  

## What

Show a rating/percentage indicating how easy or difficult it is to get DA approval in a given LGA, based on historical approval rates.

## Data Source

- Our existing DA data (if we can aggregate it across an LGA)
- NSW Planning Portal publishes annual statistics on DA processing times and approval rates
- Reference: [Local Development Performance Monitoring](https://www.planning.nsw.gov.au/research-and-demography/local-development-performance-monitoring)

## Metrics to Show

1. **Approval rate** — % of DAs approved vs refused (last 12 months)
2. **Average determination time** — median days from lodgement to determination
3. **Relative rating** — "Above average" / "Average" / "Below average" compared to metro/regional benchmarks

## UI

- Small card or badge in the BuildSummaryCard area
- Example: "Parramatta Council — 92% approval rate, median 48 days"
- Color-coded: green (>90%, <45 days), amber (80-90%, 45-90 days), red (<80%, >90 days)

## Implementation

### Option A: Static data (MVP)
- Manually compile approval stats for top 20-30 LGAs from published reports
- Store as a JSON lookup in `/src/data/lgaStats.ts`
- Update quarterly

### Option B: Dynamic aggregation (Future)
- Aggregate from our own DA query results
- Requires storing/caching historical data

## Acceptance Criteria

- [ ] Approval rate shown for at least 20 major LGAs
- [ ] Median determination time shown
- [ ] Color-coded rating (easy/moderate/difficult)
- [ ] Source attribution and date range noted
