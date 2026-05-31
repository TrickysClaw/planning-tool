# Fix DA Data Freshness

**Points:** 5  
**Category:** Data Quality  
**Priority:** High  

## Problem

DA (Development Application) data shown on the address page appears stale or outdated. Users are seeing old applications that may have already been determined, and recent lodgements are missing.

## Investigation Needed

- [ ] Check the `/api/da` endpoint — what data source is it hitting?
- [ ] Determine if we're caching responses and for how long
- [ ] Check if the NSW Planning Portal API has rate limits or pagination we're missing
- [ ] Compare our results against the [DA Tracker](https://www.planningportal.nsw.gov.au/datracker) for a known address
- [ ] Same investigation for `/api/cdc` (CDC data may have the same issue)

## Potential Fixes

1. **API pagination** — we may only be fetching the first page of results
2. **Date range filter** — ensure we're requesting recent data (last 12-24 months)
3. **Caching policy** — if caching, set reasonable TTL (e.g., 24 hours max)
4. **Fallback source** — some councils have their own DA feeds that may be more current

## Acceptance Criteria

- [ ] DA results for a test address match what's shown on the Planning Portal
- [ ] Results include applications lodged within the last 30 days
- [ ] Results include determined applications from the last 12 months
- [ ] Same fix applied to CDC endpoint if applicable
