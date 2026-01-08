import { NextResponse } from "next/server";

import { getEnvConfig } from "../../../../_lib/env";
import { normalizeTokenId } from "../../../../_lib/normalize";
import { readOwnerOf, readTokenUri } from "../../../../_lib/ethers";
import { getTrustedClientIp } from "../../../../_lib/request";
import { checkRateLimit, getVerifyRateLimitConfig } from "../../../../_lib/rateLimit";

export const dynamic = "force-dynamic";

export async function POST(
  request: Request,
  { params }: { params: { id: string } }
) {
  const tokenId = normalizeTokenId(params.id);
  if (!tokenId) {
    return NextResponse.json({ error: "invalid_token_id" }, { status: 400 });
  }

  const { contractAddress, network } = getEnvConfig();
  const { limit, windowMs } = getVerifyRateLimitConfig();
  const clientKey = `verify:${getTrustedClientIp(request)}`;
  const rate = await checkRateLimit(clientKey, limit, windowMs);

  if (!rate.allowed) {
    return NextResponse.json(
      { error: "rate_limited", resetAt: rate.resetAt },
      {
        status: 429,
        headers: {
          "Retry-After": Math.ceil((rate.resetAt - Date.now()) / 1000).toString(),
        },
      }
    );
  }

  try {
    const [owner, tokenUri] = await Promise.all([
      readOwnerOf(tokenId),
      readTokenUri(tokenId),
    ]);

    return NextResponse.json({
      tokenId,
      contractAddress,
      network,
      owner,
      tokenUri,
      verified: true,
      readOnly: true,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    const status = message.toLowerCase().includes("nonexistent") ? 404 : 500;

    return NextResponse.json(
      {
        tokenId,
        contractAddress,
        network,
        verified: false,
        readOnly: true,
        error: "verification_failed",
        detail: message,
      },
      { status }
    );
  }
}
