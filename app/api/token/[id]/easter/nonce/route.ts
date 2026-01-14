import { NextResponse } from "next/server";

import {
  createEasterNonce,
  getRequestDomain,
} from "../../../../../_lib/easterAuth";
import { normalizeTokenId } from "../../../../../_lib/normalize";
import { getTrustedClientIp } from "../../../../../_lib/request";
import {
  checkRateLimit,
  getVerifyRateLimitConfig,
} from "../../../../../_lib/rateLimit";

export const dynamic = "force-dynamic";

function parseChainId(value: string | null) {
  if (!value) {
    return null;
  }
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) ? parsed : null;
}

export async function POST(
  request: Request,
  { params }: { params: { id: string } }
) {
  const tokenId = normalizeTokenId(params.id);
  if (!tokenId) {
    return NextResponse.json({ error: "invalid_token_id" }, { status: 400 });
  }

  const url = new URL(request.url);
  const chainId = parseChainId(url.searchParams.get("chainId"));
  if (!chainId) {
    return NextResponse.json({ error: "invalid_chain_id" }, { status: 400 });
  }

  const { limit, windowMs } = getVerifyRateLimitConfig();
  const clientKey = `easter:nonce:${getTrustedClientIp(request)}:${tokenId}`;
  const rate = await checkRateLimit(clientKey, limit, windowMs);
  if (!rate.allowed) {
    return NextResponse.json(
      { error: "rate_limited", resetAt: rate.resetAt },
      {
        status: 429,
        headers: {
          "Retry-After": Math.ceil(
            (rate.resetAt - Date.now()) / 1000
          ).toString(),
        },
      }
    );
  }

  try {
    const domain = getRequestDomain(request);
    const { nonce, message, expiresAt } = await createEasterNonce({
      tokenId,
      chainId,
      domain,
    });

    return NextResponse.json({ nonce, message, expiresAt });
  } catch (error) {
    const message = error instanceof Error ? error.message : "nonce_failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
