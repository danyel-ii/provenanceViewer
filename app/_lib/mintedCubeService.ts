"use server";

import type { MintedCube } from "../_data/minted-cube";
import {
  CUBIXLES_MINTED_CUBES,
  getMintedCube,
} from "../_data/minted-cube";
import { MINT_AUDIT } from "../_data/mint-audit";

const ZERO_ADDRESS = "0x0000000000000000000000000000000000000000";
const MAX_TRANSFER_PAGES = 3;
const DEFAULT_CHAIN_ID = process.env.CUBIXLES_CHAIN_ID ?? "1";

const NETWORK_LABELS: Record<string, string> = {
  "1": "Ethereum Mainnet",
  "5": "Goerli",
  "8453": "Base Mainnet",
};

const FACE_IDS = ["+X", "-X", "+Y", "-Y", "+Z", "-Z"] as const;

const FALLBACK_STATIC_CUBE =
  CUBIXLES_MINTED_CUBES[MINT_AUDIT.tokenId] ??
  Object.values(CUBIXLES_MINTED_CUBES)[0] ??
  null;

type AlchemyAssetTransfer = {
  erc721TokenId?: string;
  from?: string;
  to?: string;
  metadata?: {
    blockTimestamp?: string;
  };
};

type AlchemyTransferResponse = {
  transfers?: AlchemyAssetTransfer[];
  pageKey?: string;
};

type AlchemyNftMetadataResponse = {
  metadata?: Record<string, unknown>;
  tokenUri?: {
    gateway?: string;
    raw?: string;
  };
};

let transferCache: AlchemyAssetTransfer[] | null = null;
const liveCubeCache: Record<string, Promise<MintedCube | null>> = {};

function normalizeTokenId(value?: string | null): string | null {
  if (!value) {
    return null;
  }

  try {
    return BigInt(value).toString();
  } catch {
    return value;
  }
}

function getNetworkLabel(): string {
  return NETWORK_LABELS[DEFAULT_CHAIN_ID] ?? `Chain ${DEFAULT_CHAIN_ID}`;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function ensureRecordArray(value: unknown): Record<string, unknown>[] {
  if (Array.isArray(value)) {
    return value.filter(isRecord);
  }
  if (isRecord(value)) {
    return [value];
  }
  return [];
}

function pickString(...values: (string | undefined | null)[]): string | undefined {
  for (const value of values) {
    if (value && typeof value === "string" && value.trim().length > 0) {
      return value.trim();
    }
  }
  return undefined;
}

function isFaceId(value?: string): value is (typeof FACE_IDS)[number] {
  return value ? FACE_IDS.includes(value as (typeof FACE_IDS)[number]) : false;
}

function buildProvenanceNFT(
  source: Record<string, unknown>,
  fallback?: MintedCube["provenanceNFTs"][number]
): MintedCube["provenanceNFTs"][number] {
  const metadataCandidate = isRecord(source.metadata) ? source.metadata : null;

  const metadataUrl = pickString(
    source.metadataUrl as string | undefined,
    source.metadata_url as string | undefined,
    metadataCandidate?.gateway as string | undefined,
    metadataCandidate?.raw as string | undefined,
    fallback?.metadataUrl
  );

  const faceIdCandidate = pickString(
    source.faceId as string | undefined,
    source.id as string | undefined,
    source.label as string | undefined,
    fallback?.faceId
  );

  return {
    faceId: isFaceId(faceIdCandidate) ? faceIdCandidate : fallback?.faceId ?? "+X",
    title:
      pickString(
        source.title as string | undefined,
        source.name as string | undefined,
        source.label as string | undefined,
        fallback?.title
      ) ?? fallback?.title ??
      "",
    collection:
      pickString(
        source.collection as string | undefined,
        source.series as string | undefined,
        source.family as string | undefined,
        fallback?.collection
      ) ?? fallback?.collection ??
      "",
    tokenId:
      pickString(
        source.tokenId as string | undefined,
        source.token_id as string | undefined,
        fallback?.tokenId
      ) ?? fallback?.tokenId ??
      "",
    ownerNote:
      pickString(
        source.ownerNote as string | undefined,
        source.owner_note as string | undefined,
        source.note as string | undefined,
        fallback?.ownerNote
      ) ?? fallback?.ownerNote ??
      "",
    description:
      pickString(
        source.description as string | undefined,
        source.summary as string | undefined,
        source.detail as string | undefined,
        fallback?.description
      ) ?? fallback?.description ??
      "",
    explorerUrl:
      pickString(
        source.explorerUrl as string | undefined,
        source.explorer_url as string | undefined,
        source.explorer as string | undefined,
        source.url as string | undefined,
        fallback?.explorerUrl
      ) ?? fallback?.explorerUrl ??
      "",
    metadataUrl,
  };
}

function parseProvenanceNFTs(
  source: unknown,
  fallback: MintedCube["provenanceNFTs"]
): MintedCube["provenanceNFTs"] {
  const candidates = ensureRecordArray(source);
  if (!candidates.length) {
    return fallback;
  }

  const merged = fallback.map((fallbackFace, index) => {
    const candidate = candidates[index];
    if (!candidate) {
      return { ...fallbackFace };
    }
    return buildProvenanceNFT(candidate, fallbackFace);
  });

  if (candidates.length > merged.length) {
    merged.push(
      ...candidates.slice(merged.length).map((candidate) => buildProvenanceNFT(candidate))
    );
  }

  return merged;
}

function parseReferences(
  source: unknown,
  fallback: MintedCube["references"]
): MintedCube["references"] {
  const records = ensureRecordArray(source);
  if (!records.length) {
    return fallback;
  }

  const parsed = records
    .map((record) => {
      const label = pickString(
        record.label as string | undefined,
        record.title as string | undefined,
        record.name as string | undefined
      );
      const url = pickString(
        record.url as string | undefined,
        record.link as string | undefined,
        record.href as string | undefined
      );
      if (label && url) {
        return { label, url };
      }
      return null;
    })
    .filter((entry): entry is { label: string; url: string } => entry !== null);

  return parsed.length ? parsed : fallback;
}

function parseProvenanceTrail(
  source: unknown,
  fallback: MintedCube["provenanceTrail"]
): MintedCube["provenanceTrail"] {
  const entries = ensureRecordArray(source);
  if (!entries.length) {
    return fallback;
  }

  const parsed = entries
    .map((entry) => {
      const title = pickString(
        entry.title as string | undefined,
        entry.label as string | undefined,
        entry.stage as string | undefined
      );
      const detail = pickString(
        entry.detail as string | undefined,
        entry.description as string | undefined,
        entry.body as string | undefined
      );
      if (!title || !detail) {
        return null;
      }
      const referenceRecord =
        (entry.reference && isRecord(entry.reference) ? entry.reference : null) ??
        (entry.link && isRecord(entry.link) ? entry.link : null);
      let reference: MintedCube["provenanceTrail"][number]["reference"] | undefined;
      if (referenceRecord) {
        const label = pickString(
          referenceRecord.label as string | undefined,
          referenceRecord.title as string | undefined
        );
        const url = pickString(
          referenceRecord.url as string | undefined,
          referenceRecord.href as string | undefined,
          referenceRecord.link as string | undefined
        );
        if (label && url) {
          reference = { label, url };
        }
      }

      return {
        title,
        detail,
        reference,
      };
    })
    .filter((entry) => Boolean(entry && entry.title && entry.detail)) as
    MintedCube["provenanceTrail"];

  return parsed.length ? parsed : fallback;
}

async function fetchMintTransfers(): Promise<AlchemyAssetTransfer[]> {
  if (transferCache) {
    return transferCache;
  }

  const rpcUrl = process.env.MAINNET_RPC_URL;
  const contractAddress = process.env.CUBIXLES_CONTRACT_ADDRESS;
  if (!rpcUrl || !contractAddress) {
    return [];
  }

  const collected: AlchemyAssetTransfer[] = [];
  let pageKey: string | undefined;
  let iterations = 0;

  while (iterations < MAX_TRANSFER_PAGES) {
    const body = JSON.stringify({
      jsonrpc: "2.0",
      id: 1,
      method: "alchemy_getAssetTransfers",
      params: [
        {
          fromBlock: "0x0",
          toBlock: "latest",
          category: ["erc721"],
          contractAddresses: [contractAddress],
          withMetadata: true,
          excludeZeroValue: true,
          maxCount: "0x64",
          order: "asc",
          ...(pageKey ? { pageKey } : {}),
        },
      ],
    });

    const response = await fetch(rpcUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body,
      cache: "no-store",
    });
    if (!response.ok) {
      break;
    }

    const json = (await response.json()) as { result?: AlchemyTransferResponse };
    const result = json.result;
    if (!result?.transfers?.length) {
      break;
    }

    collected.push(...result.transfers);
    pageKey = result.pageKey;
    if (!pageKey) {
      break;
    }

    iterations += 1;
  }

  transferCache = collected.filter(
    (transfer) => transfer.from?.toLowerCase() === ZERO_ADDRESS
  );
  return transferCache;
}

async function fetchMintTransfer(tokenId: string): Promise<AlchemyAssetTransfer | null> {
  const normalizedId = normalizeTokenId(tokenId);
  if (!normalizedId) {
    return null;
  }

  const transfers = await fetchMintTransfers();
  return transfers.find(
    (transfer) => normalizeTokenId(transfer.erc721TokenId) === normalizedId
  ) ?? null;
}

async function fetchMetadata(tokenId: string): Promise<AlchemyNftMetadataResponse | null> {
  const apiKey = process.env.ALCHEMY_API_KEY;
  const contractAddress = process.env.CUBIXLES_CONTRACT_ADDRESS;
  if (!apiKey || !contractAddress) {
    return null;
  }

  const chainId = process.env.CUBIXLES_CHAIN_ID ?? "1";
  const base =
    chainId === "8453"
      ? "https://base-mainnet.g.alchemy.com"
      : "https://eth-mainnet.g.alchemy.com";

  const url = new URL(`${base}/nft/v2/${apiKey}/getNFTMetadata`);
  url.searchParams.set("contractAddress", contractAddress);
  url.searchParams.set("tokenId", tokenId);
  url.searchParams.set("refreshCache", "false");

  const response = await fetch(url.toString(), {
    cache: "no-store",
  });
  if (!response.ok) {
    return null;
  }

  return (await response.json()) as AlchemyNftMetadataResponse;
}

function mergeMintedCube(
  tokenId: string,
  fallback: MintedCube,
  transfer: AlchemyAssetTransfer | null,
  metadata: AlchemyNftMetadataResponse | null
): MintedCube {
  const metadataRoot = metadata?.metadata ?? null;
  const metadataProperties =
    metadataRoot && isRecord(metadataRoot.properties)
      ? (metadataRoot.properties as Record<string, unknown>)
      : null;

  const mintedAt =
    transfer?.metadata?.blockTimestamp
      ? new Date(transfer.metadata.blockTimestamp).toISOString()
      : fallback.mintedAt;
  const mintedBy = pickString(transfer?.to, fallback.mintedBy) ?? fallback.mintedBy;
  const description =
    pickString(
      metadataRoot?.description as string | undefined,
      metadataRoot?.summary as string | undefined,
      fallback.description
    ) ?? fallback.description;
  const provenanceNote =
    pickString(
      metadataRoot?.provenanceNote as string | undefined,
      metadataProperties?.provenanceNote as string | undefined,
      fallback.provenanceNote
    ) ?? fallback.provenanceNote;
  const tokenViewUrl =
    pickString(
      metadataRoot?.external_url as string | undefined,
      metadata?.tokenUri?.gateway,
      metadata?.tokenUri?.raw,
      fallback.tokenViewUrl
    ) ?? fallback.tokenViewUrl;

  const references = parseReferences(
    metadataProperties?.references ?? metadataRoot?.references ?? metadataRoot?.links,
    fallback.references
  );

  const provenanceNFTs = parseProvenanceNFTs(
    metadataProperties?.faces ?? metadataRoot?.faces,
    fallback.provenanceNFTs
  );

  const provenanceTrail = parseProvenanceTrail(
    metadataProperties?.provenanceTrail ?? metadataRoot?.provenanceTrail,
    fallback.provenanceTrail
  );

  return {
    ...fallback,
    tokenId,
    network: getNetworkLabel(),
    mintedAt,
    mintedBy,
    description,
    provenanceNote,
    tokenViewUrl,
    references,
    provenanceNFTs,
    provenanceTrail,
  };
}

async function buildLiveCube(tokenId: string): Promise<MintedCube | null> {
  const normalizedId = normalizeTokenId(tokenId);
  if (!normalizedId) {
    return null;
  }

  const [transfer, metadata] = await Promise.all([
    fetchMintTransfer(normalizedId),
    fetchMetadata(normalizedId),
  ]);

  if (!transfer && !metadata) {
    return null;
  }

  const staticCube = getMintedCube(normalizedId);
  const fallbackCube = staticCube ?? FALLBACK_STATIC_CUBE;
  if (!fallbackCube) {
    return null;
  }

  return mergeMintedCube(normalizedId, fallbackCube, transfer, metadata);
}

export async function getLiveMintedCube(tokenId?: string): Promise<MintedCube | null> {
  const normalizedId = normalizeTokenId(tokenId ?? undefined);
  if (!normalizedId) {
    return null;
  }

  if (!liveCubeCache[normalizedId]) {
    liveCubeCache[normalizedId] = buildLiveCube(normalizedId);
  }

  return liveCubeCache[normalizedId];
}

export async function getLiveMintedCubes(): Promise<MintedCube[]> {
  const transfers = await fetchMintTransfers();
  const uniqueIds = Array.from(
    new Set(
      transfers
        .map((transfer) => normalizeTokenId(transfer.erc721TokenId))
        .filter((id): id is string => Boolean(id))
    )
  );

  const cubes = await Promise.all(uniqueIds.map((tokenId) => buildLiveCube(tokenId)));
  return cubes.filter((cube): cube is MintedCube => Boolean(cube));
}
