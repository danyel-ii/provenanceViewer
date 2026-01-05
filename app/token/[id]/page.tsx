import Link from "next/link";
import { headers } from "next/headers";

import TokenVerifyPanel from "../../_components/TokenVerifyPanel";

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

function getBaseUrl() {
  const envUrl = process.env.NEXT_PUBLIC_BASE_URL;
  if (envUrl) {
    return envUrl;
  }
  const headerList = headers();
  const host = headerList.get("x-forwarded-host") ?? headerList.get("host");
  const proto = headerList.get("x-forwarded-proto") ?? "http";
  return host ? `${proto}://${host}` : "http://localhost:3000";
}

function truncateMiddle(value: string, start = 6, end = 4) {
  if (value.length <= start + end + 3) {
    return value;
  }
  return `${value.slice(0, start)}...${value.slice(-end)}`;
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
          <h1 className="panel-title">Token {tokenId}</h1>
          <p className="panel-body-text">
            Unable to load token metadata. Please verify the token id.
          </p>
          <div className="landing-ctas">
            <Link href="/landing" className="landing-button secondary">
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
  const displayTitle = token.title ?? token.name ?? `Token ${token.tokenId}`;

  return (
    <main className="landing-page token-page">
      <section className="provenance-panel">
        <div className="panel-header">
          <div>
            <p className="panel-eyebrow">Token overview</p>
            <h1 className="panel-title">{displayTitle}</h1>
            <p className="panel-subhead">Read-only provenance inspection.</p>
          </div>
          <div className="landing-ctas">
            <Link href="/landing" className="landing-button secondary">
              Return to provenance cube
            </Link>
          </div>
        </div>

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
              <span className="token-detail-value">{token.tokenId}</span>
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
      </section>

      <section className="provenance-panel">
        <div className="panel-header">
          <div>
            <p className="panel-eyebrow">Metadata</p>
            <h2 className="panel-title">Resolved metadata snapshot</h2>
            <p className="panel-subhead">
              {token.metadata.validation.hasMedia
                ? "Media detected in metadata."
                : "Metadata missing media fields."}
            </p>
          </div>
        </div>

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
      </section>

      <section className="provenance-panel">
        <div className="panel-header">
          <div>
            <p className="panel-eyebrow">Provenance candidates</p>
            <h2 className="panel-title">Heuristic relationships</h2>
            <p className="panel-subhead">
              {provenance?.disclaimer ??
                "Candidates are inferred from metadata, transaction context, and owner overlap."}
            </p>
          </div>
          {provenance && (
            <div className="token-provenance-stats">
              <span>Metadata refs: {provenance.metadataReferenceCount}</span>
              <span>Same tx: {provenance.sameTransactionCount}</span>
              <span>Owner overlap: {provenance.ownerOverlapCount}</span>
            </div>
          )}
        </div>

        {provenance && provenance.candidates.length > 0 ? (
          <div className="token-provenance-grid">
            {provenance.candidates.map((candidate) => (
              <article key={candidate.tokenId} className="token-provenance-card">
                <div className="token-provenance-header">
                  <div>
                    <p className="token-section-label">Token</p>
                    <p className="token-provenance-id">{candidate.tokenId}</p>
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
                          <span>{ref.fieldPath}</span>
                          <span>{ref.value}</span>
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
                      Mints: {candidate.evidence.sameTransaction.mintedTokenIds.join(", ")}
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
      </section>

      <TokenVerifyPanel tokenId={token.tokenId} />
    </main>
  );
}
