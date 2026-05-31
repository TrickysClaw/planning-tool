# AI Planning Chatbot

**Points:** 13 (Epic)  
**Category:** Feature  
**Priority:** Backlog  

## What

An AI-powered chatbot that can answer planning questions in context of the currently viewed property.

## Example Queries

- "Can I build a duplex here?"
- "What's the maximum number of storeys?"
- "Is this property affected by the LMR policy?"
- "What's the process to get DA approval in this council?"
- "Compare R3 vs R4 zoning — what's the difference?"

## Implementation (High Level)

### Architecture
1. **LLM Backend** — OpenAI GPT-4 / Claude API
2. **Context injection** — Feed current property data (zone, controls, hazards) as system context
3. **Knowledge base** — RAG over EP&A Act, common LEP provisions, DCP guidelines
4. **UI** — Slide-out chat panel on address page

### Considerations
- **Cost** — LLM API calls cost money per query; need rate limiting or usage tiers
- **Accuracy** — Must caveat that responses are informational, not legal advice
- **Latency** — Streaming responses for UX
- **Data freshness** — Planning rules change; knowledge base needs updating

### MVP Scope
- Simple chat interface
- Context: current property's planning data
- No RAG initially — just the LLM's training knowledge + property context
- Disclaimer on every response

### Future
- RAG over council DCPs
- Multi-turn conversation with memory
- "Ask about this DA" for nearby applications

## Acceptance Criteria (MVP)

- [ ] Chat panel accessible from address page
- [ ] Property context automatically included
- [ ] Streaming responses
- [ ] Disclaimer shown
- [ ] Rate limited (e.g., 10 queries per session)
- [ ] Graceful error handling if API is down

## Why Backlog?

- Requires LLM API integration (cost, key management)
- Accuracy concerns need careful prompt engineering
- Better to nail core data quality first
- Can be a paid/premium feature later
