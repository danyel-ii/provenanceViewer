import { NextResponse } from "next/server";

import { getEnvConfig } from "../../../_lib/env";
import { getNftMetadata } from "../../../_lib/alchemy";
import { normalizeAddress, normalizeTokenId } from "../../../_lib/normalize";
import {
  resolveMetadata,
  resolveMetadataFromObject,
} from "../../../_lib/metadata";

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

  try {
    const token = await getNftMetadata(tokenId);
    const normalizedContract = normalizeAddress(contractAddress);

    if (
      normalizedContract &&
      normalizeAddress(token.contractAddress) !== normalizedContract
    ) {
      return NextResponse.json(
        { error: "token_not_in_contract" },
        { status: 400 }
      );
    }

    const resolvedMetadata = token.tokenUri?.raw
      ? await resolveMetadata(tokenId, token.tokenUri.raw, cacheTtls.metadata)
      : resolveMetadataFromObject(tokenId, token.metadata);

    return NextResponse.json({
      tokenId,
      contractAddress,
      network,
      title: token.title,
      name: token.name,
      description: token.description,
      tokenUri: token.tokenUri,
      media: token.media,
      mint: token.mint,
      metadata: {
        raw: token.metadata,
        resolved: resolvedMetadata.metadata,
        resolvedUrl: resolvedMetadata.resolvedUrl,
        media: resolvedMetadata.media,
        validation: resolvedMetadata.validation,
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    const status = message.includes("404") ? 404 : 500;
    return NextResponse.json({ error: "token_lookup_failed", detail: message }, { status });
  }
}
