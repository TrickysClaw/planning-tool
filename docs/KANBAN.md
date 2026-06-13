# PlanView — Kanban Board

> Last updated: 2026-05-30

## Legend

| Points | Effort |
|--------|--------|
| 1 | Trivial — a few hours |
| 2 | Small — half a day |
| 3 | Medium — 1 day |
| 5 | Large — 2-3 days |
| 8 | XL — 1 week |
| 13 | Epic — 2+ weeks, needs breakdown |

---

## 🔴 To Do (Prioritised)

| # | Feature | Points | Category | Notes |
|---|---------|--------|----------|-------|
| 1 | Fix DA data freshness / update pipeline | 5 | Data Quality | DA data stale — investigate API source |
| 2 | Fix Heritage data inconsistencies | 3 | Data Quality | Sometimes incorrect layer results |
| 3 | Fix Flooding data inconsistencies | 3 | Data Quality | Inconsistent with council flood maps |
| 4 | Add LMR (Low-Mid Rise) overlay layer | 5 | Feature | Reference NSW LMR Viewer for data |
| 5 | Minimum width / frontage of land | 3 | Feature | Add to BuildSummaryCard + cadastre API |
| 6 | EP&A Act references per zone | 3 | Feature | Link relevant sections per zoning |
| 7 | Generate PDF report for address | 5 | Feature | Export current analysis as downloadable |
| 8 | LGA approval difficulty rating | 3 | Feature | Historical approval % from DA data |
| 9 | Side-by-side site comparison | 8 | Feature | Compare 2-3 addresses in columns |
| 10 | Similar sites finder | 5 | Feature | Find lots with matching zone/size/FSR |
| 13 | Planning Proposals (Rezonings) nearby | 5 | Feature | Active LEP amendments within 2km — huge for investors |

---

## 🟡 Backlog (Future)

| # | Feature | Points | Category | Notes |
|---|---------|--------|----------|-------|
| 11 | AI Chatbot for planning questions | 13 | Feature | LLM integration, context-aware |
| 12 | Domain/REA market data integration | 13 | Integration | Comparable sales, rental yields |

---

## 🟢 In Progress

| # | Feature | Points | Assigned | Started |
|---|---------|--------|----------|---------|
| — | — | — | — | — |

---

## ✅ Done

| # | Feature | Points | Completed |
|---|---------|--------|-----------|
| — | — | — | — |

---

## Sprint Planning Notes

**Total backlog points:** ~72  
**Recommended sprint size:** 8-13 points per week

### Suggested first sprint (highest impact, lowest risk):
1. **Fix DA data freshness** (5 pts) — users notice stale data immediately
2. **Minimum width / frontage** (3 pts) — quick win, high value for feasibility
3. **Fix Heritage data** (3 pts) — correctness matters for trust

**Sprint total: 11 points**

### Why this order?
- Data quality fixes build trust before adding new features
- Frontage/width is a small addition that developers ask about constantly
- LMR overlay and report generation are high-value but need more research first
