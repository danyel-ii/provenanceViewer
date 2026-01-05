import { NextResponse } from "next/server";

import { getCachedJson } from "../../../../_lib/cache";
import { getEnvConfig } from "../../../../_lib/env";
import { getNftMetadata, getOwnersForToken } from "../../../../_lib/alchemy";
import { normalizeTokenId } from "../../../../_lib/normalize";
import {
  resolveMetadata,
  resolveMetadataFromObject,
} from "../../../../_lib/metadata";
import {
  buildOwnerOverlapEvidence,
  buildProvenanceCandidates,
  buildSameTransactionEvidence,
  scanMetadataReferences,
} from "../../../../_lib/provenance";
import { getMintedTokenIdsFromReceipt } from "../../../../_lib/ethers";

export const dynamic = "force-dynamic";

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  const tokenId = normalizeTokenId(params.id);
  if (!tokenId) {
    return NextResponse.json({ error: "invalid_token_id" }, { status: 400 });
  }

  const { contractAddress, network, cacheTtls } = getEnvConfig();
  const cacheKey = `provenance:${tokenId}`;

  try {
    const payload = await getCachedJson(cacheKey, cacheTtls.provenance, async () => {
      const token = await getNftMetadata(tokenId);
      const resolvedMetadata = token.tokenUri?.raw
        ? await resolveMetadata(tokenId, token.tokenUri.raw, cacheTtls.metadata)
        : resolveMetadataFromObject(tokenId, token.metadata);

      const metadataSource = resolvedMetadata.metadata ?? token.metadata;
      const metadataReferences = scanMetadataReferences(metadataSource);

      let sameTransactionReferences = new Map();
      let mintedTokenIds: string[] = [];

      if (token.mint?.transactionHash) {
        mintedTokenIds = await getMintedTokenIdsFromReceipt(token.mint.transactionHash);
        sameTransactionReferences = buildSameTransactionEvidence(
          token.mint.transactionHash,
          mintedTokenIds,
          tokenId
        );
      }

      const candidateIds = new Set<string>([
        ...metadataReferences.keys(),
        ...sameTransactionReferences.keys(),
      ]);

      const targetOwners = await getOwnersForToken(tokenId);
      const ownerOverlap = new Map();

      await Promise.all(
        Array.from(candidateIds).map(async (candidateId) => {
          if (candidateId === tokenId) {
            return;
          }
          try {
            const candidateOwners = await getOwnersForToken(candidateId);
            const overlap = buildOwnerOverlapEvidence(targetOwners, candidateOwners);
            if (overlap) {
              ownerOverlap.set(candidateId, overlap);
            }
          } catch {
            // Ignore invalid candidate ids or transient owner lookup failures.
          }
        })
      );

      const candidates = buildProvenanceCandidates({
        targetTokenId: tokenId,
        metadataReferences,
        sameTransactionReferences,
        ownerOverlap,
      });

      return {
        tokenId,
        contractAddress,
        network,
        mintTxHash: token.mint?.transactionHash ?? null,
        metadataReferenceCount: metadataReferences.size,
        sameTransactionCount: sameTransactionReferences.size,
        ownerOverlapCount: ownerOverlap.size,
        candidates,
        disclaimer:
          "Provenance is heuristic and may be incomplete or incorrect; treat results as inferred evidence, not certainty.",
      };
    });

    return NextResponse.json(payload);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ error: "provenance_lookup_failed", detail: message }, { status: 500 });
  }
}
