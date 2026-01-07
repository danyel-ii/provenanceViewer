import Link from "next/link";
import { headers } from "next/headers";

import CollapsiblePanel from "../../_components/CollapsiblePanel";
import CubixlesText from "../../_components/CubixlesText";
import FallbackImage from "../../_components/FallbackImage";
import TokenVerifyPanel from "../../_components/TokenVerifyPanel";
import { withBasePath } from "../../_lib/basePath";
import { resolveMetadataFromObject } from "../../_lib/metadata";

type TokenMetadata = {
  raw: Record<string, unknown> | null;
  resolved: Record<string, unknown> | null;
  resolvedUrl: string | null;
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

type TokenApiResponse = {
  tokenId: string;
  contractAddress: string;
  network: string;
  title?: string;
  name?: string;
  description?: string;
  tokenUri: {
    raw?: string;
    gateway?: string;
  } | null;
  media: { gateway?: string; raw?: string; thumbnail?: string; format?: string }[];
  mint: {
    transactionHash?: string;
    minterAddress?: string;
    blockNumber?: number;
    timestamp?: string;
  } | null;
  metadata: TokenMetadata;
};

type ProvenanceCandidate = {
  tokenId: string;
  confidence: "low" | "medium" | "high";
  score: number;
  source: string;
  evidence: {
    explicitMetadataReference?: { fieldPath: string; value: string }[];
    sameTransaction?: { txHash: string; mintedTokenIds: string[] };
    ownerOverlap?: {
      overlapCount: number;
      overlapOwners: string[];
      ownerCount: number;
      candidateOwnerCount: number;
      overlapRatio: number;
    };
  };
};

type ProvenanceResponse = {
  tokenId: string;
  candidates: ProvenanceCandidate[];
  mintTxHash: string | null;
  metadataReferenceCount: number;
  sameTransactionCount: number;
  ownerOverlapCount: number;
  disclaimer: string;
};

type TokenReferenceFace = {
  tokenId: string;
  contractAddress?: string;
  chainId?: number;
  image: string | null;
  imageCandidates: string[];
  floorEth?: number;
  floorRetrievedAt?: string;
};

function getBaseUrl() {
  const envUrl = process.env.NEXT_PUBLIC_BASE_URL;
  const basePath = process.env.NEXT_PUBLIC_BASE_PATH ?? "/inspecta_deck";
  const normalizedBasePath =
    basePath && basePath !== "/" ? basePath.replace(/\/$/, "") : "";
  if (envUrl) {
    return envUrl.endsWith(normalizedBasePath)
      ? envUrl
      : `${envUrl}${normalizedBasePath}`;
  }
  const headerList = headers();
  const host = headerList.get("x-forwarded-host") ?? headerList.get("host");
  const proto = headerList.get("x-forwarded-proto") ?? "http";
  return host
    ? `${proto}://${host}${normalizedBasePath}`
    : `http://localhost:3000${normalizedBasePath}`;
}

function truncateMiddle(value: string, start = 6, end = 4) {
  if (value.length <= start + end + 3) {
    return value;
  }
  return `${value.slice(0, start)}...${value.slice(-end)}`;
}

function truncateLongValue(value: string, maxLength = 36) {
  if (value.length <= maxLength) {
    return value;
  }
  return truncateMiddle(value, 12, 8);
}

function normalizeTokenId(value?: string | number | null): string | null {
  if (value === null || value === undefined) {
    return null;
  }
  const stringValue = typeof value === "string" ? value : String(value);
  try {
    return BigInt(stringValue).toString();
  } catch {
    return stringValue;
  }
}

function parseChainId(value: unknown): number | undefined {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }
  if (typeof value === "string") {
    const parsed = Number.parseInt(value, 10);
    return Number.isFinite(parsed) ? parsed : undefined;
  }
  return undefined;
}

function pickString(...values: (string | undefined | null)[]): string | undefined {
  for (const value of values) {
    if (value && typeof value === "string" && value.trim().length > 0) {
      return value.trim();
    }
  }
  return undefined;
}

function pickTokenIdValue(
  entry: Record<string, unknown>
): string | number | null {
  const candidates = [
    entry.tokenId,
    entry.token_id,
    entry.tokenIdNumber,
    entry.token_id_number,
    entry.token,
  ];

  for (const candidate of candidates) {
    if (typeof candidate === "string" || typeof candidate === "number") {
      return candidate;
    }
  }

  return null;
}

function pickNumber(value: unknown): number | undefined {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }
  if (typeof value === "string") {
    const parsed = Number.parseFloat(value);
    return Number.isFinite(parsed) ? parsed : undefined;
  }
  return undefined;
}

function formatSnapshotDate(value?: string): string | undefined {
  if (!value) {
    return undefined;
  }
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return value;
  }
  return parsed.toISOString().split("T")[0] ?? value;
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

function uniqueStrings(values: string[]): string[] {
  return Array.from(new Set(values.filter(Boolean)));
}

function expandGatewayCandidates(values: string[]): string[] {
  return uniqueStrings(
    values.flatMap((candidate) => {
      const resolved = resolveMetadataFromObject(null, { image: candidate });
      return resolved.media.imageCandidates.length
        ? resolved.media.imageCandidates
        : [candidate];
    })
  );
}

function extractStringValues(value: unknown): string[] {
  if (!value) {
    return [];
  }
  if (typeof value === "string") {
    return [value];
  }
  if (Array.isArray(value)) {
    return value.flatMap((entry) => extractStringValues(entry));
  }
  if (isRecord(value)) {
    return Object.values(value).flatMap((entry) => extractStringValues(entry));
  }
  return [];
}

function extractImageCandidates(
  entry: Record<string, unknown>,
  depth = 0
): string[] {
  if (depth > 2) {
    return [];
  }

  const candidates: string[] = [];
  const image = entry.image;
  if (isRecord(image)) {
    const resolved = pickString(
      image.resolved as string | undefined,
      image.gateway as string | undefined,
      image.url as string | undefined,
      image.preview as string | undefined
    );
    const original = pickString(
      image.original as string | undefined,
      image.raw as string | undefined
    );
    candidates.push(
      ...(resolved ? [resolved] : []),
      ...(original ? [original] : []),
      ...extractStringValues(image)
    );
  } else {
    candidates.push(...extractStringValues(image));
  }

  candidates.push(
    ...extractStringValues(
      entry.image ??
        entry.image_url ??
        entry.imageUrl ??
        entry.imageURI ??
        entry.image_uri ??
        entry.preview ??
        entry.preview_url ??
        entry.previewUrl ??
        entry.thumbnail
    )
  );

  const media = entry.media;
  if (Array.isArray(media)) {
    media.forEach((item) => {
      if (isRecord(item)) {
        candidates.push(
          ...extractStringValues(
            item.gateway ??
              item.raw ??
              item.thumbnail ??
              item.preview ??
              item.url ??
              item.image
          )
        );
      } else {
        candidates.push(...extractStringValues(item));
      }
    });
  } else if (isRecord(media)) {
    candidates.push(
      ...extractStringValues(
        media.gateway ??
          media.raw ??
          media.thumbnail ??
          media.preview ??
          media.url ??
          media.image
      )
    );
  }

  const metadata = isRecord(entry.metadata) ? entry.metadata : null;
  if (metadata) {
    candidates.push(...extractImageCandidates(metadata, depth + 1));
  }

  const resolved = isRecord(entry.resolved) ? entry.resolved : null;
  if (resolved) {
    candidates.push(...extractImageCandidates(resolved, depth + 1));
  }

  return expandGatewayCandidates(candidates);
}

function buildOpenSeaCollectionUrl(
  contractAddress?: string,
  chainId?: number
): string | undefined {
  if (!contractAddress) {
    return undefined;
  }
  const chainSlug = chainId === 8453 ? "base" : "ethereum";
  return `https://opensea.io/assets/${chainSlug}/${contractAddress}`;
}

function extractReferenceEntries(metadata: Record<string, unknown> | null) {
  if (!metadata) {
    return [];
  }

  const entries: Record<string, unknown>[] = [];

  const sources: Record<string, unknown>[] = [metadata];
  if (isRecord(metadata.properties)) {
    sources.push(metadata.properties as Record<string, unknown>);
  }

  sources.forEach((source) => {
    entries.push(...ensureRecordArray(source.references));

    if (isRecord(source.provenance)) {
      const provenance = source.provenance as Record<string, unknown>;
      entries.push(...ensureRecordArray(provenance.nfts));
      entries.push(...ensureRecordArray(provenance.refsFaces));
      entries.push(...ensureRecordArray(provenance.refs_faces));
      entries.push(...ensureRecordArray(provenance.refs));
      entries.push(...ensureRecordArray(provenance.refsCanonical));
      entries.push(...ensureRecordArray(provenance.refs_canonical));
    }
  });

  return entries;
}

function normalizeReferenceEntry(
  entry: Record<string, unknown>
): TokenReferenceFace | null {
  const metadataCandidate = isRecord(entry.metadata) ? entry.metadata : null;
  const tokenIdRaw =
    pickTokenIdValue(entry) ?? (metadataCandidate ? pickTokenIdValue(metadataCandidate) : null);
  const normalizedId = normalizeTokenId(tokenIdRaw);
  if (!normalizedId) {
    return null;
  }

  const contractAddress = pickString(
    entry.contractAddress as string | undefined,
    entry.contract_address as string | undefined,
    entry.address as string | undefined,
    metadataCandidate?.contractAddress as string | undefined,
    metadataCandidate?.contract_address as string | undefined,
    metadataCandidate?.address as string | undefined
  );

  const chainId = parseChainId(entry.chainId ?? metadataCandidate?.chainId);
  const imageCandidates = extractImageCandidates(entry);
  const floorEth = pickNumber(
    entry.collectionFloorEth ?? entry.collection_floor_eth
  );
  const floorRetrievedAt = formatSnapshotDate(
    pickString(
      entry.collectionFloorRetrievedAt as string | undefined,
      entry.collection_floor_retrieved_at as string | undefined
    )
  );

  return {
    tokenId: normalizedId,
    contractAddress,
    chainId,
    image: imageCandidates[0] ?? null,
    imageCandidates,
    floorEth,
    floorRetrievedAt,
  };
}

function buildReferenceFaces(
  rawMetadata: Record<string, unknown> | null,
  resolvedMetadata: Record<string, unknown> | null
): TokenReferenceFace[] {
  const entries = [
    ...extractReferenceEntries(rawMetadata),
    ...extractReferenceEntries(resolvedMetadata),
  ];

  const merged: TokenReferenceFace[] = [];
  const indexByKey = new Map<string, number>();

  entries.forEach((entry) => {
    const normalized = normalizeReferenceEntry(entry);
    if (!normalized) {
      return;
    }

    const key = `${normalized.contractAddress ?? "unknown"}:${normalized.tokenId}`;
    const existingIndex = indexByKey.get(key);
    if (existingIndex === undefined) {
      indexByKey.set(key, merged.length);
      merged.push(normalized);
      return;
    }

    const existing = merged[existingIndex];
    merged[existingIndex] = {
      ...existing,
      image: existing.image ?? normalized.image,
      imageCandidates:
        existing.imageCandidates.length > 0
          ? existing.imageCandidates
          : normalized.imageCandidates,
      floorEth: existing.floorEth ?? normalized.floorEth,
      floorRetrievedAt: existing.floorRetrievedAt ?? normalized.floorRetrievedAt,
      contractAddress: existing.contractAddress ?? normalized.contractAddress,
      chainId: existing.chainId ?? normalized.chainId,
    };
  });

  return merged;
}

function formatJson(value: Record<string, unknown> | null) {
  if (!value) {
    return "n/a";
  }
  try {
    return JSON.stringify(value, null, 2);
  } catch {
    return "n/a";
  }
}

export default async function TokenPage({ params }: { params: { id: string } }) {
  const baseUrl = getBaseUrl();
  const tokenId = params.id;

  const [tokenRes, provenanceRes] = await Promise.all([
    fetch(`${baseUrl}/api/token/${tokenId}`, { cache: "no-store" }),
    fetch(`${baseUrl}/api/token/${tokenId}/provenance`, { cache: "no-store" }),
  ]);

  if (!tokenRes.ok) {
    return (
      <main className="landing-page token-page">
        <section className="provenance-panel">
          <p className="panel-eyebrow">Token lookup</p>
          <h1 className="panel-title" title={tokenId}>
            Token {truncateMiddle(tokenId)}
          </h1>
          <p className="panel-body-text">
            Unable to load token metadata. Please verify the token id.
          </p>
          <div className="landing-ctas">
            <Link href={withBasePath("/landing")} className="landing-button secondary">
              Return to provenance cube
            </Link>
          </div>
        </section>
      </main>
    );
  }

  const token = (await tokenRes.json()) as TokenApiResponse;
  const provenance = provenanceRes.ok
    ? ((await provenanceRes.json()) as ProvenanceResponse)
    : null;

  const resolvedMedia = token.metadata?.media;
  const shortTokenId = truncateMiddle(token.tokenId);
  const displayTitleRaw =
    token.title ?? token.name ?? `Token ${token.tokenId}`;
  const displayTitle = displayTitleRaw.includes(token.tokenId)
    ? displayTitleRaw.replace(token.tokenId, shortTokenId)
    : displayTitleRaw;
  const referenceFaces = buildReferenceFaces(
    token.metadata?.raw ?? null,
    token.metadata?.resolved ?? null
  );

  return (
    <main className="landing-page token-page">
      <CollapsiblePanel
        eyebrow="Token overview"
        title={<CubixlesText text={displayTitle} />}
        subhead="Read-only provenance inspection."
        titleAs="h1"
        collapsible={false}
        actions={
          <Link href={withBasePath("/landing")} className="landing-button secondary">
            Return to provenance cube
          </Link>
        }
      >
        <div className="token-hero">
          <div className="token-media-frame">
            {resolvedMedia?.image ? (
              <img
                src={resolvedMedia.image}
                alt={`Token ${token.tokenId} preview`}
                loading="lazy"
              />
            ) : (
              <div className="token-media-placeholder">No resolved media</div>
            )}
            {resolvedMedia?.animation && (
              <a
                href={resolvedMedia.animation}
                target="_blank"
                rel="noreferrer"
                className="token-media-link"
              >
                View animation
              </a>
            )}
          </div>

          <div className="token-detail-list">
            <div className="token-detail-row">
              <span className="token-detail-label">Token ID</span>
              <span className="token-detail-value" title={token.tokenId}>
                {shortTokenId}
              </span>
            </div>
            <div className="token-detail-row">
              <span className="token-detail-label">Contract</span>
              <span className="token-detail-value">
                {truncateMiddle(token.contractAddress)}
              </span>
            </div>
            <div className="token-detail-row">
              <span className="token-detail-label">Network</span>
              <span className="token-detail-value">{token.network}</span>
            </div>
            <div className="token-detail-row">
              <span className="token-detail-label">Mint tx</span>
              <span className="token-detail-value">
                {token.mint?.transactionHash
                  ? truncateMiddle(token.mint.transactionHash)
                  : "n/a"}
              </span>
            </div>
            <div className="token-detail-row">
              <span className="token-detail-label">Minted at</span>
              <span className="token-detail-value">
                {token.mint?.timestamp ?? "n/a"}
              </span>
            </div>
            <div className="token-detail-row">
              <span className="token-detail-label">Minter</span>
              <span className="token-detail-value">
                {token.mint?.minterAddress
                  ? truncateMiddle(token.mint.minterAddress)
                  : "n/a"}
              </span>
            </div>
            <div className="token-detail-row">
              <span className="token-detail-label">Metadata URL</span>
              <span className="token-detail-value">
                {token.tokenUri?.raw ?? "n/a"}
              </span>
            </div>
          </div>
        </div>
      </CollapsiblePanel>

      <CollapsiblePanel
        eyebrow="Provenance faces"
        title="Selected NFT references"
        subhead="Thumbnails captured in the mint metadata snapshot."
      >
        {referenceFaces.length ? (
          <div className="token-reference-grid">
            {referenceFaces.map((face) => {
              const openSeaUrl = buildOpenSeaCollectionUrl(
                face.contractAddress,
                face.chainId
              );
              return (
                <article
                  key={`${face.contractAddress ?? "unknown"}-${face.tokenId}`}
                  className="token-reference-card"
                >
                  <div className="token-reference-image-frame">
                    <FallbackImage
                      candidates={
                        face.imageCandidates.length
                          ? face.imageCandidates
                          : face.image
                            ? [face.image]
                            : []
                      }
                      alt={`Reference token ${face.tokenId}`}
                      placeholderClassName="token-reference-placeholder"
                      placeholderLabel="No reference image"
                    />
                  </div>
                  <div className="token-reference-meta">
                    <span className="panel-face-label">Reference</span>
                    <span
                      className="token-reference-id"
                      title={face.tokenId}
                    >
                      Token {truncateMiddle(face.tokenId)}
                    </span>
                    {face.floorEth !== undefined ? (
                      <span className="token-reference-floor">
                        Floor {face.floorEth} ETH
                        {face.floorRetrievedAt ? ` · ${face.floorRetrievedAt}` : ""}
                      </span>
                    ) : (
                      <span className="token-reference-floor">Floor n/a</span>
                    )}
                  </div>
                  <div className="token-reference-links">
                    {openSeaUrl && (
                      <a
                        href={openSeaUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="mint-audit-reference"
                      >
                        OpenSea collection
                      </a>
                    )}
                  </div>
                </article>
              );
            })}
          </div>
        ) : (
          <p className="panel-body-text">
            No reference faces found in metadata.
          </p>
        )}
      </CollapsiblePanel>

      <CollapsiblePanel
        eyebrow="Metadata"
        title="Resolved metadata snapshot"
        subhead={
          token.metadata.validation.hasMedia
            ? "Media detected in metadata."
            : "Metadata missing media fields."
        }
      >
        <div className="token-metadata-grid">
          <div>
            <p className="token-section-label">Resolved JSON</p>
            <pre className="token-json">{formatJson(token.metadata.resolved)}</pre>
          </div>
          <div>
            <p className="token-section-label">Raw JSON</p>
            <pre className="token-json">{formatJson(token.metadata.raw)}</pre>
          </div>
        </div>
      </CollapsiblePanel>

      <CollapsiblePanel
        eyebrow="Provenance candidates"
        title="Heuristic relationships"
        subhead={
          provenance?.disclaimer ??
          "Candidates are inferred from metadata, transaction context, and owner overlap."
        }
        actions={
          provenance ? (
            <div className="token-provenance-stats">
              <span>Metadata refs: {provenance.metadataReferenceCount}</span>
              <span>Same tx: {provenance.sameTransactionCount}</span>
              <span>Owner overlap: {provenance.ownerOverlapCount}</span>
            </div>
          ) : null
        }
      >
        {provenance && provenance.candidates.length > 0 ? (
          <div className="token-provenance-grid">
            {provenance.candidates.map((candidate) => (
              <article key={candidate.tokenId} className="token-provenance-card">
                <div className="token-provenance-header">
                  <div>
                    <p className="token-section-label">Token</p>
                    <p className="token-provenance-id" title={candidate.tokenId}>
                      {truncateMiddle(candidate.tokenId)}
                    </p>
                  </div>
                  <span className={`token-pill ${candidate.confidence}`}>
                    {candidate.confidence}
                  </span>
                </div>
                <p className="token-provenance-source">Source: {candidate.source}</p>

                {candidate.evidence.explicitMetadataReference?.length ? (
                  <div className="token-evidence">
                    <strong>Metadata references</strong>
                    <ul className="token-evidence-list">
                      {candidate.evidence.explicitMetadataReference.map((ref, index) => (
                        <li key={`${candidate.tokenId}-meta-${index}`}>
                          <span title={ref.fieldPath}>{ref.fieldPath}</span>
                          <span title={ref.value}>{truncateLongValue(ref.value)}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                ) : null}

                {candidate.evidence.sameTransaction ? (
                  <div className="token-evidence">
                    <strong>Same transaction</strong>
                    <p>{truncateMiddle(candidate.evidence.sameTransaction.txHash)}</p>
                    <p>
                      Mints: {candidate.evidence.sameTransaction.mintedTokenIds
                        .map((id) => truncateMiddle(id))
                        .join(", ")}
                    </p>
                  </div>
                ) : null}

                {candidate.evidence.ownerOverlap ? (
                  <div className="token-evidence">
                    <strong>Owner overlap</strong>
                    <p>
                      {candidate.evidence.ownerOverlap.overlapCount} shared owners
                    </p>
                    <p>
                      {candidate.evidence.ownerOverlap.overlapOwners
                        .map((owner) => truncateMiddle(owner))
                        .join(", ")}
                    </p>
                  </div>
                ) : null}
              </article>
            ))}
          </div>
        ) : (
          <p className="panel-body-text">
            No provenance candidates detected yet.
          </p>
        )}
      </CollapsiblePanel>

      <TokenVerifyPanel tokenId={token.tokenId} />

      <CollapsiblePanel
        eyebrow="Collector unlock"
        title="Owner-only experience"
        subhead="Reserved for token-gated easter eggs."
      >
        <p className="panel-body-text">
          When ownership checks are enabled, this panel will unlock a private experience
          for holders of this token.
        </p>
      </CollapsiblePanel>
    </main>
  );
}
