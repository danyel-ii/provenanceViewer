# to-do-helpdesk.md (Codex-ready)

## Milestone 1 — Canon + KB ingestion
- [x] Create `docs/PHILOSOPHY/00-canon.md` (already drafted)
- [x] Add `docs/PHILOSOPHY/01-glossary.md` (refsFaces, refsCanonical, animation_url, etc.)
- [x] Add `docs/PHILOSOPHY/02-tone.md` (short style constraints)
- [x] Create `scripts/kb_build.mjs`
  - reads allowlisted files
  - chunks them
  - outputs `kb/index.jsonl` with `{id,path,startLine,endLine,text}`

## Milestone 2 — Retrieval + API
- [x] Add vector index (choose one):
  - Simple local: `@xenova/transformers` embeddings + sqlite/JSON (ok for small KB)
  - Postgres+pgvector (durable)
  - Implemented with `@xenova/transformers` + `kb/vectors.json` via `scripts/kb_embed.mjs`
- [x] Implement `/api/help`:
  - input: `{ message, diagnostics? }`
  - retrieve topK
  - call LLM with system prompt = `agents-helpdesk.md` rules + retrieved context
  - output: `{ answer, citations, confidence }`
- [x] Add rate limiting:
  - per IP token bucket
- [x] Add safe logging:
  - request id, duration, status
  - no payload logging by default

## Milestone 3 — Landing page UI
- [x] Create route `/help` (outside app UX)
  - Header: “cubixles_ helpdesk”
  - Short intro line: “Provenance as trace. Ask anything.”
  - Chat UI + citations display
- [x] Add “Share diagnostics” toggle (default off)
  - if on, include chainId, tokenId, last error string (no wallet addr unless user explicitly pastes)

## Milestone 4 — Evaluation harness
- [x] Create `tests/helpdesk_eval.json`
  - 30 questions + expected citations files
- [x] Add CI job `npm run test:helpdesk`
  - runs a dry retrieval test (no LLM call) to ensure citations exist
  - optional: run LLM in “mock” mode unless API key present

## Definition of Done
- /help page works in production
- Answers cite sources
- No secrets in client
- Rate limit works
- “Unverified” used when KB lacks info

---
