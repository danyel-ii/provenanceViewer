# TODO.md — cubixles_ Provenance Viewer (Read-only)

Goal:
Build an offchain, read-only provenance viewer for NFTs minted in another app.
All NFTs originate from CUBIXLES_CONTRACT.

---

## Phase A — Configuration & discovery
- [x] Add `.env.example` with required variables
- [x] Validate ALCHEMY_KEY, NETWORK, CUBIXLES_CONTRACT usage
- [x] Document Alchemy endpoints in `docs/integration.md`

---

## Phase B — Data integration PoC (Alchemy)
- [x] Implement GET `/api/poc/tokens?limit=`
  - Uses `getNFTsForCollection`
  - Filters strictly by CUBIXLES_CONTRACT
  - Includes tokenId, metadata, media, mint tx (if available)
- [x] Add caching with TTL

Acceptance:
- Endpoint returns ≥20 tokens with metadata

---

## Phase C — Metadata resolver
- [x] Resolve `ipfs://`, `ar://`, `http(s)`
- [x] Implement gateway fallback logic
- [x] Cache resolved metadata + media URLs
- [x] Validate metadata shape (image/media present)

---

## Phase D — Provenance heuristics
- [x] Metadata reference scanning
- [x] Transfer / mint tx analysis
- [x] Owner overlap heuristic
- [x] Confidence scoring:
  - explicitMetadataReference
  - sameTransaction
  - ownerOverlap
- [x] Return evidence per candidate

---

## Phase E — Backend API
- [x] GET `/api/token/:id`
- [x] GET `/api/token/:id/provenance`
- [x] POST `/api/token/:id/verify`
  - read-only ethers.js call
  - rate limited
- [x] Centralize Alchemy client with retry + backoff

---

## Phase F — Frontend
- [x] Token page `/token/[id]`

---

## Phase G — Collection coverage & validation
- [x] Add pagination support for `/api/poc/tokens` (`pageKey`)
- [x] Add `all=true` aggregation with a max-page safety cap
- [x] Document pagination + BASE placeholder env vars
- [x] Validate `/api/token/:id`, `/api/token/:id/provenance`, `/api/token/:id/verify`
