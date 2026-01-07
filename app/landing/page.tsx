import LandingExperience from "./LandingExperience";

const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000";
const basePath =
  process.env.NEXT_PUBLIC_BASE_PATH && process.env.NEXT_PUBLIC_BASE_PATH !== "/"
    ? process.env.NEXT_PUBLIC_BASE_PATH.replace(/\/$/, "")
    : "";

export const metadata = {
  title: "cubixles_ — Provenance as building blocks",
  description:
    "Provenance as building blocks, NFTs as materials, and citations as structure.",
  metadataBase: new URL(`${baseUrl}${basePath}`),
  openGraph: {
    title: "cubixles_ — Provenance as building blocks",
    description:
      "Provenance as building blocks, NFTs as materials, and citations as structure.",
    url: `${basePath}/landing`,
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

export default function LandingPage() {
  return <LandingExperience />;
}
