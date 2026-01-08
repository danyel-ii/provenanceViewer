# Decisions

## Cache defaults
- TTL defaults are set in `app/_lib/env.ts` (tokens 10m, metadata 24h, provenance 10m, owners 10m, verify 60s) and can be overridden via env vars.
- Cache provider defaults to in-memory unless `CACHE_PROVIDER` is set to `redis` or `kv`.

## Gateway fallback
- IPFS gateways: `https://ipfs.io/ipfs/`, `https://cloudflare-ipfs.com/ipfs/`, `https://gateway.pinata.cloud/ipfs/`.
- Arweave gateways: `https://arweave.net/`, `https://ar-io.net/`.

## Provenance scoring
- Confidence weights: metadata reference (0.6), same-transaction mint (0.3), owner overlap (0.1 + overlap ratio up to 0.2).
- Confidence thresholds: high >= 0.75, medium >= 0.4, else low.

## Rate limiting
- Verification calls default to 5 requests per 60 seconds per client key (override with env).

## Provenance scope
- Owner overlap checks are computed only for candidates found via metadata or same-transaction minting to avoid indexer-like scans.

## Env fallbacks
- Support `ALCHEMY_API_KEY` and `CUBIXLES_CONTRACT_ADDRESS` as fallbacks for local `.env` files.
- If `NETWORK` is missing, map `CUBIXLES_CHAIN_ID`/`BASE_CHAIN_ID` to Alchemy network IDs; otherwise require `NETWORK`.

## Collection pagination
- Use Alchemy `pageKey` for `getNFTsForCollection`; expose `pageKey` to clients.
- `all=true` aggregates pages with a safety cap to avoid long-running requests.

## Base placeholder
- Include `CUBIXLES_BASE_CONTRACT_ADDRESS` in `.env.example` (Base: `0x428032392237cb3BA908a6743994380DCFE7Bb74`); not used in runtime yet.

## Base path enforcement
- Default the viewer to `/inspecta_deck` even if `NEXT_PUBLIC_BASE_PATH` is unset or `/`, to keep subpath hosting consistent.

## CSP middleware
- Viewer pages are forced dynamic so Next can attach per-request CSP nonces.
- `FRAME_ANCESTORS` can override the default `frame-ancestors` list.
- `/api/csp-report` accepts CSP telemetry, enforces size/type checks, rate limits per client, strips query/hash from URLs, and returns 204.
- `CSP_REPORT_MAX_BYTES`, `CSP_REPORT_RATE_LIMIT`, `CSP_REPORT_RATE_WINDOW_SECONDS` tune report limits.

## Base path
- App is configured with `NEXT_PUBLIC_BASE_PATH` (default `/inspecta_deck`) and `assetPrefix` to support subpath hosting.
- Use `withBasePath(...)` for internal links/assets; metadata uses `NEXT_PUBLIC_BASE_URL` when provided.
