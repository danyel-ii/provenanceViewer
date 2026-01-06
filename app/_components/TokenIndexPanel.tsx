"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";

type TokenListItem = {
  tokenId: string;
  title?: string;
  name?: string;
  description?: string;
  mint?: {
    timestamp?: string;
    transactionHash?: string;
  } | null;
};

type TokenListResponse = {
  tokens: TokenListItem[];
  pageKey?: string | null;
  pages?: number;
  truncated?: boolean;
  count: number;
};

type TokenListMode = "page" | "all";

const PAGE_SIZE = 8;
const MAX_PAGES = 25;

function truncateMiddle(value: string, start = 6, end = 4) {
  if (value.length <= start + end + 3) {
    return value;
  }
  return `${value.slice(0, start)}...${value.slice(-end)}`;
}

function formatTimestamp(value?: string) {
  if (!value) {
    return "n/a";
  }
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return value;
  }
  return parsed.toISOString().split("T")[0] ?? value;
}

export default function TokenIndexPanel() {
  const [mode, setMode] = useState<TokenListMode>("page");
  const [tokens, setTokens] = useState<TokenListItem[]>([]);
  const [pageKey, setPageKey] = useState<string | null>(null);
  const [pages, setPages] = useState(1);
  const [truncated, setTruncated] = useState(false);
  const [status, setStatus] = useState<"idle" | "loading" | "error">("idle");
  const [error, setError] = useState<string | null>(null);

  const isAllMode = mode === "all";
  const hasMore = Boolean(pageKey);

  const loadTokens = useCallback(
    async ({
      reset,
      nextPageKey,
    }: {
      reset: boolean;
      nextPageKey?: string | null;
    }) => {
      setStatus("loading");
      setError(null);

      try {
        const params = new URLSearchParams();
        params.set("limit", String(PAGE_SIZE));

        if (mode === "all") {
          params.set("all", "true");
          params.set("maxPages", String(MAX_PAGES));
        } else if (nextPageKey) {
          params.set("pageKey", nextPageKey);
        }

        const response = await fetch(`/api/poc/tokens?${params.toString()}`, {
          cache: "no-store",
        });
        const data = (await response.json()) as TokenListResponse & {
          error?: string;
        };

        if (!response.ok) {
          throw new Error(data.error ?? "token_list_failed");
        }

        const incoming = Array.isArray(data.tokens) ? data.tokens : [];

        if (mode === "all" || reset) {
          setTokens(incoming);
        } else {
          setTokens((prev) => {
            const seen = new Set(prev.map((token) => token.tokenId));
            const merged = [...prev];
            incoming.forEach((token) => {
              if (!seen.has(token.tokenId)) {
                merged.push(token);
              }
            });
            return merged;
          });
        }

        setPageKey(data.pageKey ?? null);
        setPages(data.pages ?? 1);
        setTruncated(Boolean(data.truncated));
        setStatus("idle");
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        setStatus("error");
        setError(message);
      }
    },
    [mode]
  );

  useEffect(() => {
    loadTokens({ reset: true, nextPageKey: null });
  }, [loadTokens]);

  const handleLoadMore = () => {
    if (status === "loading" || !pageKey || isAllMode) {
      return;
    }
    loadTokens({ reset: false, nextPageKey: pageKey });
  };

  const handleToggleMode = () => {
    setMode((prev) => (prev === "all" ? "page" : "all"));
  };

  const handleRefresh = () => {
    loadTokens({ reset: true, nextPageKey: null });
  };

  const statusLabel = useMemo(() => {
    if (status === "loading") {
      return "Loading collection tokens...";
    }
    if (isAllMode) {
      return truncated
        ? `Loaded ${tokens.length} tokens across ${pages} pages (truncated).`
        : `Loaded ${tokens.length} tokens across ${pages} pages.`;
    }
    if (!tokens.length) {
      return "No tokens loaded yet.";
    }
    return hasMore
      ? `Loaded ${tokens.length} tokens. More pages available.`
      : `Loaded ${tokens.length} tokens. End of list.`;
  }, [status, isAllMode, truncated, pages, tokens.length, hasMore]);

  return (
    <section className="provenance-panel token-index-panel">
      <div className="panel-header">
        <div>
          <p className="panel-eyebrow">Live index</p>
          <h2 className="panel-title">Chain token list</h2>
          <p className="panel-subhead">
            Quick inspection list pulled from the collection API. Use pagination
            or pull the full set.
          </p>
        </div>
        <div className="token-index-actions">
          <button
            type="button"
            className="landing-button secondary"
            onClick={handleToggleMode}
            disabled={status === "loading"}
          >
            {isAllMode ? "Use pagination" : `Load all (max ${MAX_PAGES} pages)`}
          </button>
          {!isAllMode && (
            <button
              type="button"
              className="landing-button primary"
              onClick={handleLoadMore}
              disabled={!hasMore || status === "loading"}
            >
              {hasMore ? "Load more" : "End of list"}
            </button>
          )}
          <button
            type="button"
            className="landing-button tertiary"
            onClick={handleRefresh}
            disabled={status === "loading"}
          >
            Refresh
          </button>
        </div>
      </div>

      <p className="token-index-status">{statusLabel}</p>
      {error && <p className="token-index-error">Error: {error}</p>}

      <div className="token-index-grid">
        {tokens.map((token) => {
          const displayTitle =
            token.title ?? token.name ?? `Token ${token.tokenId}`;
          return (
            <article key={token.tokenId} className="token-index-card">
              <div className="token-index-card-head">
                <span className="panel-face-label">Token</span>
                <span className="token-index-id">
                  {truncateMiddle(token.tokenId)}
                </span>
              </div>
              <p className="token-index-title">{displayTitle}</p>
              {token.description && (
                <p className="token-index-copy">{token.description}</p>
              )}
              <div className="token-index-meta">
                <span>Minted {formatTimestamp(token.mint?.timestamp)}</span>
                <span>
                  Tx {token.mint?.transactionHash ? "available" : "n/a"}
                </span>
              </div>
              <div className="token-index-links">
                <Link
                  href={`/token/${token.tokenId}`}
                  className="landing-button secondary"
                >
                  Inspect token
                </Link>
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
}
