# Domain / REA Market Data Integration

**Points:** 13 (Epic)  
**Category:** Integration  
**Priority:** Backlog  

## What

Integrate real estate listing data from realestate.com.au and/or Domain.com.au to provide comparable market analysis alongside planning data.

## Data Wanted

- Recent sales in the area (last 6-12 months)
- Current listings (for sale / for rent)
- Median price for the suburb/zone
- Price per m² for comparable lots
- Rental yield estimates
- Days on market

## Challenges

### API Access
- **Domain API** — Has a public API (developer.domain.com.au), requires registration, free tier available with limits
- **REA API** — No public API; would need scraping (legally questionable) or partnership
- **Alternative** — Use published suburb statistics (public data) rather than individual listings

### Legal
- Scraping listing sites violates their ToS
- API terms may restrict how data is displayed
- Need to attribute source properly

## Implementation Options

### Option A: Domain API (Most Viable)
- Register for Domain API key
- Query suburb statistics and recent sales
- Display aggregate data (medians, trends) not individual listings
- Respect rate limits and attribution requirements

### Option B: Public Suburb Stats
- Use publicly available median price data (e.g., from NSW Valuer General, CoreLogic public reports)
- Less granular but no API/legal issues
- Update quarterly from published reports

### Option C: Partnership
- Longer term — reach out to Domain/PropTrack for data partnership
- Would provide the richest data but requires business relationship

## MVP Approach

Start with **Option B** — static suburb-level stats (median house/unit price, growth %) stored in a data file. This gives users value immediately without API complexity.

## Acceptance Criteria (MVP)

- [ ] Suburb median price shown on address page
- [ ] 1-year and 5-year growth percentage
- [ ] Source and date attributed
- [ ] Data for at least top 50 Sydney suburbs

## Why Backlog?

- API access needs research and registration
- Legal review for data usage
- Core planning features should be solid first
- Could be a premium/paid feature
