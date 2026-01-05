import { getCachedJson } from "./cache";
import { getAlchemyNftBaseUrl, getEnvConfig } from "./env";
import { normalizeAddress, normalizeTokenId } from "./normalize";

type AlchemyNftMedia = {
  gateway?: string;
  raw?: string;
  thumbnail?: string;
  format?: string;
};

type AlchemyMintInfo = {
  transactionHash?: string;
  minterAddress?: string;
  blockNumber?: number;
  timestamp?: string;
};

type AlchemyNft = {
  contract?: { address?: string };
  tokenId?: string;
  title?: string;
  name?: string;
  description?: string;
  metadata?: Record<string, unknown>;
  raw?: {
    metadata?: Record<string, unknown>;
    tokenUri?: string;
  };
  tokenUri?: {
    raw?: string;
    gateway?: string;
  };
  media?: AlchemyNftMedia[];
  mint?: AlchemyMintInfo;
};

type AlchemyCollectionResponse = {
  nfts?: AlchemyNft[];
  nextToken?: string;
};

type AlchemyMetadataResponse = AlchemyNft & {
  contract?: { address?: string };
};

type AlchemyOwnersResponse = {
  owners?: string[];
};

export type NormalizedNft = {
  tokenId: string;
  title?: string;
  name?: string;
  description?: string;
  metadata: Record<string, unknown> | null;
  tokenUri: {
    raw?: string;
    gateway?: string;
  } | null;
  media: AlchemyNftMedia[];
  mint: AlchemyMintInfo | null;
};

export type NormalizedTokenMetadata = {
  tokenId: string;
  contractAddress: string;
  title?: string;
  name?: string;
  description?: string;
  metadata: Record<string, unknown> | null;
  tokenUri: {
    raw?: string;
    gateway?: string;
  } | null;
  media: AlchemyNftMedia[];
  mint: AlchemyMintInfo | null;
};

const RETRYABLE_STATUSES = new Set([408, 429, 500, 502, 503, 504]);

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function fetchWithRetry(url: string, options: RequestInit, attempts = 3) {
  let attempt = 0;

  while (attempt <= attempts) {
    try {
      const response = await fetch(url, options);
      if (response.ok) {
        return response;
      }

      if (!RETRYABLE_STATUSES.has(response.status) || attempt === attempts) {
        return response;
      }
    } catch (error) {
      if (attempt === attempts) {
        throw error;
      }
    }

    const delay = 250 * Math.pow(2, attempt);
    await sleep(delay);
    attempt += 1;
  }

  throw new Error("Retry attempts exhausted");
}

async function alchemyFetch<T>(
  path: string,
  params: Record<string, string | number | boolean | undefined>
): Promise<T> {
  const baseUrl = getAlchemyNftBaseUrl();
  const url = new URL(`${baseUrl}${path}`);
  Object.entries(params).forEach(([key, value]) => {
    if (value === undefined) {
      return;
    }
    url.searchParams.set(key, String(value));
  });

  const response = await fetchWithRetry(url.toString(), {
    method: "GET",
    headers: { accept: "application/json" },
    cache: "no-store",
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Alchemy request failed (${response.status}): ${text}`);
  }

  return (await response.json()) as T;
}

export async function getNftsForCollection(limit: number) {
  const { contractAddress, cacheTtls } = getEnvConfig();
  const normalizedContract = normalizeAddress(contractAddress);
  if (!normalizedContract) {
    throw new Error("Invalid CUBIXLES_CONTRACT value");
  }

  const clampedLimit = Math.min(Math.max(limit, 1), 100);
  const cacheKey = `alchemy:collection:${normalizedContract}:${clampedLimit}`;

  return getCachedJson(cacheKey, cacheTtls.tokens, async () => {
    const response = await alchemyFetch<AlchemyCollectionResponse>(
      "/getNFTsForCollection",
      {
        contractAddress: normalizedContract,
        withMetadata: true,
        limit: clampedLimit,
      }
    );

    const tokens = (response.nfts ?? [])
      .filter((nft) => {
        const nftAddress = normalizeAddress(nft.contract?.address);
        return nftAddress === normalizedContract;
      })
      .map<NormalizedNft | null>((nft) => {
        const tokenId = normalizeTokenId(nft.tokenId);
        if (!tokenId) {
          return null;
        }

        return {
          tokenId,
          title: nft.title,
          name: nft.name,
          description: nft.description,
          metadata: nft.metadata ?? nft.raw?.metadata ?? null,
          tokenUri: nft.tokenUri ??
            (nft.raw?.tokenUri
              ? { raw: nft.raw.tokenUri, gateway: undefined }
              : null),
          media: nft.media ?? [],
          mint: nft.mint ?? null,
        };
      })
      .filter((token): token is NormalizedNft => Boolean(token));

    return {
      contractAddress: normalizedContract,
      tokens,
      nextToken: response.nextToken,
    };
  });
}

export async function getNftMetadata(tokenId: string): Promise<NormalizedTokenMetadata> {
  const { contractAddress, cacheTtls } = getEnvConfig();
  const normalizedContract = normalizeAddress(contractAddress);
  if (!normalizedContract) {
    throw new Error("Invalid CUBIXLES_CONTRACT value");
  }

  const normalizedTokenId = normalizeTokenId(tokenId);
  if (!normalizedTokenId) {
    throw new Error("Invalid token id");
  }

  const cacheKey = `alchemy:metadata:${normalizedContract}:${normalizedTokenId}`;

  return getCachedJson(cacheKey, cacheTtls.metadata, async () => {
    const response = await alchemyFetch<AlchemyMetadataResponse>("/getNFTMetadata", {
      contractAddress: normalizedContract,
      tokenId: normalizedTokenId,
      tokenType: "ERC721",
    });

    return {
      tokenId: normalizedTokenId,
      contractAddress: normalizeAddress(response.contract?.address) ?? normalizedContract,
      title: response.title,
      name: response.name,
      description: response.description,
      metadata: response.metadata ?? response.raw?.metadata ?? null,
      tokenUri:
        response.tokenUri ??
        (response.raw?.tokenUri
          ? { raw: response.raw.tokenUri, gateway: undefined }
          : null),
      media: response.media ?? [],
      mint: response.mint ?? null,
    };
  });
}

export async function getOwnersForToken(tokenId: string): Promise<string[]> {
  const { contractAddress, cacheTtls } = getEnvConfig();
  const normalizedContract = normalizeAddress(contractAddress);
  const normalizedTokenId = normalizeTokenId(tokenId);

  if (!normalizedContract || !normalizedTokenId) {
    return [];
  }

  const cacheKey = `alchemy:owners:${normalizedContract}:${normalizedTokenId}`;

  return getCachedJson(cacheKey, cacheTtls.owners, async () => {
    const response = await alchemyFetch<AlchemyOwnersResponse>("/getOwnersForNFT", {
      contractAddress: normalizedContract,
      tokenId: normalizedTokenId,
    });

    return response.owners ?? [];
  });
}
