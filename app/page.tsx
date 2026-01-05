import LandingExperience from "./landing/LandingExperience";

const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000";

export const metadata = {
  title: "cubixles_ — Provenance as Composition",
  description:
    "Provenance here is not who owned what — it’s what made what possible.",
  metadataBase: new URL(baseUrl),
  openGraph: {
    title: "cubixles_ — Provenance as Composition",
    description:
      "cubixles_ mints ERC-721s pairing palette thumbnails with a live cube viewer that insists on compositional provenance.",
    url: "/",
    images: [
      {
        url: "/ogImage.png",
        width: 1200,
        height: 630,
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "cubixles_ — Provenance as Composition",
    description:
      "cubixles_ mints ERC-721s pairing palette thumbnails with a live cube viewer that insists on compositional provenance.",
    images: ["/ogImage.png"],
  },
};

export default function HomePage() {
  return <LandingExperience />;
}
