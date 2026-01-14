import { NextResponse } from "next/server";
import { verifyMessage } from "ethers";

import {
  buildEasterSignMessage,
  consumeEasterNonce,
  createEasterAccessToken,
  getRequestDomain,
} from "../../../../../_lib/easterAuth";
import { getTokenStandard } from "../../../../../_lib/env";
import { readBalanceOf, readOwnerOf } from "../../../../../_lib/ethers";
import { normalizeAddress, normalizeTokenId } from "../../../../../_lib/normalize";
import { getTrustedClientIp } from "../../../../../_lib/request";
import {
  checkRateLimit,
  getVerifyRateLimitConfig,
} from "../../../../../_lib/rateLimit";

export const dynamic = "force-dynamic";

type VerifyRequestBody = {
  address?: string;
  signature?: string;
  nonce?: string;
};

function parseChainId(value: string | null) {
  if (!value) {
    return null;
  }
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) ? parsed : null;
}

async function checkOwnership(options: {
  address: string;
  tokenId: string;
  chainId: number;
}) {
  const standard = getTokenStandard();
  if (standard === "ERC1155") {
    const balance = await readBalanceOf(
      options.address,
      options.tokenId,
      options.chainId
    );
    return typeof balance === "bigint" ? balance > 0n : Number(balance) > 0;
  }

  const owner = await readOwnerOf(options.tokenId, options.chainId);
  const normalizedOwner = normalizeAddress(owner);
  return normalizedOwner === normalizeAddress(options.address);
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
  const clientKey = `easter:verify:${getTrustedClientIp(request)}:${tokenId}`;
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

  let body: VerifyRequestBody = {};
  try {
    body = (await request.json()) as VerifyRequestBody;
  } catch {
    return NextResponse.json({ error: "invalid_body" }, { status: 400 });
  }

  const signature = body.signature?.trim();
  const nonce = body.nonce?.trim();
  const normalizedAddress = normalizeAddress(body.address ?? "");
  if (!signature || !nonce || !normalizedAddress) {
    return NextResponse.json({ error: "missing_fields" }, { status: 400 });
  }

  try {
    const domain = getRequestDomain(request);
    const nonceResult = await consumeEasterNonce({
      nonce,
      tokenId,
      chainId,
      domain,
    });

    if (!nonceResult.ok) {
      return NextResponse.json(
        { error: nonceResult.reason ?? "nonce_invalid" },
        { status: 400 }
      );
    }

    const message = buildEasterSignMessage({
      tokenId,
      chainId,
      nonce,
      domain,
    });
    const recovered = verifyMessage(message, signature);
    const normalizedRecovered = normalizeAddress(recovered);
    if (!normalizedRecovered || normalizedRecovered !== normalizedAddress) {
      return NextResponse.json({ error: "signature_mismatch" }, { status: 401 });
    }

    const isOwner = await checkOwnership({
      address: normalizedAddress,
      tokenId,
      chainId,
    });

    if (!isOwner) {
      return NextResponse.json({ error: "not_owner" }, { status: 403 });
    }

    const { accessToken, expiresAt } = createEasterAccessToken({
      tokenId,
      chainId,
      address: normalizedAddress,
    });

    return NextResponse.json({
      tokenId,
      chainId,
      address: normalizedAddress,
      accessToken,
      expiresAt,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "verify_failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
