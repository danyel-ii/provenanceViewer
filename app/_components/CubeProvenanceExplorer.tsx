import type { MintedCube } from "../_data/minted-cube";

type CubeProvenanceExplorerProps = {
  cube: MintedCube;
  requestedTokenId: string;
};

export default function CubeProvenanceExplorer({
  cube,
  requestedTokenId,
}: CubeProvenanceExplorerProps) {
  const isMismatch = cube.tokenId !== requestedTokenId;

  return (
    <section className="minted-cube-panel">
      <div className="minted-cube-panel-heading">
        <div>
          <p className="panel-eyebrow">Minted cube inspector</p>
          <h2 className="panel-title">Investigating cubixles_ #{cube.tokenId}</h2>
          <p className="panel-subhead">{cube.description}</p>
          {isMismatch && (
            <p className="panel-note">
              Showing the verified cube for {cube.tokenId} because that is the
              actual token minted at this position in the series.
            </p>
          )}
        </div>
        <div className="minted-cube-meta">
          <span>Minted {cube.mintedAt}</span>
          <span>{cube.network}</span>
          <span>{cube.mintedBy}</span>
        </div>
      </div>

      <div className="minted-cube-links">
        {cube.tokenViewUrl && (
          <a
            href={cube.tokenViewUrl}
            target="_blank"
            rel="noreferrer"
            className="landing-button primary"
          >
            Open mint gallery
          </a>
        )}
        {cube.references.map((reference) => (
          <a
            key={reference.url}
            href={reference.url}
            target="_blank"
            rel="noreferrer"
            className="landing-button tertiary"
          >
            {reference.label}
          </a>
        ))}
      </div>

      <div className="provenance-explorer-heading">
        <p className="panel-eyebrow">Provenance NFTs</p>
        <p className="panel-subhead">{cube.provenanceNote}</p>
      </div>

      <div className="provenance-grid">
        {cube.provenanceNFTs.map((nft) => (
          <article key={`${cube.tokenId}-${nft.faceId}`} className="provenance-card">
            <div className="provenance-card-header">
              <span className="panel-face-label">Face {nft.faceId}</span>
              <span className="panel-ref-title">{nft.title}</span>
            </div>
            <p className="provenance-card-description">{nft.description}</p>
            <div className="provenance-card-meta">
              <span>{nft.collection}</span>
              <span>Token {nft.tokenId}</span>
            </div>
            <p className="panel-note">{nft.ownerNote}</p>
            <div className="provenance-card-links">
              <a
                href={nft.explorerUrl}
                target="_blank"
                rel="noreferrer"
                className="mint-audit-reference"
              >
                View on-chain
              </a>
              {nft.metadataUrl && (
                <a
                  href={nft.metadataUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="mint-audit-reference"
                >
                  Metadata snapshot
                </a>
              )}
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
