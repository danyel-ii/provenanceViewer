import Link from "next/link";
import LandingCubeIcon from "../_components/LandingCubeIcon";
import CubixlesLogo from "../_components/CubixlesLogo";
import NotesFlockOverlay from "../_components/NotesFlockOverlay";
import TokenIndexPanel from "../_components/TokenIndexPanel";

export default function LandingExperience() {
  return (
    <main className="landing-page landing-home">
      <NotesFlockOverlay />
      <section className="landing-header">
        <div className="landing-intro">
          <h1 className="landing-title">
            <CubixlesLogo />
          </h1>
          <p className="landing-subhead">
            Provenance as building blocks, NFTs as materials, and citations as
            structure.
          </p>
          <div className="landing-ctas">
            <Link href="#token-list" className="landing-button primary">
              Browse token list
            </Link>
            <a
              href="https://www.cubixles.xyz"
              className="landing-button platinum"
              target="_blank"
              rel="noreferrer"
            >
              Mint your own
            </a>
          </div>
        </div>
        <LandingCubeIcon />
      </section>

      <section id="token-list" className="landing-token-list">
        <TokenIndexPanel />
      </section>
    </main>
  );
}
