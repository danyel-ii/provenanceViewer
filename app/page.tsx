import LandingExperience from "./landing/LandingExperience";

const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000";

export const metadata = {
  title: "cubixles_ — Provenance as building blocks",
  description:
    "Provenance as building blocks, NFTs as materials, and citations as structure.",
  metadataBase: new URL(baseUrl),
  openGraph: {
    title: "cubixles_ — Provenance as building blocks",
    description:
      "Provenance as building blocks, NFTs as materials, and citations as structure.",
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
    title: "cubixles_ — Provenance as building blocks",
    description:
      "Provenance as building blocks, NFTs as materials, and citations as structure.",
    images: ["/ogImage.png"],
  },
};

export default function HomePage() {
  return <LandingExperience />;
}
