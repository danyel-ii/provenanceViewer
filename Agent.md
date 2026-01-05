# AGENTS.md
# Project: cubixles_ Provenance Viewer (Read-only, Off-chain)

You are Codex operating autonomously in this repository.

Your task is to build a **read-only provenance viewer** for NFTs minted elsewhere.
This app MUST NOT mint, sign, or write to any blockchain.

The app is a Next.js application deployed to an existing Vercel project:
- Project name: "provenance-viewer"
- Purpose: offchain inspection, provenance inference, and verification

---

## 1. Absolute constraints (non-negotiable)

### 1.1 Read-only enforcement
- ❌ No on-chain writes
- ❌ No wallet connections for signing
- ❌ No contract deployment
- ❌ No `eth_sendTransaction`, `eth_sendRawTransaction`, etc.
- ✅ Reads only (Alchemy REST + ethers.js provider reads)

### 1.2 Scope restriction
- Only NFTs from **CUBIXLES_CONTRACT** are considered valid inputs.
- Any token not belonging to that contract must be rejected early.
- This app is a **viewer**, not a marketplace, minting tool, or indexer.

### 1.3 Data sources
- Primary source: **Alchemy**
- Secondary source: **ethers.js read-only provider (Alchemy RPC)**
- Metadata resolution: IPFS / Arweave via gateways
- No subgraphs, no The Graph, no custom indexers.

---

## 2. Architecture rules

### 2.1 App structure
- Next.js app (App Router or Pages Router acceptable)
- API routes handle all Alchemy + RPC calls
- Frontend never calls Alchemy directly
- Frontend only consumes internal API routes

### 2.2 Caching
- Aggressive caching is REQUIRED
- Use Vercel KV or Redis if configured
- Never refetch metadata unnecessarily
- All cache TTLs must be configurable via env vars

### 2.3 Provenance logic
Provenance is **heuristic**, not absolute truth.

Every provenance result MUST:
- include a confidence level
- include a source label
- include raw evidence (tx hash, metadata field, owner overlap)

Never claim certainty.

---

## 3. Environment variables (required)

You must assume these are present in `.env` and Vercel:

- `ALCHEMY_KEY`
- `CUBIXLES_CONTRACT`
- `NETWORK` (e.g. `eth-mainnet`, `polygon-mainnet`)
- `CACHE_PROVIDER` (optional)
- `REDIS_URL` (optional)

You must create `.env.example` but NEVER commit secrets.

---

## 4. Execution rules for autonomy

- Work strictly in the order defined in `TODO.md`
- Implement the smallest vertical slice first
- After each milestone:
  1. verify local dev works
  2. update TODO.md checkboxes
- If a decision is ambiguous:
  - make a reasonable assumption
  - write it to `docs/decisions.md`
  - continue without asking questions

---

## 5. Definition of Done

You are finished only when:

- `/api/poc/tokens` returns tokens from CUBIXLES_CONTRACT
- `/api/token/:id` returns metadata + mint info
- `/api/token/:id/provenance` returns candidates with confidence
- `/api/token/:id/verify` performs read-only verification
- Frontend token page renders all of the above
- App runs locally and deploys cleanly to Vercel
- README explains usage, limits, and assumptions

---

## 6. Prohibited actions

- No speculative features
- No write paths hidden behind feature flags
- No wallet connect UI
- No database migrations without necessity
- No assumptions about future minting logic

End of instructions.