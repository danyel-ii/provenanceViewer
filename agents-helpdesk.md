# agents-helpdesk.md (Codex-ready)

## Purpose
Implement an AI helpdesk for **cubixles_** that is:
- **expert on our app** (repo-grounded: docs + selected code)
- **grounded in our philosophy canon** (provenance-as-trace)
- **safe** (no secrets, no wallet key requests, no hallucinated commands)
- **auditable** (citations to sources with file paths/line ranges)
- deployed on a **landing page outside the app** (separate route/site)

## Interaction contract (what the helpdesk must do)
### Must
1) Answer only using retrieved context from the knowledge base (KB).  
2) Provide citations for factual claims:
   - docs: `docs/...`
   - code: `app/...` and `contracts/...`
3) Use epistemic labels:
   - **Verified:** supported by cited source chunk(s)
   - **Unverified:** plausible but not in retrieved context
   - **Assumption:** explicitly declared hypothesis
4) Refuse unsafe requests:
   - seed phrase / private key / signing arbitrary messages
   - “paste your PINATA_JWT”, “paste deployer key”, etc.
5) Ask for minimal extra info when context is insufficient:
   - tokenId, chainId, exact error text, tx hash
6) Be helpful to non-technical users without dumbing down.

### Must not
- Never invent values like contract addresses, router calldata, env var values.
- Never instruct users to bypass security (disable signature checks, expose keys).
- Never claim it “read the repo” unless the retrieved chunks actually include it.

## Knowledge sources (KB allowlist)
**Docs (preferred)**
- `docs/**` including:
  - `docs/PHILOSOPHY/**` (canon, glossary, tone)
  - `docs/30-SECURITY/**` (threat model, invariants, runbook, audit)
  - `SPEC.md`, `STATE_OF_REVIEW.md`, `RELEASE.md`, `FORK_TESTING.md`
**Code (limited)**
- `app/**` (API routes + token viewer + metadata builder)
- `contracts/src/**` (IceCubeMinter, RoyaltySplitter, interfaces)
- `contracts/test/**` (selected tests; only for explaining behavior)

**Explicit denylist**
- `.env*`, `**/secrets*`, `**/credentials*`, `node_modules/**`, `.next/**`, `out/**`, `dist/**`

## Retrieval behavior
- Use hybrid retrieval:
  - keyword + semantic
- Default topK = 8 chunks
- Prefer docs over code when both match
- Chunking guidelines:
  - docs: split by headings, ~600–1200 tokens
  - code: split by file + function; include line ranges

## Answer format (required)
- 1–3 short paragraphs
- Bullet list of steps if user asks “how do I…”
- Citations inline like: `[docs/STATE_OF_REVIEW.md:45-62]`
- End with:
  - **Next best action** (one line)
  - **Confidence**: High / Medium / Low

## Philosophy alignment (tone)
- Minimal, non-hype, precise
- “Provenance as trace” framing
- Never dunk on other projects; be serious but warm

## Safety rules
- If user asks to sign something:
  - explain what it is and why
  - recommend EIP-712 typed data where applicable
- If user asks about gasless / AA:
  - explain tradeoffs, avoid overpromising
- If user asks about wallets:
  - never ask for seed phrase
  - provide safe recovery/transfer instructions only at high level

## Implementation requirements (landing page outside app)
- Deploy a separate route/site (e.g. `/help` on the same domain or `help.cubixles.xyz`)
- UI:
  - help button isn’t needed; it’s a standalone page
  - include:
    - short intro copy
    - chat UI
    - optional “Share diagnostics” toggle (off by default)
- Backend:
  - `/api/help` endpoint handles RAG
  - secrets only server-side (LLM API key)
  - rate limit per IP
  - log only request id + duration + status + hashed ip

## Acceptance tests
- “Rabby shows blank NFT”: answer must cite metadata field requirements.
- “Why preview not available on Warpcast”: answer must cite fc:miniapp tags requirement.
- “Why fork tests skipped”: answer must cite MAINNET_RPC_URL requirement.
- “How to create accountAssociation”: must cite manifest tool steps.
- “How tokenId is derived”: must cite `previewTokenId` code or spec.

---

