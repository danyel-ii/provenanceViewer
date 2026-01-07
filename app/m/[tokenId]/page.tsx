import Link from "next/link";

import CubeProvenanceExplorer from "../../_components/CubeProvenanceExplorer";
import MintAuditPanel from "../../_components/MintAuditPanel";
import { getLiveMintedCube } from "../../_lib/mintedCubeService";
import { withBasePath } from "../../_lib/basePath";
import { CUBIXLES_MINTED_CUBES } from "../../_data/minted-cube";
import { MINT_AUDIT } from "../../_data/mint-audit";

const fallbackCube = CUBIXLES_MINTED_CUBES[MINT_AUDIT.tokenId];

export async function generateMetadata({
  params,
}: {
  params: { tokenId: string };
}) {
  const cube = (await getLiveMintedCube(params.tokenId)) ?? fallbackCube;

  const canonicalUrl = cube.tokenViewUrl
    ? cube.tokenViewUrl
    : `https://www.cubixles.xyz/m/${cube.tokenId}`;

  return {
    title: `cubixles_ — Token ${cube.tokenId} audit`,
    description: cube.description,
    openGraph: {
      title: `cubixles_ — Token ${cube.tokenId} audit`,
      description: cube.description,
      url: canonicalUrl,
      images: [
        {
          url: withBasePath("/ogImage.png"),
          width: 1200,
          height: 630,
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title: `cubixles_ — Token ${cube.tokenId} audit`,
      description: cube.description,
      images: [withBasePath("/ogImage.png")],
    },
    metadataBase: new URL(process.env.NEXT_PUBLIC_BASE_URL ?? "http://localhost:3000"),
  };
}

export default async function TokenPlaceholder({
  params,
}: {
  params: { tokenId: string };
}) {
  const cube = (await getLiveMintedCube(params.tokenId)) ?? fallbackCube;

  return (
    <main className="landing-page">
      <MintAuditPanel focusTokenId={params.tokenId} />
      <CubeProvenanceExplorer cube={cube} requestedTokenId={params.tokenId} />
      <div className="landing-ctas token-landing-ctas">
        <Link href={withBasePath("/landing")} className="landing-button secondary">
          Return to provenance cube
        </Link>
      </div>
    </main>
  );
}
