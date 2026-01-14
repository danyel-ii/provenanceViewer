import Link from "next/link";

import { verifyEasterAccessToken } from "../../../_lib/easterAuth";

export const dynamic = "force-dynamic";

type SearchParams = Record<string, string | string[] | undefined>;

function parseAccessToken(value: SearchParams["access"]): string | null {
  if (typeof value === "string") {
    return value;
  }
  if (Array.isArray(value)) {
    return value[0] ?? null;
  }
  return null;
}

export default function EasterEggPage({
  params,
  searchParams,
}: {
  params: { id: string };
  searchParams?: SearchParams;
}) {
  const accessToken = parseAccessToken(searchParams?.access);
  const verification = verifyEasterAccessToken(accessToken, params.id);
  const isAllowed = verification.valid && verification.payload;
  const chainId =
    verification.payload?.chainId ??
    (typeof searchParams?.chainId === "string"
      ? Number.parseInt(searchParams.chainId, 10)
      : undefined);
  const chainQuery =
    typeof chainId === "number" && Number.isFinite(chainId)
      ? `?chainId=${chainId}`
      : "";

  if (!isAllowed) {
    return (
      <main className="landing-page token-page">
        <section className="provenance-panel">
          <p className="panel-eyebrow">Collector unlock</p>
          <h1 className="panel-title">Not owner</h1>
          <p className="panel-body-text">
            This easter egg is reserved for the current holder of this token.
          </p>
          <div className="landing-ctas">
            <Link
              href={`/token/${params.id}${chainQuery}`}
              className="landing-button secondary"
            >
              Return to token
            </Link>
          </div>
        </section>
      </main>
    );
  }

  return (
    <main className="landing-page token-page">
      <section className="provenance-panel">
        <p className="panel-eyebrow">Collector unlock</p>
        <h1 className="panel-title">Easter Egg Unlocked</h1>
        <p className="panel-body-text">
          You have verified ownership for token {verification.payload.tokenId}.
          This space is reserved for the gated experience.
        </p>
        <div className="landing-ctas">
          <Link
            href={`/token/${params.id}${chainQuery}`}
            className="landing-button secondary"
          >
            Return to token
          </Link>
        </div>
      </section>
    </main>
  );
}
