# Similar Sites Finder

**Points:** 5  
**Category:** Feature  
**Priority:** Medium  

## What

After viewing a property, show "Similar Sites" — other lots in the area with matching characteristics (zone, lot size range, FSR, no heritage).

## Why

- Investors want alternatives: "Show me other R3 lots around 700m² near Parramatta"
- Feeds into the Site Search page — essentially a smart pre-filled search

## Implementation

1. Take current property's attributes: zone, lot size ±20%, same LGA or nearby
2. Query `/api/search` with those parameters
3. Show top 5-10 results in a compact list on the address page
4. Link each to full address view

## UI

- New section below the main cards: "Similar Development Sites"
- Compact cards showing: zone, area, frontage, distance from current site
- "View all →" links to Site Search with pre-filled filters

## Data Requirements

- Already have the Site Search API (`/api/search`)
- Just need to auto-fill parameters from current property's attributes

## Acceptance Criteria

- [ ] Shows 5-10 similar sites based on zone + lot size
- [ ] Sorted by proximity to the viewed property
- [ ] Each result links to its full address page
- [ ] "View all" opens Site Search with matching filters pre-filled
- [ ] Doesn't show if no similar sites found
