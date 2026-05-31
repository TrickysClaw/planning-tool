# Generate Address Report (PDF)

**Points:** 5  
**Category:** Feature  
**Priority:** Medium  

## What

A "Download Report" button on the address page that generates a formatted PDF containing all the planning data currently shown on screen.

## Why

Users want to:
- Save reports for offline review
- Share with partners, architects, town planners
- Attach to feasibility studies or loan applications
- Have a dated snapshot of planning controls

## Implementation Options

### Option A: Client-side PDF (Recommended for MVP)
- Use `html2canvas` + `jsPDF` or `@react-pdf/renderer`
- Render a report-specific layout (not a screenshot of the page)
- Pros: No server load, instant generation
- Cons: Styling limitations, map rendering tricky

### Option B: Server-side PDF
- API route that accepts property data and renders via Puppeteer or `@react-pdf/renderer`
- Pros: Better control, can include aerial images
- Cons: Server resources, Puppeteer is heavy

### Report Contents
1. **Header** — Address, date generated, PlanView branding
2. **Summary** — Zone, FSR, height, lot size, development potential
3. **Hazards** — Bushfire, flood, heritage, landslide, acid sulfate
4. **Connectivity** — Score, nearest stations, amenities
5. **Nearby Activity** — Recent DAs/CDCs within radius
6. **Map** — Static map image with lot polygon
7. **Disclaimer** — "Indicative only, verify with council"

## Acceptance Criteria

- [ ] "Download Report" button visible on address page
- [ ] PDF generates with all key data sections
- [ ] Map/aerial image included
- [ ] Report is branded and professional-looking
- [ ] Disclaimer included
- [ ] Works in Chrome, Firefox, Safari
