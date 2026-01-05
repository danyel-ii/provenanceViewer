import { NextResponse } from "next/server";

import { getEnvConfig } from "../../../_lib/env";
import { getNftsForCollection } from "../../../_lib/alchemy";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const { network, contractAddress } = getEnvConfig();
  const { searchParams } = new URL(request.url);
  const limitParam = searchParams.get("limit");
  const parsedLimit = limitParam ? Number.parseInt(limitParam, 10) : 20;
  const limit = Number.isFinite(parsedLimit) ? parsedLimit : 20;

  const result = await getNftsForCollection(limit);

  return NextResponse.json({
    network,
    contractAddress,
    count: result.tokens.length,
    tokens: result.tokens,
    nextToken: result.nextToken ?? null,
  });
}
