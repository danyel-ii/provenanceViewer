# Alchemy integration

This app uses the Alchemy NFT REST API for collection and metadata lookups, and the Alchemy RPC endpoint (via ethers.js) for read-only transaction and contract calls.

## Base URLs
- NFT API: `https://{NETWORK}.g.alchemy.com/nft/v3/{ALCHEMY_KEY}`
- NFT API (mint audit lookups): `https://{NETWORK}.g.alchemy.com/nft/v2/{ALCHEMY_API_KEY}`
- RPC: `https://{NETWORK}.g.alchemy.com/v2/{ALCHEMY_KEY}`

## NFT REST endpoints used
- `GET /getNFTsForCollection?contractAddress=...&withMetadata=true&limit=...`
  - Accepts `pageKey` for pagination; responses include `pageKey` when more results remain.
  - Fetches collection tokens for `/api/poc/tokens`.
- `GET /getNFTMetadata?contractAddress=...&tokenId=...`
  - Fetches token metadata and mint details for `/api/token/:id`.
- `GET /getOwnersForNFT?contractAddress=...&tokenId=...`
  - Fetches current owners for provenance owner overlap checks.
- Mint audit enrichment uses `getNFTMetadata` via the v2 endpoint (uses `ALCHEMY_API_KEY`).

## RPC methods used (read-only)
- `eth_getTransactionReceipt`
  - Reads mint transaction logs to infer tokens minted in the same transaction.
- `eth_call`
  - Reads `ownerOf` and `tokenURI` in `/api/token/:id/verify`.
- `alchemy_getAssetTransfers`
  - Optional mint audit enrichment (requires `MAINNET_RPC_URL`).
