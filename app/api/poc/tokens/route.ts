import { NextResponse } from "next/server";

import { getEnvConfig } from "../../../_lib/env";
import {
  getAllNftsForCollection,
  getNftsForCollection,
} from "../../../_lib/alchemy";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const { network, contractAddress } = getEnvConfig();
    const { searchParams } = new URL(request.url);
    const limitParam = searchParams.get("limit");
    const pageKeyParam = searchParams.get("pageKey");
    const allParam = searchParams.get("all");
    const maxPagesParam = searchParams.get("maxPages");
    const parsedLimit = limitParam ? Number.parseInt(limitParam, 10) : 20;
    const limit = Number.isFinite(parsedLimit) ? parsedLimit : 20;
    const all = allParam === "1" || allParam === "true";
    const parsedMaxPages = maxPagesParam
      ? Number.parseInt(maxPagesParam, 10)
      : 10;
    const maxPages = Number.isFinite(parsedMaxPages) ? parsedMaxPages : 10;

    const pageKey =
      pageKeyParam && pageKeyParam.trim().length > 0 ? pageKeyParam : undefined;
    const result = all
      ? await getAllNftsForCollection({ pageSize: limit, maxPages })
      : await getNftsForCollection(limit, pageKey);

    return NextResponse.json({
      network,
      contractAddress,
      count: result.tokens.length,
      tokens: result.tokens,
      pageKey: result.pageKey ?? null,
      nextToken: result.pageKey ?? null,
      pages: "pages" in result ? result.pages : 1,
      truncated: "truncated" in result ? result.truncated : false,
      mode: all ? "all" : "page",
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "token_list_failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
