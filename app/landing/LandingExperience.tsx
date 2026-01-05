"use client";

import Link from "next/link";
import { useCallback, useMemo, useState } from "react";
import LandingHero from "../_components/LandingHero";
import MintAuditPanel from "../_components/MintAuditPanel";
import ProvenancePanel from "../_components/ProvenancePanel";
import {
  CANONICAL_FACE_ORDER,
  CANONICAL_OWNERSHIP_HISTORY,
  CANONICAL_OWNERSHIP_NOTE,
  FACE_REGISTRY,
  FaceDefinition,
} from "../_data/landing-provenance";
import { getAllMintedCubes } from "../_data/minted-cube";

type ProvenanceMode = "compositional" | "custody";

export default function LandingExperience() {
  const [activeFaceId, setActiveFaceId] = useState<FaceDefinition["id"]>(FACE_REGISTRY[0].id);
  const [mode, setMode] = useState<ProvenanceMode>("compositional");
  const mintedCubes = useMemo(() => getAllMintedCubes(), []);

  const handleFaceChange = useCallback((faceId: FaceDefinition["id"]) => {
    setActiveFaceId(faceId);
  }, []);

  const toggleMode = useCallback(() => {
    setMode((prev) => (prev === "compositional" ? "custody" : "compositional"));
  }, []);

  const activeFace =
    FACE_REGISTRY.find((face) => face.id === activeFaceId) ?? FACE_REGISTRY[0];

  const visualFaces = useMemo(() => {
    const startIndex = FACE_REGISTRY.findIndex((face) => face.id === activeFaceId);
    if (startIndex === -1) {
      return FACE_REGISTRY;
    }
    return [
      ...FACE_REGISTRY.slice(startIndex),
      ...FACE_REGISTRY.slice(0, startIndex),
    ];
  }, [activeFaceId]);

  const canonicalFaces = useMemo(
    () =>
      CANONICAL_FACE_ORDER.map((id) => FACE_REGISTRY.find((face) => face.id === id)).filter(
        (face): face is FaceDefinition => Boolean(face)
      ),
    []
  );

  return (
    <main className="landing-page">
      <LandingHero onFaceChange={handleFaceChange} />
      <section className="landing-vision">
        <div>
          <p className="panel-eyebrow">Purpose</p>
          <h2 className="landing-section-title">Cubixles_ is provenance as material.</h2>
          <p className="landing-section-copy">
            Every cube pairs six NFTs you already own with a live viewer that refuses to flatten
            their stories. References, palettes, and hashes stay visible so curators can trace
            each selection back to the wallets, networks, and citations that inspired them.
          </p>
        </div>
        <div className="landing-vision-meta">
          <span>Network: Ethereum mainnet (ERC-721)</span>
          <span>Authority: compositional provenance, not just custody</span>
          <span>Price mechanic: dynamic mint cost (base 0.0015 ETH, resale 5%)</span>
        </div>
      </section>
      <section className="landing-mint-gallery">
        <div className="landing-mint-gallery-heading">
          <div>
            <p className="panel-eyebrow">Minting registry</p>
            <h3 className="landing-section-title">Inspect any cubixles_</h3>
            <p className="landing-section-copy">
              Every minted cube publishes the citations that contributed to its faces. Start with
              the canonical cubixles_ #6885… token view, or jump straight to alias routes like /m/1.
            </p>
          </div>
        </div>
        <div className="landing-mint-gallery-list">
          {mintedCubes.map((cube) => (
            <article key={cube.tokenId} className="mint-gallery-card">
              <div className="mint-gallery-card-head">
                <span className="panel-face-label">Token</span>
                <h4 className="panel-ref-title">{cube.tokenId}</h4>
              </div>
              <p className="mint-gallery-card-network">{cube.network}</p>
              <p className="mint-gallery-card-copy">{cube.description}</p>
              <div className="mint-gallery-card-meta">
                <span>Minted {cube.mintedAt}</span>
                <span>{cube.mintedBy}</span>
              </div>
              <div className="mint-gallery-card-actions">
                <Link
                  href={`/m/${cube.tokenId}`}
                  className="landing-button secondary"
                >
                  Inspect token
                </Link>
                <a
                  className="landing-button tertiary"
                  href={cube.tokenViewUrl}
                  target="_blank"
                  rel="noreferrer"
                >
                  Open mint view
                </a>
              </div>
            </article>
          ))}
        </div>
      </section>
      <ProvenancePanel
        mode={mode}
        onModeToggle={toggleMode}
        activeFace={activeFace}
        visualFaces={visualFaces}
        canonicalFaces={canonicalFaces}
        ownershipHistory={CANONICAL_OWNERSHIP_HISTORY}
        ownershipNote={CANONICAL_OWNERSHIP_NOTE}
      />
      <MintAuditPanel />
    </main>
  );
}
