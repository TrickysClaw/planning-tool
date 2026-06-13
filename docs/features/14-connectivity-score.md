# 14 - Connectivity Score

## Summary

Replace the placeholder "Connectivity Score" card with a real weighted score (0-10) plus per-category breakdown showing the nearest relevant amenity and its distance. Uses only free, official Australian government data sources.

## Data Sources

| Category | Source | API / Format | Cost |
|----------|--------|-------------|------|
| Train / Metro / Light Rail | Existing `stations.ts` + TfNSW GTFS static | Local data + `https://opendata.transport.nsw.gov.au/dataset/timetables-complete-gtfs` | Free (API key required, no charge) |
| Bus stops & frequency | TfNSW GTFS static (stops.txt + stop_times.txt) | Same GTFS bundle | Free |
| Schools (primary/secondary) | ACARA "My School" dataset | `https://www.myschool.edu.au/` bulk CSV or `https://data.gov.au` ACARA extract | Free |
| Hospitals | NSW Health facility list | `https://data.nsw.gov.au` health facilities dataset | Free |
| GPs / Medical | Healthdirect National Health Services Directory | `https://api.nhsd.healthdirect.org.au/` | Free (register for key) |
| Parks / Open Space | NSW Crown Lands / council open space layers | ArcGIS MapServer queries (same pattern as existing hazard layers) | Free |

## Scoring Model

Overall score = weighted average of category sub-scores (0-10 each).

| Category | Weight | 10/10 threshold | 0/10 threshold |
|----------|--------|-----------------|----------------|
| Train/Metro | 30% | < 400m | > 2.5km |
| Bus (high freq) | 15% | < 200m, 10+ services/hr peak | > 800m or < 3/hr |
| Primary school | 20% | < 500m | > 2km |
| Secondary school | 10% | < 1km | > 4km |
| Medical (GP) | 15% | < 500m | > 2km |
| Parks | 10% | < 300m | > 1.5km |

Linear interpolation between thresholds. Bonus +0.5 if multiple options exist within threshold (e.g. 2+ train stations < 1km).

## UI Design

Compact card matching existing style:

```
[Icon] Connectivity Score          [8.2 / 10]

  Train    Bella Vista Metro         650m   ████████░░
  Bus      3 routes within 400m      400m   ████████░░
  School   Bella Vista Public        800m   ███████░░░
  Medical  Norwest Medical Centre    350m   █████████░
  Parks    Bella Vista Farm          200m   ██████████
```

- Overall score displayed prominently top-right
- Each row: icon + nearest name + distance + mini bar
- Colour: green (8+), amber (5-7), red (<5)
- No listing of individual restaurants/cafes/shops (unreliable data, low relevance to property decisions)

## Implementation Notes

- TfNSW GTFS is ~50MB. Options:
  - Pre-process stops.txt into a static JSON of NSW stops with lat/lng/route count (like stations.ts)
  - Or query TfNSW Trip Planner API per-request (slower but always current)
- ACARA data: download once, extract NSW schools with lat/lng/type into static JSON
- Medical: Healthdirect API supports lat/lng radius search, can call per-request
- Parks: use existing NSW MapServer pattern, query recreation/open space layer
- Cache all results by SA2 or suburb (most don't change often)

## Scope

- **In scope:** Train, bus, schools, medical, parks. Score + card UI.
- **Out of scope:** Shopping/dining (no reliable free source), walking directions (would need Google/Mapbox), real-time timetables.

## Priority

Backlog. Depends on getting TfNSW API key and downloading/processing GTFS + ACARA datasets.
