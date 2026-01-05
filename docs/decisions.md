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
