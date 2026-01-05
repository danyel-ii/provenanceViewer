import { getCachedJson } from "./cache";
import { normalizeTokenId } from "./normalize";

const IPFS_GATEWAYS = [
  "https://ipfs.io/ipfs/",
  "https://cloudflare-ipfs.com/ipfs/",
  "https://gateway.pinata.cloud/ipfs/",
];

const ARWEAVE_GATEWAYS = ["https://arweave.net/", "https://ar-io.net/"];

export type ResolvedMetadata = {
  tokenId: string | null;
  rawUrl: string;
  resolvedUrl: string | null;
  metadata: Record<string, unknown> | null;
  media: {
    image: string | null;
    animation: string | null;
    imageCandidates: string[];
    animationCandidates: string[];
  };
  validation: {
    hasMedia: boolean;
    issues: string[];
  };
};

function stripIpfsPrefix(uri: string): string {
  return uri
    .replace(/^ipfs:\/\/ipfs\//i, "")
    .replace(/^ipfs:\/\//i, "");
}

function stripArweavePrefix(uri: string): string {
  return uri.replace(/^ar:\/\//i, "");
}

function buildGatewayUrls(rawUrl: string): string[] {
  if (rawUrl.startsWith("ipfs://") || rawUrl.toLowerCase().startsWith("ipfs://")) {
    const path = stripIpfsPrefix(rawUrl);
    return IPFS_GATEWAYS.map((gateway) => `${gateway}${path}`);
  }

  if (rawUrl.startsWith("ar://") || rawUrl.toLowerCase().startsWith("ar://")) {
    const path = stripArweavePrefix(rawUrl);
    return ARWEAVE_GATEWAYS.map((gateway) => `${gateway}${path}`);
  }

  if (rawUrl.startsWith("http://") || rawUrl.startsWith("https://")) {
    return [rawUrl];
  }

  return [];
}

async function fetchJsonWithFallback(urls: string[]): Promise<{
  data: Record<string, unknown> | null;
  resolvedUrl: string | null;
}> {
  for (const url of urls) {
    try {
      const response = await fetch(url, { cache: "no-store" });
      if (!response.ok) {
        continue;
      }
      const json = (await response.json()) as Record<string, unknown>;
      return { data: json, resolvedUrl: url };
    } catch {
      continue;
    }
  }

  return { data: null, resolvedUrl: null };
}

function pickString(value: unknown): string | null {
  if (typeof value === "string" && value.trim().length > 0) {
    return value.trim();
  }
  return null;
}

function extractMedia(metadata: Record<string, unknown> | null) {
  if (!metadata) {
    return { imageRaw: null, animationRaw: null };
  }

  const imageRaw =
    pickString(metadata.image) ??
    pickString(metadata.image_url) ??
    pickString(metadata.imageUrl) ??
    pickString(metadata.imageURI) ??
    pickString(metadata.image_uri) ??
    null;

  const animationRaw =
    pickString(metadata.animation_url) ??
    pickString(metadata.animationUrl) ??
    pickString(metadata.animationURI) ??
    pickString(metadata.animation_uri) ??
    null;

  return { imageRaw, animationRaw };
}

function validateMetadata(metadata: Record<string, unknown> | null) {
  const issues: string[] = [];
  const { imageRaw, animationRaw } = extractMedia(metadata);

  if (!imageRaw && !animationRaw) {
    issues.push("metadata_missing_media");
  }

  return {
    hasMedia: Boolean(imageRaw || animationRaw),
    issues,
  };
}

export async function resolveMetadata(
  tokenId: string | null,
  rawUrl: string,
  ttlSeconds: number
): Promise<ResolvedMetadata> {
  const normalizedTokenId = normalizeTokenId(tokenId ?? undefined);
  const cacheKey = `metadata:resolved:${rawUrl}`;

  return getCachedJson(cacheKey, ttlSeconds, async () => {
    const urls = buildGatewayUrls(rawUrl);
    const { data, resolvedUrl } = await fetchJsonWithFallback(urls);
    const { imageRaw, animationRaw } = extractMedia(data);
    const imageCandidates = imageRaw ? buildGatewayUrls(imageRaw) : [];
    const animationCandidates = animationRaw ? buildGatewayUrls(animationRaw) : [];
    const validation = validateMetadata(data);

    return {
      tokenId: normalizedTokenId,
      rawUrl,
      resolvedUrl,
      metadata: data,
      media: {
        image: imageCandidates[0] ?? null,
        animation: animationCandidates[0] ?? null,
        imageCandidates,
        animationCandidates,
      },
      validation,
    };
  });
}

export function resolveMetadataFromObject(
  tokenId: string | null,
  metadata: Record<string, unknown> | null
): ResolvedMetadata {
  const normalizedTokenId = normalizeTokenId(tokenId ?? undefined);
  const { imageRaw, animationRaw } = extractMedia(metadata);
  const imageCandidates = imageRaw ? buildGatewayUrls(imageRaw) : [];
  const animationCandidates = animationRaw ? buildGatewayUrls(animationRaw) : [];
  const validation = validateMetadata(metadata);

  return {
    tokenId: normalizedTokenId,
    rawUrl: "",
    resolvedUrl: null,
    metadata,
    media: {
      image: imageCandidates[0] ?? null,
      animation: animationCandidates[0] ?? null,
      imageCandidates,
      animationCandidates,
    },
    validation,
  };
}
