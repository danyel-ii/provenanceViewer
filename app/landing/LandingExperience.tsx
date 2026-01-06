import Link from "next/link";
import TokenIndexPanel from "../_components/TokenIndexPanel";
import { getAllMintedCubes } from "../_data/minted-cube";

function truncateMiddle(value: string, start = 6, end = 4) {
  if (value.length <= start + end + 3) {
    return value;
  }
  return `${value.slice(0, start)}...${value.slice(-end)}`;
}

export default function LandingExperience() {
  const mintedCubes = getAllMintedCubes();
  const featuredCube = mintedCubes[0];
  const featuredTokenId = featuredCube?.tokenId ?? "1";
  const featuredTokenLabel = truncateMiddle(featuredTokenId);

  return (
    <main className="landing-page">
      <section className="landing-intro">
        <p className="panel-eyebrow">Cubixles_ provenance viewer</p>
        <h1 className="landing-title">cubixles_ provenance viewer</h1>
        <p className="landing-subhead">Read-only inspection for ERC-721 provenance.</p>
        <p className="landing-body">
          Explore minted cubes, drill into token metadata, and review provenance candidates.
          The viewer never connects a wallet and never writes on-chain.
        </p>
        <div className="landing-ctas">
          <Link href="/m/1" className="landing-button primary">
            Open /m/1
          </Link>
          <Link
            href={`/token/${featuredTokenId}`}
            className="landing-button secondary"
          >
            Inspect token {featuredTokenLabel}
          </Link>
          <Link href="#token-list" className="landing-button tertiary">
            Browse token list
          </Link>
        </div>
      </section>

      <section className="landing-entry-grid">
        <article className="provenance-panel landing-entry-card">
          <p className="panel-eyebrow">Entry 01</p>
          <h2 className="panel-title">Inspect a minted cube</h2>
          <p className="landing-entry-route">Route: /m/:tokenId (alias /m/1)</p>
          <p className="landing-entry-copy">
            The cube view shows resolved media, the six reference faces, and the provenance
            narrative captured at mint time.
          </p>
          <div className="landing-ctas">
            <Link href="/m/1" className="landing-button secondary">
              Open example cube
            </Link>
            {featuredCube?.tokenViewUrl && (
              <a
                href={featuredCube.tokenViewUrl}
                target="_blank"
                rel="noreferrer"
                className="landing-button tertiary"
              >
                Open mint gallery
              </a>
            )}
          </div>
        </article>

        <article className="provenance-panel landing-entry-card">
          <p className="panel-eyebrow">Entry 02</p>
          <h2 className="panel-title">Inspect a specific token</h2>
          <p className="landing-entry-route">Route: /token/:id</p>
          <p className="landing-entry-copy">
            Token pages include resolved metadata, provenance candidates, and a server-side
            read-only contract check.
          </p>
          <div className="landing-ctas">
            <Link
              href={`/token/${featuredTokenId}`}
              className="landing-button secondary"
            >
              Inspect token {featuredTokenLabel}
            </Link>
            <Link href="#token-list" className="landing-button tertiary">
              Find a token id
            </Link>
          </div>
        </article>

        <article className="provenance-panel landing-entry-card">
          <p className="panel-eyebrow">Entry 03</p>
          <h2 className="panel-title">Browse the collection index</h2>
          <p className="landing-entry-route">Route: /api/poc/tokens</p>
          <p className="landing-entry-copy">
            Use the live index to page through the collection and jump into any token detail
            view.
          </p>
          <div className="landing-ctas">
            <Link href="#token-list" className="landing-button secondary">
              Jump to list
            </Link>
            <Link
              href="/api/poc/tokens?limit=8"
              className="landing-button tertiary"
            >
              Open API sample
            </Link>
          </div>
        </article>
      </section>

      <section id="token-list" className="landing-token-list">
        <TokenIndexPanel />
      </section>
    </main>
  );
}
